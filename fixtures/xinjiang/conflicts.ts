import type { ConflictRecord } from '../../domain/models/types'
const now='2026-09-09T00:00:00+08:00'
const rows:[string,string,string][]=[
 ['C01','独山子门票是否已计入冲突','当前预算按明细计入90元一次，后文“尚未计入”作为旧说明保留'],
 ['C02','旅游卡覆盖统计范围冲突','按当前活动引用动态统计，原文两个范围均保留'],
 ['C03','白哈巴当前自驾与旧班车叙述冲突','当前方案采用先出园取车后自驾，旧班车文字不进入依赖'],
 ['C04','新村退房与返程班次衔接待核实','缺少实际步行或乘车衔接，不能断言可行'],
 ['C05','首日晚到与次日早出休息不足','按区间提示约4至6小时且未扣整备'],
 ['C06','首日495.6km路段端点不一致','距离来源待核实'],
 ['C07','赛湖售票开放日期为推算','9月29日仅是计划核实日期'],
 ['C08','住宿价格与预订状态不能互推','禾木和铁热克提状态分别保留'],
 ['C09','通行费免费假设需复核','108元作为案例预算假设'],
 ['C10','原文可行结论存在信息缺项','系统保持信息不足或风险状态'],
]
export const xinjiangSourceConflicts:ConflictRecord[]=rows.map(([code,title,reason],i)=>({id:'xinjiang-conflict-'+code,tripId:'xinjiang-2026',code,title,status:'conflict',sourceSections:['新疆攻略14.4'],adoptedValue:reason,resolutionReason:reason,userConfirmed:false,createdAt:now,updatedAt:now,revision:i+1}))
