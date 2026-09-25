# Frontend implementation prompt — King Live / Euro Live APIs

Copy everything below the line into a frontend chat (Admin portal, Agency portal, Host/App, or Reseller). The backend is NestJS at `/api/v1`. Do not invent routes. If a screen is listed under **NOT BUILT**, do not build UI for it.

---

You are implementing frontend against a **live NestJS backend**. Base URL: `http://localhost:3000/api/v1`. Swagger: `http://localhost:3000/api-docs` (HTTP Basic `admin` / `admin123`).

Read **`data`** from every JSON response (except Health). Envelope:

```json
{ "success": true, "statusCode": 200, "message": "Success", "data": {}, "timestamp": "..." }
```

Errors: `{ "success": false, "statusCode": 400, "message": "..." }` — `message` can be a string or string[]. HTTP 200 and 201 are both success. Extra JSON fields are rejected (400). Pagination lists: `{ items, meta: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }` with `?page=1&limit=20` (max 100).

Auth header: `Authorization: Bearer <accessToken>`. Access token **15 minutes**. Refresh token **7 days**, one-time rotate via `POST /auth/refresh` `{ refreshToken }`. On 401: refresh once, retry, else logout. Logout: `POST /auth/logout` `{ refreshToken }`.

**Four separate token stores** (never mix):

| Client | JWT `accountType` | Login |
|---|---|---|
| Admin portal | `staff` | `POST /admin/auth/login` |
| Reseller portal | `reseller` | `POST /reseller/auth/login` |
| Agency portal | `agency` | `POST /agency/auth/login` |
| App / Host | `user` | `POST /app/auth/login` |

Wrong portal token → 403. Host is a **user** who also has a host profile; after app login, call `/host/...` (403 if not a host).

---

## A. ALREADY IMPLEMENTED (keep; do not rebuild unless missing)

These portal APIs shipped earlier and are still valid.

### Admin auth
- `POST /admin/auth/login` `{ login, password }` → `{ requires2fa, staff, accessToken, refreshToken }` or `{ requires2fa: true, challengeToken }`
- `POST /admin/auth/2fa/verify` `{ challengeToken, code }`
- `GET /admin/auth/me`
- `POST /admin/auth/2fa/setup|enable|disable`
- Forgot/reset: `POST /admin/auth/forgot-password` `{ login }` → always `{ sent: true, expiresInSeconds: 600 }`; `POST /admin/auth/verify-otp` `{ login, otp }`; `POST /admin/auth/reset-password` `{ login, otp, newPassword }` (min 8). 60s resend cooldown, 5 OTP attempts, 10 min TTL.

### Reseller auth (same OTP pattern)
- `POST /reseller/auth/login|forgot-password|verify-otp|reset-password`
- `GET /reseller/auth/me`

### Admin portal business
- Dashboard `GET /admin/dashboard` (now also has Euro Live KPIs — see section B)
- Users: `POST/GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id/ban|unban`
- Catalog: `POST/GET/PATCH/DELETE /admin/catalog` types `frame|entry|badge` (**plus new `wallpaper`**)
- Resellers: create/list/get/update, balance adjust, permissions, limits, credit-limit
- Wallets: `POST /admin/wallets/adjust`
- Roles/staff: `GET /admin/roles|permissions|staff`, `POST /admin/staff`, `PATCH /admin/staff/:id/roles`
- Audit: `GET /admin/audit-logs` (now includes `reason`, `caseNumber`; **no edit/delete**)

### Reseller portal
- `GET /reseller/dashboard|limits|catalog|transactions`
- `POST /reseller/coins/transfer` `{ publicId, amount, idempotencyKey? }`
- Assign `POST /reseller/frames|entries|badges/assign`
- `DELETE /reseller/items/:id`
- Reports `GET /reseller/reports/sales|commission`
- Lookup user `GET /reseller/users/:publicId`
- Permission flags: `recharge`, `frame`, `entry`, `badge`, `remove`, `expiry` (**plus new `sos`, `complaint_evidence`**)

### Shared
- `POST /auth/refresh`, `POST /auth/logout`
- Health `GET /health`, `GET /health/ready` (no envelope)

**Dev admin:** login `osamakhan16708e@gmail.com` / `Osama@123` (or username `osamakhan`). Demo consumer publicId `10000001`.

---

## B. NEW — implement these frontends now (Euro Live Core)

Backend is done. Build UI against these APIs only.

### B1. App / Host login (new)
`POST /app/auth/login` `{ login, password, deviceId?, deviceName? }`  
`login` = email, username, or publicId. Password min 8.

`data`: `{ user, accessToken, refreshToken, tokenType, expiresIn }`  
`user` has **no phone**. Fields: `id, publicId, username, email, displayName, country, gender, bio, avatarUrl, status, isOfficial, officialId`.

`GET /app/auth/me` — same public user object.

New device on login: backend emails the user if email exists. Show a “new device” hint from `GET /app/me/devices` (`isNew`).

Seeded: `host_pk_1` / `Host@1234`, `demo_user` / `Demo@1234`.

**Not available:** app/host/agency **forgot-password**. Only Admin and Reseller have OTP reset. Host salary PIN has its own OTP (`/host/salary/pin/forgot`).

### B2. Agency portal (new app or route tree)
`POST /agency/auth/login` `{ login, password }`  
`GET /agency/auth/me`  
`GET /agency/dashboard` → `{ agency, hostCount, shareTotal, wallet: { coinBalance } }`  
`GET /agency/hosts` paginated roster (host public fields, **no salary amounts**)  
`GET /agency/shares` → `{ wallet, shareTotal, items: [{ id, batchId, amount, createdAt }] }`

Seeded: `agency_pk` / `Agency@123`, `agency_bd` / `Agency@123`.

Agency **must never** show host salary, PIN, complaints evidence, or SOS trails.

### B3. Devices + self-freeze (App)
- `GET /app/me/devices` → `{ id, deviceId, deviceName, lastSeenAt, isNew }[]`
- `POST /app/me/logout-all` → `{ revoked: true }` (also call `/auth/logout`)
- `POST /app/me/freeze` `{ reason }` — creates freeze pending Master. Show confirmation; user coins may stop moving.

### B4. Admin — Agencies
- `POST /admin/agencies` `{ email, username, password, displayName, country, sharePercent? }` country `PK|IN|BD`
- `GET /admin/agencies?page&limit&country&status` status `active|suspended|frozen`
- `GET /admin/agencies/:id`
- `PATCH /admin/agencies/:id` `{ displayName?, country?, status?, sharePercent? }`
- `POST /admin/agencies/:id/freeze` `{ reason }` — **Master (`super_admin`) only**

### B5. Admin — Hosts
- `POST /admin/hosts` either `{ userId, country, agencyId? }` or `{ username, displayName, email?, password?, country, agencyId? }`
- `GET /admin/hosts?agencyId&country`
- `GET /admin/hosts/:id`
- `PATCH /admin/hosts/:id` `{ agencyId?, country?, status? }` status `active|suspended|frozen`
- `POST /admin/hosts/:id/protection-lock` `{ reason, hours? }` Master
- `POST /admin/hosts/:id/protection-unlock` Master
- `POST /admin/hosts/:id/freeze` `{ reason }` Master

If `protectionLocked` is true, non-Master writes return **403** `"Host Protection Lock is active..."`. Show a lock badge + case number.

Host public object: `id, userId, agencyId, country, status, protectionLocked, protectionLockedUntil, protectionCaseNumber, user { publicId, username, displayName, isOfficial, officialId }, agency { id, displayName, country }`.

### B6. Official / protected IDs
- `PATCH /admin/users/:id/official` `{ isOfficial, officialId? }` Master — hosts **cannot** kick/blacklist this user
- Create/update reseller: `isOfficial`, `officialId`; permissions `canViewSosAlerts`, `canViewComplaintEvidence` (default false)
- Show public label **Official** + `officialId` on reseller and user where `isOfficial`

### B7. Host portal — rooms
Requires host JWT (app login as `host_pk_*`).

- `GET /host/dashboard` → `{ host, rooms }` (no salary money)
- `POST /host/rooms` `{ title }`
- `GET /host/rooms`
- `POST /host/rooms/:id/background` `{ catalogItemId }` — catalog item **type must be `wallpaper`**
- `POST /host/rooms/:id/staff` `{ userId }` — mute-only admin
- `DELETE /host/rooms/:id/staff/:userId`
- `POST /host/rooms/:id/kick` `{ userId, reason? }` — 403 if target Official
- `POST /host/rooms/:id/blacklist` `{ userId, reason? }`
- `DELETE /host/rooms/:id/blacklist/:userId`
- Room admin (normal user with staff row): `POST /app/rooms/:id/mute` `{ userId, reason? }`
- Admin: `GET /admin/rooms`

Users **cannot** set room background.

### B8. Complaints / Report Center
- User: `POST /app/reports` `{ targetId, targetType?: "user"|"host"|"agency", summary, severity?: "low"|"medium"|"high"|"critical", type?: "user_report"|"host_complaint"|"agency_misconduct", evidence?: [{ type: "image"|"audio"|"video", url }], protectionLock?: boolean }`
- Host: `POST /host/complaints` (same body), `GET /host/complaints`
- Admin list `GET /admin/complaints`
- Admin detail `GET /admin/complaints/:id` — **evidence array only if Master**. Other staff see events/status without files.
- Master review `POST /admin/complaints/:id/review` `{ action: "confirm"|"reject"|"close", note?, penalty?, salaryDeduct?: boolean }`

Statuses: `received | under_review | action_taken | rejected | closed`. Never auto-penalize from the create form. `salaryDeduct` is Master-only on confirm.

**No file upload API.** Client uploads elsewhere (or uses a URL) and sends `url`. Do not expect multipart.

### B9. SOS
- Host `POST /host/sos` `{ roomId?, message?, assignedResellerId? }` — also turns on Host Protection Lock
- Host `GET /host/sos` — statuses `open | acknowledged | handling | escalated | resolved`; show `trail[]`
- Admin `GET /admin/sos` (overdue alerts escalate after 5 minutes if no ack)
- Staff `POST /admin/sos/:id/ack`
- Master `POST /admin/sos/:id/resolve` `{ outcome }`
- Reseller (needs permission `sos` / `canViewSosAlerts`): `POST /reseller/sos/:id/ack`

### B10. Salary & payouts (Master money; host PIN view)

**Admin countries (seeded empty rules, countries exist):**  
`GET /admin/countries` → `{ code, name, currency, payoutHoldDays, isActive }` PK/INR/BDT.  
`PATCH /admin/countries/:code` Master `{ name?, currency?, payoutHoldDays?, isActive? }` default hold **3 days**.

**Rules (Admin fills):**  
`GET /admin/salary-rules?countryCode=PK`  
`POST /admin/salary-rules` `{ countryCode, name, requiredHours?, requiredDays?, requiredBeans?, salaryAmount?, bonusAmount?, agencySharePercent? }`  
`PATCH /admin/salary-rules/:id` same fields.

**Periods / hours:**  
`POST /admin/salary/periods` `{ label, startsOn, endsOn }` dates `YYYY-MM-DD`  
`GET /admin/salary/periods`  
`POST /admin/hosts/:id/hours` `{ periodId, liveHours, liveDays, beans? }` — blocked if protection lock and not Master.

**Payout workflow (Master only for writes):**  
1. `POST /admin/payouts/calculate` `{ periodId }`  
2. `GET /admin/payouts` / `GET /admin/payouts/:id` with `items[]` (`partyType: host|agency`, `amount`, `corrections[]`)  
3. `POST /admin/payouts/:id/approve-hold` — status `holding`, `holdUntil`  
4. `POST /admin/payouts/:id/items/:itemId/correct` `{ newAmount, reason }` (not after release)  
5. `POST /admin/payouts/:id/release` — **fails until `holdUntil`**. Credits host_salary + agency wallets.

Ban does not cut salary. Bonus can drop if Master confirmed `salaryDeduct` on **3+** complaints.

**Host salary (PIN gated):**  
- `POST /host/salary/pin` `{ pin, currentPin? }` first set needs no currentPin  
- `POST /host/salary/view` `{ pin }` → `{ wallet: { coinBalance, diamondBalance }, lines: [{ period, liveHours, liveDays, beans, targetMet, earned, bonus, deductions, deductionReason, status, hold }] }`  
- `POST /host/salary/pin/forgot` → `{ sent: true, expiresInSeconds: 600 }`  
- `POST /host/salary/pin/reset` `{ otp, pin }`  

Biometric unlock is **client-only**. Never send fingerprints to the API. After device biometric, still call `/host/salary/view` with the PIN you keep in secure device storage — or prompt PIN.

Agency screens: share totals only (B2).

### B11. Freeze + fraud (Admin / Master)
- `GET /admin/freezes?status&ownerId` status `pending_review|frozen|restored|confirmed`
- `POST /admin/freezes` `{ ownerId, ownerType, freezeType: "coins"|"account"|"wallet", reason }` Master
- `POST /admin/freezes/:id/review` `{ action: "restore"|"confirm"|"ban", note? }` Master
- `GET /admin/fraud`
- `POST /admin/fraud/:id/review` `{ action: "restore"|"correct"|"penalty"|"ban", note?, amount? }` — `correct` needs `amount` (debit)

Large coin credits can auto-create freeze + fraud case. Show as **temporary freeze**, not a ban, until Master reviews.

### B12. Backups (Admin)
- `GET /admin/backups/settings` `{ enabled, intervalHours, lastRunAt, disabledReason }`
- `PATCH /admin/backups/settings` disable **requires** `{ enabled: false, password, totp?, reason }` Master
- `POST /admin/backups/run` Master
- `GET /admin/backups` list runs `{ status, manual, path, snapshot, error }`

**No restore button.** Restore is ops, not an API for the UI.

### B13. Dashboards — extra fields
`GET /admin/dashboard` now includes:

`activeRooms, pendingPayouts, openSos, openComplaints, frozenWallets, pendingWithdrawals` (same as pending payouts), `flaggedReports` (open complaints), plus old `usersTotal, usersBanned, resellersTotal, coinsInCirculation`. `dau/mau/revenue` are still `0` (no live analytics yet).

`GET /host/dashboard` — host + rooms only. Salary numbers only after PIN view.

---

## C. NOT BUILT — do not implement UI for these yet

Backend has **no** (or only stub) APIs:

| Area | Status |
|---|---|
| Flutter consumer app screens | Out of scope (APIs exist for host/app JSON only) |
| Live RTC / streaming / watch party | Not built |
| Gifts, PK battles, comments, leaderboards, presence | Not built |
| Socket.IO `/live` | Only `ping` → `pong`. Do not wire chat/gifts |
| PDF §16 media / audio-video share / entertainment | Not built |
| Real-money bank withdrawal / payout rails | Not built (in-app salary wallet only) |
| Multipart evidence / S3 upload | Not built — send `url` strings |
| Push notifications | Not built (SOS is in-app list + audit) |
| App / Host / Agency forgot-password | Not built (Admin + Reseller only) |
| Public profile GET for app by publicId | Reseller lookup exists; no `/app/users/:publicId` |
| User registration OTP / phone login | Not built — admin/host seed or `POST /admin/users` with optional `password` |
| Wallpaper **file** upload | Not built — Admin creates catalog `type: "wallpaper"` with `assetUrl` |
| Backup **restore** from UI | Not built |
| Scheduled backup cron UI beyond settings | Settings stored; manual `POST /admin/backups/run` |
| Live hours auto-ingest from streams | Not built — Admin posts hours manually |
| Camera-presence / geo rules | Not built |

---

## D. Roles cheat sheet for UI gating

- **Master** = staff JWT `role` or `roles` includes `super_admin`. Exclusive: salary calculate/hold/correct/release, country/rule writes, freeze/fraud review, backup disable/run, protection unlock, agency freeze, official flag, complaint review, SOS resolve, complaint **evidence**.
- Staff `admin|finance|support|moderator`: view most queues; cannot move salary money.
- **Official**: `isOfficial` on user and/or reseller + `officialId`. Cannot be kicked/blacklisted by host.
- **Room admin**: mute only.
- **Agency**: share totals, host roster, no salary/complaints/evidence.
- **Reseller SOS ack**: need `canViewSosAlerts` (`sos` permission). Evidence: `canViewComplaintEvidence` (no reseller evidence GET was exposed except Master complaint detail — do not build reseller evidence gallery unless backend adds it).

---

## E. Seed accounts for UI testing

| Who | Login | Password |
|---|---|---|
| Super Admin | `osamakhan16708e@gmail.com` or `osamakhan` | `Osama@123` |
| Agency PK / BD | `agency_pk` / `agency_bd` | `Agency@123` |
| Hosts | `host_pk_1`, `host_pk_2`, `host_in_1`, `host_bd_1` | `Host@1234` |
| Demo user | `demo_user` | `Demo@1234` |

No seeded reseller — create via Admin. Catalog includes wallpaper **Night Sky** after Euro Live seed (or create one with `type: "wallpaper"`).

---

## F. What you should ship in the frontend (priority)

1. **Admin:** extend dashboard KPIs; Agencies; Hosts + protection badge; Countries + salary rules + periods + hours; Payout list (calculate → hold countdown → correct → release); Complaints queue + Master evidence/review; SOS queue; Freezes + Fraud; Backups settings/run; Official toggle on users/resellers; wallpaper catalog type.
2. **Agency portal:** login, dashboard shares, host roster. Stop there.
3. **Host (web or app shell):** login, dashboard, rooms (bg/kick/blacklist/staff), complaints, SOS, salary PIN + view + PIN reset OTP. Device list + freeze.
4. **App user:** login, report center, mute if room admin, devices, freeze. No live room video.
5. **Reseller:** add Official badge; SOS ack if flag on. Keep existing coin/catalog UI.

Use existing Admin/Reseller screens as-is for auth, coins, catalog (non-wallpaper), users ban, staff RBAC.

If an endpoint 404s, it is not implemented — do not fake it.
