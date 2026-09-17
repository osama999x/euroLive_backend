# King Live — Frontend API Implementation Guide

**Verified:** 17 Sep 2026 against `http://localhost:3000/api/v1` (51/51 portal endpoints passing).

This document is for the **Master Admin portal** and **Reseller portal** only. Agency portal, Flutter consumer auth, live rooms, gifts, PK, withdrawals, and presence are **not shipped yet** — do not build UI against those.

Interactive explorer: `http://localhost:3000/api-docs` (HTTP Basic: `admin` / `admin123`).

---

## 1. Base URL & clients

| Environment | Base URL |
|---|---|
| Local | `http://localhost:3000/api/v1` |
| Socket.IO (not needed for portals yet) | `ws://localhost:3000/live` |

Use **two separate frontend apps** (or two route trees) with two auth stores:

| Portal | `accountType` in JWT | Token storage key (suggested) |
|---|---|---|
| Admin | `staff` | `kl_admin_access` / `kl_admin_refresh` |
| Reseller | `reseller` | `kl_reseller_access` / `kl_reseller_refresh` |

Do **not** reuse an admin token on reseller routes, or the reverse. Admin token on a reseller route → `403`. Missing token → `401`.

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 2. Envelope (every JSON API except Health)

Success:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2026-09-17T09:07:00.000Z"
}
```

Error:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "User not found",
  "errors": "Bad Request",
  "timestamp": "2026-09-17T09:07:00.000Z",
  "path": "/api/v1/admin/users/..."
}
```

Notes for UI:

- Read **`data`**, not the root, for payload.
- `message` can be a **string or string[]** (validation errors come back as an array).
- `POST` create/login usually returns **HTTP 201** with `statusCode: 201` inside the body. Treat 200 and 201 as success.
- Health endpoints are **not** wrapped in this envelope.

### Pagination

List endpoints that paginate return:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 26,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

Query: `?page=1&limit=20` (`limit` max 100).

---

## 3. Auth

### 3.1 Tokens

| Token | Lifetime | Use |
|---|---|---|
| `accessToken` | 15 minutes | All authenticated HTTP calls |
| `refreshToken` | 7 days | `POST /auth/refresh` only — **one-time**; each refresh **rotates** (old refresh is revoked) |
| `challengeToken` | 5 minutes | Staff 2FA step only. Not a Bearer access token. |

On **401 Invalid or expired token**:

1. Call `POST /auth/refresh` with the stored refresh token.
2. Save the new pair.
3. Retry the original request once.
4. If refresh fails → logout and send the user to login.

Logout: `POST /auth/logout` with `{ "refreshToken" }` then clear storage.

Shared auth routes (no Bearer required):

| Method | Path | Body |
|---|---|---|
| POST | `/auth/refresh` | `{ "refreshToken": "..." }` |
| POST | `/auth/logout` | `{ "refreshToken": "..." }` |

Refresh response `data`:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": "15m"
}
```

---

### 3.2 Admin login

`POST /admin/auth/login`

```json
{ "login": "osamakhan16708e@gmail.com", "password": "Osama@123" }
```

`login` can be **email or username**. Password min 8 chars.

**A — 2FA off (current seed):**

```json
{
  "requires2fa": false,
  "staff": {
    "id": "uuid",
    "email": "osamakhan16708e@gmail.com",
    "username": "osamakhan",
    "totpEnabled": false,
    "status": "active",
    "roles": ["super_admin"],
    "role": "super_admin",
    "createdAt": "..."
  },
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": "15m"
}
```

**B — 2FA on:**

```json
{
  "requires2fa": true,
  "challengeToken": "..."
}
```

Then `POST /admin/auth/2fa/verify`:

```json
{ "challengeToken": "...", "code": "123456" }
```

Response shape is the same as A (`requires2fa: false` + tokens + `staff`).

Invalid credentials → `401` `"Invalid credentials"`.

### 3.3 Admin session & 2FA management (Bearer staff)

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/auth/me` | Same `staff` object as login |
| POST | `/admin/auth/2fa/setup` | Returns `{ "secret", "otpauthUrl" }`. Show QR from `otpauthUrl`. Does **not** enable 2FA yet. |
| POST | `/admin/auth/2fa/enable` | `{ "code": "123456" }` after user scans QR |
| POST | `/admin/auth/2fa/disable` | `{ "code": "123456" }` |

### 3.4 Reseller login

`POST /reseller/auth/login`

```json
{ "login": "reseller@example.com", "password": "Reseller@1234" }
```

Response `data`:

```json
{
  "reseller": { "...public reseller object..." },
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "expiresIn": "15m"
}
```

`GET /reseller/auth/me` — public reseller object (no tokens).

### 3.5 Forgot password (Admin and Reseller)

Same 3-step flow on both portals. No Bearer token. OTP is emailed via Gmail SMTP and expires in **10 minutes**. Always returns `sent: true` even if the login is unknown (do not tell the user whether the account exists). Max 5 OTP checks. Resend is internally throttled to once per 60 seconds.

| Step | Admin | Reseller |
|---|---|---|
| 1. Request OTP | `POST /admin/auth/forgot-password` | `POST /reseller/auth/forgot-password` |
| 2. Confirm OTP (optional, enables “Next”) | `POST /admin/auth/verify-otp` | `POST /reseller/auth/verify-otp` |
| 3. Set new password | `POST /admin/auth/reset-password` | `POST /reseller/auth/reset-password` |

**1 — forgot-password** `{ "login": "email-or-username" }`

```json
{ "sent": true, "expiresInSeconds": 600 }
```

**2 — verify-otp** `{ "login": "...", "otp": "123456" }`

```json
{ "valid": true }
```

Invalid/expired → `400` `"Invalid or expired OTP"`. Too many tries → `400` `"Too many invalid attempts. Request a new OTP."`

**3 — reset-password**

```json
{
  "login": "osamakhan16708e@gmail.com",
  "otp": "123456",
  "newPassword": "NewPass@1234"
}
```

`newPassword` min 8 characters. Success:

```json
{ "reset": true }
```

This **revokes all refresh tokens** for that account. Send the user to login with the new password. Mail send failure → `502` `"Could not send reset email. Try again in a minute."`

Suggested UI: Login → Forgot password → enter email → “Check your inbox” (60s resend timer) → 6-digit OTP → new password + confirm → Login.

---

## 4. Roles, permissions, UI gating

### Staff roles (`role` / `roles[]`)

| Slug | Typical screens |
|---|---|
| `super_admin` | Everything (bypasses role checks) |
| `admin` | Users, resellers, catalog, wallets, audit, dashboard |
| `finance` | Dashboard, resellers (read + balance/credit), wallet adjust |
| `support` | Dashboard, users (create/search) |
| `moderator` | Dashboard, users (search/ban) |

Hide nav items the user’s `roles` cannot access. The API still enforces this (`403 Insufficient role`).

### Reseller flags (`permissions` on the reseller object)

Gate buttons in the reseller portal:

| Flag | Feature |
|---|---|
| `canRecharge` | Coin transfer |
| `canAssignFrame` | Assign frames |
| `canAssignEntry` | Assign entries |
| `canAssignBadge` | Assign badges |
| `canRemove` | Remove an assignment |
| `canSetExpiry` | Honour `duration` / `customDays` on assign. If `false`, backend uses the catalog item’s `defaultExpiryDays` (or permanent). |
| `dailyRechargeLimit` etc. | `null` = unlimited. Show as read-only on Limits screen. |

Missing flag on a write → `403` e.g. `"Missing permission: recharge"`.

---

## 5. Enums (use these exact strings)

```ts
type StaffRole = 'super_admin' | 'admin' | 'finance' | 'support' | 'moderator';
type AccountStatus = 'active' | 'disabled' | 'banned';
type UserStatus = 'active' | 'banned';
type CatalogType = 'frame' | 'entry' | 'badge';
type AssignDuration = '1' | '7' | '30' | 'custom' | 'permanent';
type LedgerDirection = 'credit' | 'debit';
type WalletOwnerType = 'user' | 'reseller';
type WalletCurrency = 'coin' | 'diamond';
type UserItemStatus = 'active' | 'expired' | 'removed';
```

Balances and prices are **integers** (coins). Never send floats.

Consumer **publicId** is an 8-digit string (e.g. `"10000001"`). Resellers search/assign by **publicId**, not UUID. Admin user APIs use **UUID** `id`.

---

## 6. Admin module map

All routes below require `Authorization: Bearer <staff accessToken>` unless marked public.

### 6.1 Dashboard

`GET /admin/dashboard`

```json
{
  "dau": 0,
  "mau": 0,
  "revenue": 0,
  "activeRooms": 0,
  "pendingWithdrawals": 0,
  "flaggedReports": 0,
  "usersTotal": 3,
  "usersBanned": 0,
  "resellersTotal": 1,
  "coinsInCirculation": 220
}
```

`dau` / `mau` / `revenue` / rooms / withdrawals / reports are **placeholders (0)** until those modules exist. Use `usersTotal`, `usersBanned`, `resellersTotal`, `coinsInCirculation` as real KPIs.

### 6.2 Consumer users

| Method | Path | Body / query |
|---|---|---|
| POST | `/admin/users` | `{ username, displayName, email?, phone?, country? }` |
| GET | `/admin/users` | `page`, `limit`, `search?`, `status?=active\|banned` |
| GET | `/admin/users/:id` | UUID |
| PATCH | `/admin/users/:id/ban` | empty |
| PATCH | `/admin/users/:id/unban` | empty |

Create response (inside `data`) — this is the object to show after “Create user”:

```json
{
  "id": "uuid",
  "publicId": "90171314",
  "username": "fe_user_...",
  "displayName": "Frontend Test User",
  "email": null,
  "phone": null,
  "country": "PK",
  "gender": null,
  "bio": null,
  "avatarUrl": null,
  "status": "active",
  "deviceIds": [],
  "createdAt": "...",
  "updatedAt": "...",
  "deletedAt": null
}
```

Show **publicId** prominently — resellers need it to transfer coins / assign items.

### 6.3 Resellers

Public reseller object (list/get/create/update all use this shape):

```json
{
  "id": "uuid",
  "email": "reseller.doc@kinglive.local",
  "username": "reseller_doc",
  "displayName": "Doc Reseller",
  "creditLimit": 800,
  "commissionRate": 10,
  "status": "active",
  "permissions": {
    "canRecharge": true,
    "canAssignFrame": true,
    "canAssignEntry": true,
    "canAssignBadge": true,
    "canRemove": true,
    "canSetExpiry": true,
    "dailyRechargeLimit": 4000,
    "dailyFrameLimit": 40,
    "dailyEntryLimit": 50,
    "dailyBadgeLimit": 50
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

| Method | Path | Body |
|---|---|---|
| POST | `/admin/resellers` | See create payload below |
| GET | `/admin/resellers` | `page`, `limit`, `search?`, `status?=active\|disabled\|banned` |
| GET | `/admin/resellers/:id` | |
| PATCH | `/admin/resellers/:id` | `{ email?, displayName?, status? }` |
| PATCH | `/admin/resellers/:id/balance` | `{ "direction": "credit"\|"debit", "amount": 250, "note?", "idempotencyKey?" }` |
| PATCH | `/admin/resellers/:id/permissions` | any subset of permission booleans + daily limits |
| PATCH | `/admin/resellers/:id/limits` | `{ dailyRechargeLimit?, dailyFrameLimit?, dailyEntryLimit?, dailyBadgeLimit? }` |
| PATCH | `/admin/resellers/:id/credit-limit` | `{ "creditLimit": 800 }` |

Create body:

```json
{
  "email": "reseller@kinglive.local",
  "username": "reseller1",
  "password": "Reseller@1234",
  "displayName": "Lahore Reseller",
  "creditLimit": 500,
  "commissionRate": 10,
  "initialBalance": 2000,
  "permissions": {
    "canRecharge": true,
    "canAssignFrame": true,
    "canAssignEntry": true,
    "canAssignBadge": true,
    "canRemove": true,
    "canSetExpiry": true,
    "dailyRechargeLimit": 5000,
    "dailyFrameLimit": 50,
    "dailyEntryLimit": 50,
    "dailyBadgeLimit": 50
  }
}
```

- `password` is write-only. It is never returned.
- `initialBalance` credits the reseller wallet once at create.
- Balance adjust `data` is `{ "reseller": {...}, "ledger": {...} }` — refresh the wallet from dashboard/ledger, not from the public reseller object (that object has **creditLimit**, not coin balance).
- Daily limits: omit or `null` = unlimited. `0` means none allowed.

### 6.4 Catalog (frames / entries / badges)

One resource, filtered by `type`.

| Method | Path | Body / query |
|---|---|---|
| POST | `/admin/catalog` | create body |
| GET | `/admin/catalog` | `page`, `limit`, `type?=frame\|entry\|badge` |
| GET | `/admin/catalog/:id` | |
| PATCH | `/admin/catalog/:id` | any subset of fields except `type` |
| DELETE | `/admin/catalog/:id` | soft delete → `{ "deleted": true }` |

Create:

```json
{
  "type": "frame",
  "name": "Gold Frame",
  "description": "Optional",
  "assetUrl": "https://cdn.example.com/gold-frame.webp",
  "price": 100,
  "isActive": true,
  "resellerAccess": true,
  "eligibility": "all",
  "defaultExpiryDays": 7
}
```

| Field | UI meaning |
|---|---|
| `resellerAccess` | If `false`, resellers cannot assign it (it will not appear on `GET /reseller/catalog`) |
| `price` | Coins debited from the **reseller wallet** on assign. `0` = free assign |
| `defaultExpiryDays` | Used when reseller cannot set expiry. Omit for permanent |
| `assetUrl` | Preview image / Lottie URL in admin + reseller pickers |

Seeded demo items (already in DB): **Gold Frame**, **Lion Entry**, **Verified Badge**.

### 6.5 Wallets (manual adjust)

`POST /admin/wallets/adjust`

```json
{
  "ownerType": "user",
  "ownerId": "<user uuid or reseller uuid>",
  "currency": "coin",
  "direction": "credit",
  "amount": 100,
  "note": "Compensation",
  "idempotencyKey": "optional-unique-string"
}
```

`ownerType`: `user` | `reseller`. `ownerId` is the **UUID**, not publicId.

Use the same `idempotencyKey` if the user double-clicks Save — the ledger row is reused, not duplicated.

For reseller top-ups you can also use `PATCH /admin/resellers/:id/balance` (coins only).

### 6.6 Staff & RBAC (super_admin)

| Method | Path | Body |
|---|---|---|
| GET | `/admin/roles` | role catalog |
| GET | `/admin/permissions` | permission catalog (module slugs) |
| GET | `/admin/staff` | array of staff public objects |
| POST | `/admin/staff` | `{ email, username, password, roleSlugs: ["support"] }` |
| PATCH | `/admin/staff/:id/roles` | `{ "roleSlugs": ["moderator"] }` |

`roleSlugs` must match: `super_admin`, `admin`, `finance`, `support`, `moderator`.

Staff login uses the same `/admin/auth/login` as Super Admin.

### 6.7 Audit log

`GET /admin/audit-logs?page=1&limit=20&action=&actorId=`

```json
{
  "id": "uuid",
  "actorType": "staff",
  "actorId": "uuid",
  "action": "reseller.coins.transfer",
  "targetType": "user",
  "targetId": "uuid",
  "before": null,
  "after": {},
  "ip": "...",
  "userAgent": "...",
  "createdAt": "..."
}
```

Useful `action` filters: `user.create`, `user.ban`, `user.unban`, `reseller.create`, `reseller.update`, `reseller.permissions`, `reseller.balance`, `reseller.coins.transfer`, `reseller.frame.assign`, `reseller.entry.assign`, `reseller.badge.assign`, `reseller.item.remove`, `catalog.create`, `catalog.update`, `catalog.delete`, `wallet.adjust`, `staff.create`, `staff.roles`.

---

## 7. Reseller module map

Bearer = reseller access token.

### 7.1 Dashboard

`GET /reseller/dashboard`

```json
{
  "reseller": { "...public reseller..." },
  "wallet": {
    "coinBalance": 2250,
    "diamondBalance": 0,
    "creditLimit": 800,
    "available": 3050
  },
  "today": {
    "coinTransfers": 120,
    "itemAssignments": 2
  }
}
```

`available` = `coinBalance + creditLimit`. Transfer/assign may go negative down to `-creditLimit`.

### 7.2 Limits (read-only)

`GET /reseller/limits`

```json
{
  "permissions": { "...flags + daily*Limit..." },
  "usageToday": {
    "recharge": 120,
    "frame": 1,
    "entry": 1,
    "badge": 1
  }
}
```

Show as progress: `usageToday.recharge / permissions.dailyRechargeLimit` (if limit is not null).

### 7.3 Catalog picker

`GET /reseller/catalog?type=frame&page=1&limit=20`

Only **active + resellerAccess** items. Use this list for assign dropdowns, not the admin catalog.

### 7.4 User lookup (before any transfer/assign)

`GET /reseller/users/:publicId`

```json
{
  "id": "uuid",
  "publicId": "10000001",
  "username": "demo_user",
  "displayName": "Demo User",
  "country": "PK",
  "status": "active",
  "coinBalance": 100
}
```

If `status === "banned"` disable Transfer / Assign. API will also reject writes with `403 User is banned`.

Seeded demo user: **publicId `10000001`**, username `demo_user`.

### 7.5 Coin transfer

`POST /reseller/coins/transfer`

```json
{
  "publicId": "10000001",
  "amount": 120,
  "idempotencyKey": "ui-uuid-or-stable-id"
}
```

Always send a **new UUID `idempotencyKey` per user click**, and reuse that same key if you retry the request. Duplicate key returns the original ledger ids (safe retry).

Response `data`: `{ "user": { id, publicId, username }, "debit": <ledger>, "credit": <ledger> }`.

Errors to toast:

- `Insufficient balance`
- `Daily recharge limit exceeded`
- `Recharge permission denied`
- `User not found` / `User is banned`

### 7.6 Assign frame / entry / badge

```
POST /reseller/frames/assign
POST /reseller/entries/assign
POST /reseller/badges/assign
```

Same body:

```json
{
  "publicId": "10000001",
  "catalogItemId": "uuid-from-reseller-catalog",
  "duration": "7",
  "customDays": 14
}
```

| `duration` | Expiry |
|---|---|
| `"1"` / `"7"` / `"30"` | that many days |
| `"custom"` | requires `customDays` ≥ 1 |
| `"permanent"` | `expiresAt: null` |

If `canSetExpiry` is false, ignore duration in the UI (or still send it; server overwrites).

Paid items debit `item.price` from the reseller wallet (`ITEM_ASSIGN` ledger).

### 7.7 Remove assignment

`DELETE /reseller/items/:id`

`:id` is the **assignment id** returned from assign (`user_items.id`), not the catalog id.

Reseller can only remove items **they** assigned. Response `status` becomes `"removed"`.

### 7.8 History & reports

| Method | Path | Query |
|---|---|---|
| GET | `/reseller/transactions` | `page`, `limit` — reseller wallet ledger |
| GET | `/reseller/reports/sales` | `from?`, `to?` ISO datetimes |
| GET | `/reseller/reports/commission` | same |

Sales `data`:

```json
{
  "from": null,
  "to": null,
  "coinTransfers": 120,
  "itemSales": 400,
  "total": 520,
  "count": 4
}
```

Commission adds `commissionRate` (percent) and `commission` (`floor(total * rate / 100)`).

---

## 8. Suggested portal screens → APIs

### Admin portal

| Screen | APIs |
|---|---|
| Login (+ 2FA step) | `POST /admin/auth/login`, `POST /admin/auth/2fa/verify` |
| Forgot / reset password | `POST /admin/auth/forgot-password`, `verify-otp`, `reset-password` |
| Shell / session | `GET /admin/auth/me`, `POST /auth/refresh`, `POST /auth/logout` |
| Dashboard | `GET /admin/dashboard` |
| Users list / search | `GET /admin/users` |
| Create user | `POST /admin/users` |
| User detail | `GET /admin/users/:id`, ban/unban, `POST /admin/wallets/adjust` |
| Resellers list | `GET /admin/resellers` |
| Create reseller | `POST /admin/resellers` |
| Reseller detail | get + patch profile/permissions/limits/credit-limit/balance |
| Catalog tabs (Frame/Entry/Badge) | `GET/POST /admin/catalog?type=`, patch, delete |
| Staff & roles | `/admin/staff`, `/admin/roles`, `/admin/staff/:id/roles` |
| Audit | `GET /admin/audit-logs` |
| Security (own 2FA) | `/admin/auth/2fa/*` |

### Reseller portal

| Screen | APIs |
|---|---|
| Login | `POST /reseller/auth/login` |
| Forgot / reset password | `POST /reseller/auth/forgot-password`, `verify-otp`, `reset-password` |
| Dashboard | `GET /reseller/dashboard` |
| Transfer coins | lookup user → `POST /reseller/coins/transfer` |
| Assign frame/entry/badge | `GET /reseller/catalog?type=` → assign POST |
| Remove item | `DELETE /reseller/items/:id` (from your assignment history if you store it client-side, or from transactions metadata) |
| Transactions | `GET /reseller/transactions` |
| Sales / commission | `/reseller/reports/sales`, `/reseller/reports/commission` |
| My limits | `GET /reseller/limits` |

---

## 9. Health (ops / splash, not wrapped)

| Method | Path | Success |
|---|---|---|
| GET | `/health` | `{ "status": "ok", "service": "king-queen-live", ... }` |
| GET | `/health/ready` | Terminus `{ "status": "ok", "info": { "postgres": ..., "redis": ... } }` |

---

## 10. HTTP status cheat sheet

| Code | Meaning |
|---|---|
| 200 / 201 | OK — read `data` |
| 400 | Validation or business rule (`Insufficient balance`, bad UUID, extra fields) |
| 401 | Missing/expired token or bad login |
| 403 | Wrong portal, missing role, missing reseller flag, banned user, daily limit |
| 404 | User / reseller / catalog / assignment not found |
| 409 | Duplicate email/username |

---

## 11. Out of scope (do not implement against this API yet)

- Flutter app auth / OTP / profile
- Agency portal
- Live rooms, PK, gifts, chat, leaderboards
- Host withdrawals
- Push / broadcasts
- Camera-presence admin rules

Socket.IO namespace `/live` currently only answers `ping` → `pong`. Do not wire gift/comment UI to it yet.

---

## 12. Dev credentials

Seeded Super Admin (created on first boot from server env):

| Field | Value |
|---|---|
| Email / login | `osamakhan16708e@gmail.com` |
| Username | `osamakhan` |
| Password | `Osama@123` |
| Role | `super_admin` |

Seeded consumer for reseller testing: publicId **`10000001`**.

Create resellers via Admin UI / `POST /admin/resellers` — there is no seeded reseller login.

If these were rotated, ask backend for current `SEED_ADMIN_*` values. Do not commit production passwords into the frontend repo.
