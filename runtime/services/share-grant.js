"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeShareRead = authorizeShareRead;
exports.authorizeShareRevoke = authorizeShareRevoke;
function authorizeShareRead(grant, now) {
    if (!grant)
        throw new Error('share_not_found');
    if (grant.status !== 'active')
        throw new Error('share_revoked');
    if (grant.expiresAt && Date.parse(grant.expiresAt) <= Date.parse(now))
        throw new Error('share_expired');
    return true;
}
function authorizeShareRevoke(grant, actorId) {
    if (!grant)
        throw new Error('share_not_found');
    if (grant.ownerId !== actorId)
        throw new Error('access_denied');
    return true;
}
