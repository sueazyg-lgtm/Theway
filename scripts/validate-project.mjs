import { existsSync,readFileSync } from 'node:fs'
import { dirname,join,resolve } from 'node:path'
const root=resolve(process.cwd())
const readJson=file=>{try{return JSON.parse(readFileSync(file,'utf8'))}catch(error){throw new Error(`${file} 不是有效JSON：${error.message}`)}}
const app=readJson(join(root,'app.json')),project=readJson(join(root,'project.config.json'))
const failures=[]
if(project.compileType!=='miniprogram')failures.push('project.config.json compileType 必须是 miniprogram')
if(project.miniprogramRoot&&!['.','./'].includes(project.miniprogramRoot))failures.push('当前扁平目录不应指向其他 miniprogramRoot')
for(const page of app.pages||[]){
 for(const ext of ['.js','.json','.wxml','.wxss']){const file=join(root,page+ext);if(!existsSync(file))failures.push(`缺少页面文件：${page+ext}`);else if(ext==='.json')readJson(file)}
 const wxml=join(root,page+'.wxml');if(existsSync(wxml)){const text=readFileSync(wxml,'utf8');for(const expression of text.match(/\{\{[\s\S]*?\}\}/g)||[])if(/&(?:amp|lt|gt|quot);/.test(expression))failures.push(`${page}.wxml 表达式含HTML转义符：${expression}`)}
}
const scripts=[
 'app.js',
 'adapters/runtime.js',
 'adapters/page-helpers.js',
 'pages/index/index.js',
 'pages/share/index.js',
 'runtime/services/trip-service.js',
 'runtime/services/local-store.js',
 'runtime/services/share-view.js',
 'runtime/services/view-models.js',
 'runtime/services/error-messages.js',
]
for(const script of scripts)if(!existsSync(join(root,script)))failures.push(`缺少运行文件：${script}`)
for(const name of ['share-create','share-read','share-revoke'])for(const file of ['index.js','package.json']){const path=join(root,'cloudfunctions',name,file);if(!existsSync(path))failures.push(`缺少云函数文件：cloudfunctions/${name}/${file}`);else if(file.endsWith('.json'))readJson(path)}
if(failures.length){for(const failure of failures)console.error('ERROR',failure);process.exit(1)}
console.log(`项目结构验证通过：${app.pages.length} 个页面，${scripts.length} 个关键运行文件，3 个云函数。`)
