const { service, readTripId, loadTrip, run, backToTrips } = require('../../adapters/page-helpers')
const { createVisitorView } = require('../../runtime/services/share-view')
const { toUserMessage } = require('../../runtime/services/error-messages')
const config = require('../../config/runtime')

Page({
  data: {
    tripId: '',
    selected: null,
    error: '',
    cloudEnabled: config.cloudEnabled,
    sharePreview: null,
    cloudShareId: '',
    cloudShareExpiresAt: '',
  },

  onLoad(options) {
    run(this, () => this.setData({ tripId: readTripId(options) }))
  },

  onShow() {
    if (this.data.tripId) run(this, () => loadTrip(this))
  },

  backToTrips,

  previewShare() {
    run(this, () => {
      const view = createVisitorView(service.get(this.data.tripId).value)
      this.setData({
        sharePreview: {
          ...view,
          budgetLow: (view.budget.lowFen / 100).toFixed(2),
          budgetHigh: (view.budget.highFen / 100).toFixed(2),
        },
      })
    })
  },

  closeShare() {
    this.setData({ sharePreview: null })
  },

  prepareCloudShare() {
    if (!config.cloudEnabled || !config.cloudEnvId) {
      wx.showModal({
        title: '真实分享未接通',
        content: '请先在 config/runtime.js 填入云环境 ID，并部署三个分享云函数。当前仍可使用本机只读预览。',
        showCancel: false,
      })
      return
    }
    const publicView = createVisitorView(service.get(this.data.tripId).value)
    wx.showLoading({ title: '创建授权' })
    wx.cloud.callFunction({ name: 'share-create', data: { publicView } })
      .then(result => {
        const payload = result.result || {}
        if (!payload.shareId) throw new Error('云函数未返回分享凭证')
        this.setData({
          cloudShareId: payload.shareId,
          cloudShareExpiresAt: payload.expiresAt || '',
        })
        wx.showToast({ title: '可以转发了' })
      })
      .catch(error => wx.showToast({ title: toUserMessage(error), icon: 'none' }))
      .finally(() => wx.hideLoading())
  },

  revokeCloudShare() {
    wx.cloud.callFunction({ name: 'share-revoke', data: { shareId: this.data.cloudShareId } })
      .then(() => {
        this.setData({ cloudShareId: '', cloudShareExpiresAt: '' })
        wx.showToast({ title: '分享已撤销' })
      })
      .catch(error => wx.showToast({ title: toUserMessage(error), icon: 'none' }))
  },

  onShareAppMessage() {
    if (!this.data.cloudShareId || !this.data.selected) {
      return { title: '旅行计划', path: '/pages/index/index' }
    }
    return {
      title: this.data.selected.title,
      path: `/pages/share/index?shareId=${encodeURIComponent(this.data.cloudShareId)}`,
    }
  },
})
