import { expect,it } from 'vitest'
import { createVisitorView } from '../services/share-view'
import { xinjiangSeed } from '../fixtures/xinjiang/seed'
it('X20 creates a read-only summary without personal expenses or booking details',()=>{
 const view=createVisitorView(xinjiangSeed)
 expect(view.title).toContain('新疆')
 expect(view.days).toHaveLength(10)
 expect(view.budget).toEqual({lowFen:1956168,highFen:2097268,unknownCount:2})
 expect(view.bookingProgress).toEqual({purchased:3,reserved:7,total:17})
 expect(JSON.stringify(view)).not.toContain('expenses')
 expect(JSON.stringify(view)).not.toContain('payerId')
 expect(JSON.stringify(view)).not.toContain('totalPriceFen')
 expect(Object.isFrozen(view)).toBe(true)
})
