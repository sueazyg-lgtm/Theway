export interface ShareGrant { id:string; tripId:string; ownerId:string; status:'active'|'revoked'; expiresAt:string|null }
export function authorizeShareRead(grant:ShareGrant|undefined,now:string){
 if(!grant)throw new Error('share_not_found')
 if(grant.status!=='active')throw new Error('share_revoked')
 if(grant.expiresAt&&Date.parse(grant.expiresAt)<=Date.parse(now))throw new Error('share_expired')
 return true
}
export function authorizeShareRevoke(grant:ShareGrant|undefined,actorId:string){
 if(!grant)throw new Error('share_not_found')
 if(grant.ownerId!==actorId)throw new Error('access_denied')
 return true
}
