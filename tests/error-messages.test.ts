import { describe, expect, it } from 'vitest'
import { toUserMessage } from '../services/error-messages'

describe('user-facing error messages', () => {
  it('maps storage and concurrency codes to actionable Chinese messages', () => {
    expect(toUserMessage(new Error('version_conflict'))).toBe('行程已更新，请重新进入当前页面后再试')
    expect(toUserMessage(new Error('storage_corrupt'))).toBe('本机行程数据无法读取，请勿清除数据，并联系维护人员处理')
    expect(toUserMessage(new Error('storage_schema_unsupported'))).toBe('本机数据来自不兼容版本，请升级小程序后再试')
    expect(toUserMessage(new Error('trip_not_found'))).toBe('没有找到这趟旅行，请返回旅行列表重新进入')
    expect(toUserMessage(new Error('request_id_reused'))).toBe('这次提交与已有记录冲突，未生成重复账单')
  })

  it('keeps already readable Chinese validation messages', () => {
    expect(toUserMessage(new Error('请输入最多两位小数的费用金额')))
      .toBe('请输入最多两位小数的费用金额')
  })

  it('does not expose unknown internal errors', () => {
    expect(toUserMessage(new Error('unexpected_stack_detail'))).toBe('操作失败，请稍后重试')
    expect(toUserMessage(null)).toBe('操作失败，请稍后重试')
  })
})
