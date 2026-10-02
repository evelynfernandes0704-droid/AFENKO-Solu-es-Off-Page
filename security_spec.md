# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Strict Multi-Tenant Isolation (PII & Lead Protection)**: Every document in `/leads/{leadId}` and `/dispatches/{dispatchId}` belongs exclusively to the authenticated user whose `request.auth.uid == resource.data.ownerId`. No user may read, list, update, or delete another user's leads or dispatch logs.
2. **Verified Identity**: All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Relational Integrity**: A `DispatchLog` document in `/dispatches/{dispatchId}` cannot be created unless the referenced `/leads/$(incoming().leadId)` document exists and its `ownerId == request.auth.uid`.
4. **Immutable Ownership & Creation Timestamp**: `ownerId`, `createdAt`, and (for dispatches) `leadId` are strictly immutable after document creation (`incoming().ownerId == existing().ownerId` and `incoming().createdAt == existing().createdAt`).
5. **Server Timestamp Enforcement**: `createdAt` must equal `request.time` on `create`, and `updatedAt` must equal `request.time` on both `create` and `update`.
6. **Strict Schema & Volumetric Bounds**: All strings are bounded by explicit `.size()` checks matching `firebase-blueprint.json`, and no undeclared shadow fields are permitted (`hasOnly`).

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Lead Read**: `auth = null`, `get /leads/lead_1` -> `PERMISSION_DENIED`
2. **Unverified Email Lead Write**: `auth = { uid: 'user_1', token: { email_verified: false } }`, `create /leads/lead_1` -> `PERMISSION_DENIED`
3. **Cross-Tenant PII Leak (Get)**: `auth = { uid: 'attacker_1', token: { email_verified: true } }`, `get /leads/victim_lead` (where `ownerId == 'victim_1'`) -> `PERMISSION_DENIED`
4. **Cross-Tenant List Scraping**: `auth = { uid: 'attacker_1' }`, `list /leads` without filtering `ownerId == 'attacker_1'` -> `PERMISSION_DENIED`
5. **Identity Spoofing on Create**: `auth = { uid: 'user_1' }`, `create /leads/lead_1` with `ownerId: 'user_2'` -> `PERMISSION_DENIED`
6. **Shadow Field Injection on Create**: `create /leads/lead_1` including undeclared field `isAdmin: true` -> `PERMISSION_DENIED`
7. **Shadow Field Injection on Update**: `update /leads/lead_1` adding `hacked: 'yes'` -> `PERMISSION_DENIED`
8. **Ownership Transfer Attack on Update**: `update /leads/lead_1` changing `ownerId` from `'user_1'` to `'user_2'` -> `PERMISSION_DENIED`
9. **Timestamp Forgery (Backdating)**: `create /leads/lead_1` with `createdAt` set to a past timestamp (`!= request.time`) -> `PERMISSION_DENIED`
10. **Value Poisoning (Oversized String)**: `update /leads/lead_1` with `companyName` length 500 (> 200 max) -> `PERMISSION_DENIED`
11. **Invalid Enum State Transition**: `update /leads/lead_1` with `funnelStage: 'invalid_stage'` -> `PERMISSION_DENIED`
12. **Orphaned Dispatch Creation**: `create /dispatches/disp_1` referencing a non-existent `leadId: 'non_existent_lead'` or a lead owned by another user -> `PERMISSION_DENIED`
