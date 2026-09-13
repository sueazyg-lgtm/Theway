const config = require('../../config/runtime')
const { toUserMessage } = require('../../runtime/services/error-messages')

Page({
  data: { loading: true, error: '', view: null },

  onLoad(options) {
    if (!config.cloudEnabled || !config.cloudEnvId) {
      this.setData({ loading: false, error: '真实分享尚未配置云环境' })
      return
    }
    if (!options.shareId) {
      this.setData({ loading: false, error: '分享链接无效' })
      return
    }
    wx.cloud.callFunction({ name: 'share-read', data: { shareId: options.shareId } })
      .then(result => {
        const publicView = result.result && result.result.publicView
        if (!publicView) throw new Error('share_not_found')
        this.setData({ loading: false, view: publicView })
      })
      .catch(error => this.setData({ loading: false, error: toUserMessage(error) }))
  },
})
