# 旅行规划微信小程序

原生微信小程序首发开发版。项目根目录是 `D:\这趟`，微信开发者工具应直接打开该目录。

## 本地开发

```powershell
npm ci
npm run build
npm test
npm run typecheck
npm run validate
```

修改 `domain/`、`services/` 或 `fixtures/` 下的 TypeScript 后必须运行 `npm run build`，生成 `runtime/` 中供微信加载的 CommonJS 文件，再在微信开发者工具点击编译。

## 当前能力

- 创建并持久化旅行、日期和同行人。
- 按天设置起点与终点，添加地点、交通、游玩和住宿，设置出发时间、排序、启用或放弃。
- 分类预算、公共均分、房间人员和指定人员承担。
- 待确认与确认实付、按本笔费用选择分摊人员、退款确认、结算建议和线下转账确认。
- 购买和预约状态独立保存。
- 新疆案例一键导入、来源冲突及金额校验。
- 本机只读分享预览；云分享代码已提供但默认未配置。
- 无损归档和恢复，归档不会删除行程、预算或账本；总览显示最后一次成功本地保存时间。

## 运行模式

默认 `config/runtime.js` 中 `cloudEnabled=false`，数据保存在微信本机存储。真实跨设备分享的接通步骤见 `docs/cloud-share-setup.md`。未部署云函数前，页面不会宣称分享成功。

发布前验收门槛见 `docs/release-gates.md`，逐步执行表见 `docs/manual-acceptance.md`，当前验证事实见 `docs/verification-report.md`，逐项完成度见 `docs/completion-audit.md`。
