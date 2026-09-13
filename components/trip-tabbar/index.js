Component({
  properties: {
    tripId: { type: String, value: '' },
    active: { type: String, value: 'overview' },
  },
  data: {
    entries: [
      { key: 'overview', label: '总览', icon: '/assets/icons/overview.svg', activeIcon: '/assets/icons/overview-active.svg' },
      { key: 'itinerary', label: '行程', icon: '/assets/icons/itinerary.svg', activeIcon: '/assets/icons/itinerary-active.svg' },
      { key: 'budget', label: '预算', icon: '/assets/icons/budget.svg', activeIcon: '/assets/icons/budget-active.svg' },
      { key: 'bookings', label: '预订', icon: '/assets/icons/bookings.svg', activeIcon: '/assets/icons/bookings-active.svg' },
      { key: 'adjustments', label: '调整', icon: '/assets/icons/adjustments.svg', activeIcon: '/assets/icons/adjustments-active.svg' },
    ],
  },
  methods: {
    go(event) {
      const page = event.currentTarget.dataset.page
      if (!page || page === this.data.active) return
      wx.redirectTo({
        url: `/pages/${page}/index?tripId=${encodeURIComponent(this.data.tripId)}`,
      })
    },
  },
})
