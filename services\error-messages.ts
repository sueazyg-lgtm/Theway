const messages: Record<string, string> = {
  version_conflict: '行程已更新，请重新进入当前页面后再试',
  storage_corrupt: '本机行程数据无法读取，请勿清除数据，并联系维护人员处理',
  storage_schema_unsupported: '本机数据来自不兼容版本，请升级小程序后再试',
  invalid_write: '保存参数无效，本次修改没有写入',
  trip_not_found: '没有找到这趟旅行，请返回旅行列表重新进入',
  invalid_import: '案例数据格式不完整，未执行导入',
  invalid_participant: '付款人或分摊人员不属于当前旅行，请重新选择',
  invalid_expense: '费用信息不完整，本次账单没有保存',
  request_id_reused: '这次提交与已有记录冲突，未生成重复账单',
  duplicate_activity: '这项活动已经存在，没有重复添加',
  activity_not_found: '没有找到这项活动，请刷新页面后再试',
  day_not_found: '没有找到对应日期，请刷新页面后再试',
  booking_not_found: '没有找到这条预订，请刷新页面后再试',
  refund_requires_confirmed_expense: '只能为已经确认实付的费用记录退款',
  invalid_refund: '退款信息不完整，本次退款没有保存',
  refund_not_found: '没有找到这条退款，请刷新页面后再试',
  invalid_transfer: '转账人员或金额无效，请重新填写',
  transfer_not_found: '没有找到这笔转账，请刷新页面后再试',
  share_not_found: '分享不存在或已经失效',
  share_revoked: '分享已经撤销，无法继续查看',
  share_expired: '分享已经过期，请联系行程创建者重新分享',
  access_denied: '当前账号没有查看或修改权限',
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; errMsg?: unknown }
    if (typeof value.message === 'string') return value.message
    if (typeof value.errMsg === 'string') return value.errMsg
  }
  return ''
}

export function toUserMessage(error: unknown): string {
  const text = errorText(error).trim()
  if (messages[text]) return messages[text]
  if (/[\u3400-\u9fff]/.test(text)) return text
  return '操作失败，请稍后重试'
}
