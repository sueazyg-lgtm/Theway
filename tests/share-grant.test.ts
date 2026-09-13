import { expect,it } from 'vitest'
import { authorizeShareRead,authorizeShareRevoke } from '../services/share-grant'
const grant={id:'s',tripId:'t',ownerId:'owner',status:'active' as const,expiresAt:'2026-10-02T00:00:00Z'}
it('allows a bearer link before expiry and rejects revoked or expired grants',()=>{expect(authorizeShareRead(grant,'2026-10-01T00:00:00Z')).toBe(true);expect(()=>authorizeShareRead({...grant,status:'revoked'},'2026-10-01T00:00:00Z')).toThrow('share_revoked');expect(()=>authorizeShareRead(grant,'2026-10-02T00:00:00Z')).toThrow('share_expired')})
it('only permits the grant owner to revoke access',()=>{expect(authorizeShareRevoke(grant,'owner')).toBe(true);expect(()=>authorizeShareRevoke(grant,'other')).toThrow('access_denied')})
