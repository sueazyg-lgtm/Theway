const config=require('./config/runtime')
App({onLaunch(){if(config.cloudEnabled&&config.cloudEnvId&&wx.cloud)wx.cloud.init({env:config.cloudEnvId,traceUser:true})}})
