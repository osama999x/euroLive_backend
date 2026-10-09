# Frontend prompt — Admin user Ban (ID / Device / Live)

Copy everything below the line into the Admin portal frontend chat. Backend is already live at `/api/v1`. Do not invent routes. Do not keep calling `PATCH /admin/users/:id/ban` for this modal.

---

You are updating the **Admin Users → user detail Ban modal** (the screen that currently has Ban / Unban only). Wire it to the NestJS API. Base URL: `http://localhost:3000/api/v1`. Envelope: `{ success, statusCode, message, data }`. Read **`data`**. Extra JSON fields are rejected (400). Auth: staff JWT `Authorization: Bearer <accessToken>`. Roles: `super_admin|admin|moderator` can create/revoke; `support` can list only.

## Replace the old Ban / Unban buttons

| Stop using for this UI | Keep |
|---|---|
| `PATCH /admin/users/:id/ban` (legacy permanent ID only) | `PATCH /admin/users/:id/unban` = lift **all active ID bans** |

## APIs

`GET /admin/users/:id` now includes:

```json
{
  "id": "uuid",
  "publicId": "54577261",
  "username": "Haider",
  "displayName": "Haidershah",
  "status": "active",
  "idBanned": false,
  "idBannedUntil": null,
  "liveBanned": false,
  "liveBannedUntil": null
}
```

`status` is `banned` only while an **ID** ban is active. A live-banned host stays `active`.

`GET /admin/users/:id/devices` → array:

```json
{
  "id": "uuid",
  "deviceId": "string",
  "deviceName": "string|null",
  "lastSeenAt": "ISO",
  "isNew": false,
  "banned": false,
  "bannedUntil": null
}
```

`GET /admin/users/:id/bans` → history, newest first:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "deviceId": "string|null",
  "type": "id|device|live",
  "reason": "string|null",
  "startsAt": "ISO",
  "expiresAt": "ISO|null",
  "revokedAt": "ISO|null",
  "createdById": "uuid",
  "createdAt": "ISO"
}
```

Active = `revokedAt == null` AND (`expiresAt == null` OR `expiresAt` in the future).

`POST /admin/users/:id/bans` body (whitelist only these keys):

```json
{
  "type": "id",
  "duration": "24h",
  "customHours": 12,
  "reason": "optional",
  "deviceId": "required when type=device",
  "includeDevices": false
}
```

- `type`: `id` | `device` | `live`
- `duration`: `1h` | `24h` | `7d` | `30d` | `permanent` | `custom`
- `customHours`: integer ≥ 1, **required** when `duration=custom`. Omit otherwise.
- `deviceId`: **required** when `type=device`. Take it from the devices list, not the row `id`.
- `includeDevices`: only for `type=id`. If true, also bans every known device for the same duration.

Response `data`: `{ bans: [...created rows], user: { ...decorated user } }`.

`POST /admin/users/:id/bans/:banId/revoke` — empty body. Lifts that one row (ID, device, or live).

## Modal UX (match the Ban screenshot)

Three actions, not a single Ban button:

1. **ID Ban**
   - Duration picker: 1 hour / 24 hours / 7 days / 30 days / Permanent / Custom hours
   - Optional reason
   - Checkbox **Also ban all known devices** → `includeDevices: true`
   - Submit `POST .../bans` `{ type: "id", duration, customHours?, reason?, includeDevices }`
   - After success, user `status` is `banned`; show Unban (calls `PATCH .../unban`)

2. **Device Ban**
   - Load `GET .../devices` first. If empty, show “No devices recorded — user must log in from the app with deviceId”
   - Pick a device (label = `deviceName` or `deviceId`; badge if `banned`)
   - Same duration picker + reason
   - Submit `{ type: "device", duration, customHours?, reason?, deviceId: selected.deviceId }`
   - Do **not** set user status to banned. Login from other devices still works.

3. **Live Streaming Ban**
   - Same duration picker + reason
   - Submit `{ type: "live", duration, customHours?, reason? }`
   - User can still log in. Host **Go Live** / `POST /host/rooms` returns 403 `"Live streaming is banned until ..."` and open rooms are closed.

Show current state on the profile header:
- ID banned until `idBannedUntil` (or Permanent if `idBanned && !idBannedUntil`)
- Live banned until `liveBannedUntil`
- Per-device banned badges from the devices list

Ban history table under the modal: type, deviceId, reason, starts, expires (Permanent if null), status Active/Expired/Revoked, Revoke button → `POST .../bans/:banId/revoke`.

## Effects you must not break

| Ban | Login | Go live |
|---|---|---|
| ID | 403 | n/a |
| Device (this deviceId) | 403 even on a new account | n/a |
| Live | allowed | 403 |

App login must send `deviceId` or device bans cannot be enforced. Host UI: `GET /app/auth/me` or `GET /host/dashboard` has `liveBanned` / `liveBannedUntil` — disable Go Live and show the until date; still handle 403.

Do not add other ban types. Do not send `status` in the body. Do not use multipart. After each mutate, refetch `:id`, `:id/bans`, and `:id/devices`.
