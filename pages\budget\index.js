const { service, readTripId, loadTrip, run, bindField, backToTrips } = require('../../adapters/page-helpers')

Page({
  data: {
    tripId: '',
    selected: null,
    error: '',
    budgetName: '',
    budgetAmount: '',
    budgetCategoryIndex: 0,
    budgetCategories: ['交通', '住宿', '门票', '餐饮', '其他'],
    budgetModeIndex: 0,
    budgetModes: ['公共均分', '按房间人员', '指定人员承担'],
    budgetModeValues: ['equal', 'room', 'fixed'],
    budgetParticipantIds: [],
    budgetParticipants: [],
    payerIndex: 0,
    expenseAmount: '',
    expenseParticipantIds: [],
    expenseParticipants: [],
    refundExpenseIndex: 0,
    refundReceiverIndex: 0,
    refundAmount: '',
  },

  onLoad(options) {
    run(this, () => this.setData({ tripId: readTripId(options) }))
  },

  onShow() {
    if (!this.data.tripId) return
    run(this, () => {
      const selected = loadTrip(this)
      const validIds = new Set(selected.participants.map(participant => participant.id))
      const kept = this.data.budgetParticipantIds.filter(id => validIds.has(id))
      const budgetParticipantIds = kept.length ? kept : [...validIds]
      const keptExpenseIds = this.data.expenseParticipantIds.filter(id => validIds.has(id))
      const expenseParticipantIds = keptExpenseIds.length ? keptExpenseIds : [...validIds]
      this.setData({
        budgetParticipantIds,
        budgetParticipants: selected.participants.map(participant => ({
          ...participant,
          checked: budgetParticipantIds.includes(participant.id),
        })),
        expenseParticipantIds,
        expenseParticipants: selected.participants.map(participant => ({
          ...participant,
          checked: expenseParticipantIds.includes(participant.id),
        })),
      })
    })
  },

  backToTrips,
  field(event) { bindField(this, event) },
  budgetPeople(event) {
    const budgetParticipantIds = event.detail.value
    this.setData({
      budgetParticipantIds,
      budgetParticipants: this.data.selected.participants.map(participant => ({
        ...participant,
        checked: budgetParticipantIds.includes(participant.id),
      })),
    })
  },

  expensePeople(event) {
    const expenseParticipantIds = event.detail.value
    this.setData({
      expenseParticipantIds,
      expenseParticipants: this.data.selected.participants.map(participant => ({
        ...participant,
        checked: expenseParticipantIds.includes(participant.id),
      })),
    })
  },

  addBudget() {
    run(this, () => {
      if (!/^\d+(\.\d{1,2})?$/.test(this.data.budgetAmount)) {
        throw new Error('请输入最多两位小数的预算金额')
      }
      const selected = this.data.selected
      const mode = this.data.budgetModeValues[Number(this.data.budgetModeIndex)]
      const participantIds = mode === 'equal'
        ? selected.participants.map(participant => participant.id)
        : this.data.budgetParticipantIds
      service.addBudgetItem(selected.id, {
        id: `budget-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category: this.data.budgetCategories[Number(this.data.budgetCategoryIndex)],
        name: this.data.budgetName,
        totalFen: Math.round(Number(this.data.budgetAmount) * 100),
        mode,
        participantIds,
      }, selected.revision)
      this.setData({ budgetName: '', budgetAmount: '' })
      loadTrip(this)
    })
  },

  addExpense() {
    run(this, () => {
      if (!/^\d+(\.\d{1,2})?$/.test(this.data.expenseAmount)) {
        throw new Error('请输入最多两位小数的费用金额')
      }
      const selected = this.data.selected
      service.submitExpense(selected.id, {
        requestId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        payerId: selected.participants[Number(this.data.payerIndex)].id,
        totalFen: Math.round(Number(this.data.expenseAmount) * 100),
        beneficiaryIds: this.data.expenseParticipantIds,
        paidAt: new Date().toISOString(),
      }, selected.revision)
      this.setData({ expenseAmount: '' })
      loadTrip(this)
    })
  },

  confirm(event) {
    wx.showModal({
      title: '确认实际付款',
      content: '请确认这笔费用确已支付。确认后才会计入实际账本与结算。',
      success: result => {
        if (!result.confirm) return
        run(this, () => {
          service.confirmExpense(
            this.data.selected.id,
            event.currentTarget.dataset.id,
            this.data.selected.revision,
          )
          loadTrip(this)
        })
      },
    })
  },

  submitRefund() {
    run(this, () => {
      if (!/^\d+(\.\d{1,2})?$/.test(this.data.refundAmount)) {
        throw new Error('请输入最多两位小数的退款金额')
      }
      const selected = this.data.selected
      const expense = selected.refundableExpenses[Number(this.data.refundExpenseIndex)]
      const receiver = selected.participants[Number(this.data.refundReceiverIndex)]
      if (!expense || !receiver) throw new Error('请选择原费用和退款接收人')
      service.submitRefund(selected.id, {
        id: `refund-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        expenseId: expense.id,
        receiverId: receiver.id,
        amountFen: Math.round(Number(this.data.refundAmount) * 100),
      }, selected.revision)
      this.setData({ refundAmount: '', refundExpenseIndex: 0 })
      loadTrip(this)
    })
  },

  confirmRefund(event) {
    wx.showModal({
      title: '确认退款到账',
      content: '确认后才会从实际净支出中扣除，并重新计算结算建议。',
      success: result => {
        if (!result.confirm) return
        run(this, () => {
          service.confirmRefund(
            this.data.selected.id,
            event.currentTarget.dataset.id,
            this.data.selected.revision,
          )
          loadTrip(this)
        })
      },
    })
  },

  reportTransfer(event) {
    const { from, to, amount } = event.currentTarget.dataset
    wx.showModal({
      title: '登记线下转账',
      content: '先保存为待确认记录；只有双方核对并确认后，才会冲减剩余结算金额。',
      success: result => {
        if (!result.confirm) return
        run(this, () => {
          service.reportTransfer(this.data.selected.id, {
            id: `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            fromParticipantId: from,
            toParticipantId: to,
            amountFen: Number(amount),
          }, this.data.selected.revision)
          loadTrip(this)
        })
      },
    })
  },

  confirmTransfer(event) {
    wx.showModal({
      title: '确认转账已完成',
      content: '确认后会计入结算余额。请在双方已经核对实际转账后操作。',
      success: result => {
        if (!result.confirm) return
        run(this, () => {
          service.confirmTransfer(
            this.data.selected.id,
            event.currentTarget.dataset.id,
            this.data.selected.revision,
          )
          loadTrip(this)
        })
      },
    })
  },
})
