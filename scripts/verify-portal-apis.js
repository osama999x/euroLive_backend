const BASE = 'http://localhost:3000/api/v1';
const results = [];

function log(name, ok, extra) {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  → ' + extra : ''}`);
}

async function req(method, path, { token, body, expected } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  const statusOk = expected ? expected.includes(res.status) : res.ok;
  if (!statusOk) {
    const msg = json?.message ? JSON.stringify(json.message) : res.statusText;
    throw new Error(`${method} ${path} → ${res.status} ${msg}`);
  }
  return { status: res.status, json };
}

(async () => {
  try {
    const health = await req('GET', '/health', { expected: [200] });
    log('GET /health', health.json.status === 'ok', health.json.status);

    const ready = await req('GET', '/health/ready', { expected: [200] });
    log('GET /health/ready', ready.json.status === 'ok', ready.json.status);

    const login = await req('POST', '/admin/auth/login', {
      body: { login: 'osamakhan16708e@gmail.com', password: 'Osama@123' },
      expected: [200, 201],
    });
    const adminToken = login.json.data.accessToken;
    const adminRefresh = login.json.data.refreshToken;
    log('POST /admin/auth/login', Boolean(adminToken), `2fa=${login.json.data.requires2fa}`);
    if (!adminToken) throw new Error('admin login failed');

    const me = await req('GET', '/admin/auth/me', { token: adminToken, expected: [200] });
    log('GET /admin/auth/me', me.json.data.username === 'osamakhan', me.json.data.role);

    const dash = await req('GET', '/admin/dashboard', { token: adminToken, expected: [200] });
    log('GET /admin/dashboard', dash.json.success === true, `users=${dash.json.data.usersTotal}`);

    const roles = await req('GET', '/admin/roles', { token: adminToken, expected: [200] });
    log('GET /admin/roles', Array.isArray(roles.json.data) && roles.json.data.length >= 5, `count=${roles.json.data.length}`);

    const perms = await req('GET', '/admin/permissions', { token: adminToken, expected: [200] });
    log('GET /admin/permissions', Array.isArray(perms.json.data) && perms.json.data.length >= 1, `count=${perms.json.data.length}`);

    const staffList = await req('GET', '/admin/staff', { token: adminToken, expected: [200] });
    log('GET /admin/staff', Array.isArray(staffList.json.data), `count=${staffList.json.data.length}`);

    const stamp = Date.now();
    const staff = await req('POST', '/admin/staff', {
      token: adminToken,
      expected: [200, 201],
      body: {
        email: `support.${stamp}@kinglive.local`,
        username: `support_${stamp}`,
        password: 'Support@1234',
        roleSlugs: ['support'],
      },
    });
    log('POST /admin/staff', staff.json.data.roles.includes('support'), staff.json.data.id);

    const staffRoles = await req('PATCH', `/admin/staff/${staff.json.data.id}/roles`, {
      token: adminToken,
      expected: [200],
      body: { roleSlugs: ['moderator'] },
    });
    log('PATCH /admin/staff/:id/roles', staffRoles.json.data.roles.includes('moderator'));

    const user = await req('POST', '/admin/users', {
      token: adminToken,
      expected: [200, 201],
      body: {
        username: `fe_user_${stamp}`,
        displayName: 'Frontend Test User',
        country: 'PK',
      },
    });
    const userId = user.json.data.id;
    const publicId = user.json.data.publicId;
    log('POST /admin/users', Boolean(publicId), publicId);

    const users = await req('GET', `/admin/users?search=${publicId}`, { token: adminToken, expected: [200] });
    log('GET /admin/users', users.json.data.items.length >= 1, `total=${users.json.data.meta.total}`);

    const userGet = await req('GET', `/admin/users/${userId}`, { token: adminToken, expected: [200] });
    log('GET /admin/users/:id', userGet.json.data.id === userId);

    const banned = await req('PATCH', `/admin/users/${userId}/ban`, { token: adminToken, expected: [200] });
    log('PATCH /admin/users/:id/ban', banned.json.data.status === 'banned');

    const unbanned = await req('PATCH', `/admin/users/${userId}/unban`, { token: adminToken, expected: [200] });
    log('PATCH /admin/users/:id/unban', unbanned.json.data.status === 'active');

    const catalogCreate = await req('POST', '/admin/catalog', {
      token: adminToken,
      expected: [200, 201],
      body: {
        type: 'frame',
        name: `Doc Frame ${stamp}`,
        price: 50,
        resellerAccess: true,
        isActive: true,
        defaultExpiryDays: 7,
      },
    });
    const frameId = catalogCreate.json.data.id;
    log('POST /admin/catalog', Boolean(frameId), catalogCreate.json.data.name);

    const catalogList = await req('GET', '/admin/catalog?type=frame', { token: adminToken, expected: [200] });
    log('GET /admin/catalog', catalogList.json.data.items.length >= 1, `total=${catalogList.json.data.meta.total}`);

    const catalogGet = await req('GET', `/admin/catalog/${frameId}`, { token: adminToken, expected: [200] });
    log('GET /admin/catalog/:id', catalogGet.json.data.id === frameId);

    const catalogPatch = await req('PATCH', `/admin/catalog/${frameId}`, {
      token: adminToken,
      expected: [200],
      body: { price: 75 },
    });
    log('PATCH /admin/catalog/:id', catalogPatch.json.data.price === 75);

    const gold = catalogList.json.data.items.find((i) => i.name === 'Gold Frame') || catalogList.json.data.items[0];
    const entryList = await req('GET', '/admin/catalog?type=entry', { token: adminToken, expected: [200] });
    const badgeList = await req('GET', '/admin/catalog?type=badge', { token: adminToken, expected: [200] });
    const entryId = entryList.json.data.items[0]?.id;
    const badgeId = badgeList.json.data.items[0]?.id;
    log('seed catalog entry/badge', Boolean(entryId && badgeId), `entry=${entryId} badge=${badgeId}`);

    const resellerEmail = `reseller.doc.${stamp}@kinglive.local`;
    const resellerUser = `reseller_doc_${stamp}`;
    const reseller = await req('POST', '/admin/resellers', {
      token: adminToken,
      expected: [200, 201],
      body: {
        email: resellerEmail,
        username: resellerUser,
        password: 'Reseller@1234',
        displayName: 'Doc Reseller',
        creditLimit: 500,
        commissionRate: 10,
        initialBalance: 2000,
        permissions: {
          canRecharge: true,
          canAssignFrame: true,
          canAssignEntry: true,
          canAssignBadge: true,
          canRemove: true,
          canSetExpiry: true,
          dailyRechargeLimit: 5000,
          dailyFrameLimit: 50,
          dailyEntryLimit: 50,
          dailyBadgeLimit: 50,
        },
      },
    });
    const resellerId = reseller.json.data.id;
    log('POST /admin/resellers', Boolean(resellerId), resellerId);

    const resellerList = await req('GET', '/admin/resellers', { token: adminToken, expected: [200] });
    log('GET /admin/resellers', resellerList.json.data.items.length >= 1);

    const resellerGet = await req('GET', `/admin/resellers/${resellerId}`, { token: adminToken, expected: [200] });
    log('GET /admin/resellers/:id', resellerGet.json.data.id === resellerId);

    const resellerPatch = await req('PATCH', `/admin/resellers/${resellerId}`, {
      token: adminToken,
      expected: [200],
      body: { displayName: 'Doc Reseller Updated' },
    });
    log('PATCH /admin/resellers/:id', resellerPatch.json.data.displayName === 'Doc Reseller Updated');

    const resellerBal = await req('PATCH', `/admin/resellers/${resellerId}/balance`, {
      token: adminToken,
      expected: [200],
      body: { direction: 'credit', amount: 250, note: 'doc topup' },
    });
    log('PATCH /admin/resellers/:id/balance', Boolean(resellerBal.json.data.ledger), `amount=${resellerBal.json.data.ledger?.amount}`);

    const resellerPerms = await req('PATCH', `/admin/resellers/${resellerId}/permissions`, {
      token: adminToken,
      expected: [200],
      body: { canRecharge: true, canAssignFrame: true, canRemove: true },
    });
    log('PATCH /admin/resellers/:id/permissions', resellerPerms.json.data.permissions.canRecharge === true);

    const resellerLimits = await req('PATCH', `/admin/resellers/${resellerId}/limits`, {
      token: adminToken,
      expected: [200],
      body: { dailyRechargeLimit: 4000, dailyFrameLimit: 40 },
    });
    log('PATCH /admin/resellers/:id/limits', resellerLimits.json.data.permissions.dailyRechargeLimit === 4000);

    const creditLimit = await req('PATCH', `/admin/resellers/${resellerId}/credit-limit`, {
      token: adminToken,
      expected: [200],
      body: { creditLimit: 800 },
    });
    log('PATCH /admin/resellers/:id/credit-limit', creditLimit.json.data.creditLimit === 800);

    const walletAdj = await req('POST', '/admin/wallets/adjust', {
      token: adminToken,
      expected: [200, 201],
      body: {
        ownerType: 'user',
        ownerId: userId,
        currency: 'coin',
        direction: 'credit',
        amount: 100,
        note: 'doc user topup',
      },
    });
    log('POST /admin/wallets/adjust', walletAdj.json.data.amount === 100, walletAdj.json.data.type);

    const rLogin = await req('POST', '/reseller/auth/login', {
      expected: [200, 201],
      body: { login: resellerEmail, password: 'Reseller@1234' },
    });
    const rToken = rLogin.json.data.accessToken;
    const rRefresh = rLogin.json.data.refreshToken;
    log('POST /reseller/auth/login', Boolean(rToken));

    const rMe = await req('GET', '/reseller/auth/me', { token: rToken, expected: [200] });
    log('GET /reseller/auth/me', rMe.json.data.id === resellerId);

    const rDash = await req('GET', '/reseller/dashboard', { token: rToken, expected: [200] });
    log('GET /reseller/dashboard', rDash.json.data.wallet.coinBalance >= 0, `coins=${rDash.json.data.wallet.coinBalance}`);

    const rLimits = await req('GET', '/reseller/limits', { token: rToken, expected: [200] });
    log('GET /reseller/limits', Boolean(rLimits.json.data.permissions));

    const rCat = await req('GET', '/reseller/catalog?type=frame', { token: rToken, expected: [200] });
    log('GET /reseller/catalog', rCat.json.data.items.length >= 1);

    const lookup = await req('GET', `/reseller/users/${publicId}`, { token: rToken, expected: [200] });
    log('GET /reseller/users/:publicId', lookup.json.data.publicId === publicId, `coins=${lookup.json.data.coinBalance}`);

    const transfer = await req('POST', '/reseller/coins/transfer', {
      token: rToken,
      expected: [200, 201],
      body: { publicId, amount: 120, idempotencyKey: `doc-transfer-${stamp}` },
    });
    log('POST /reseller/coins/transfer', transfer.json.data.debit.amount === 120);

    const transferReplay = await req('POST', '/reseller/coins/transfer', {
      token: rToken,
      expected: [200, 201],
      body: { publicId, amount: 120, idempotencyKey: `doc-transfer-${stamp}` },
    });
    log('POST /reseller/coins/transfer idempotent', transferReplay.json.data.debit.id === transfer.json.data.debit.id);

    const assignFrame = await req('POST', '/reseller/frames/assign', {
      token: rToken,
      expected: [200, 201],
      body: { publicId, catalogItemId: gold.id, duration: '7' },
    });
    const assignedId = assignFrame.json.data.id;
    log('POST /reseller/frames/assign', assignFrame.json.data.itemType === 'frame', assignedId);

    const assignEntry = await req('POST', '/reseller/entries/assign', {
      token: rToken,
      expected: [200, 201],
      body: { publicId, catalogItemId: entryId, duration: '30' },
    });
    log('POST /reseller/entries/assign', assignEntry.json.data.itemType === 'entry');

    const assignBadge = await req('POST', '/reseller/badges/assign', {
      token: rToken,
      expected: [200, 201],
      body: { publicId, catalogItemId: badgeId, duration: 'permanent' },
    });
    log('POST /reseller/badges/assign', assignBadge.json.data.itemType === 'badge');

    const removed = await req('DELETE', `/reseller/items/${assignedId}`, { token: rToken, expected: [200] });
    log('DELETE /reseller/items/:id', removed.json.data.status === 'removed');

    const txs = await req('GET', '/reseller/transactions?page=1&limit=10', { token: rToken, expected: [200] });
    log('GET /reseller/transactions', txs.json.data.items.length >= 1);

    const sales = await req('GET', '/reseller/reports/sales', { token: rToken, expected: [200] });
    log('GET /reseller/reports/sales', sales.json.data.total >= 0, `total=${sales.json.data.total}`);

    const comm = await req('GET', '/reseller/reports/commission', { token: rToken, expected: [200] });
    log('GET /reseller/reports/commission', comm.json.data.commissionRate === 10, `commission=${comm.json.data.commission}`);

    const audit = await req('GET', '/admin/audit-logs?page=1&limit=20', { token: adminToken, expected: [200] });
    log('GET /admin/audit-logs', audit.json.data.items.length >= 1, `total=${audit.json.data.meta.total}`);

    const refreshed = await req('POST', '/auth/refresh', {
      expected: [200, 201],
      body: { refreshToken: adminRefresh },
    });
    log('POST /auth/refresh', Boolean(refreshed.json.data.accessToken));

    const loggedOut = await req('POST', '/auth/logout', {
      expected: [200],
      body: { refreshToken: rRefresh },
    });
    log('POST /auth/logout', loggedOut.json.data.revoked === true);

    const setup = await req('POST', '/admin/auth/2fa/setup', { token: adminToken, expected: [200, 201] });
    log('POST /admin/auth/2fa/setup', Boolean(setup.json.data.secret && setup.json.data.otpauthUrl));

    const catalogDel = await req('DELETE', `/admin/catalog/${frameId}`, { token: adminToken, expected: [200] });
    log('DELETE /admin/catalog/:id', catalogDel.json.data.deleted === true);

    const denied = await fetch(`${BASE}/admin/dashboard`).then((r) => r.json());
    log('unauthenticated admin blocked', denied.success === false && denied.statusCode === 401, String(denied.statusCode));

    const resellerOnAdmin = await fetch(`${BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${rToken}` },
    }).then((r) => r.json());
    log('reseller cannot hit admin', resellerOnAdmin.success === false, String(resellerOnAdmin.statusCode));

    const failed = results.filter((r) => !r.ok);
    console.log('\n---');
    console.log(`passed=${results.filter((r) => r.ok).length} failed=${failed.length} total=${results.length}`);
    if (failed.length) {
      failed.forEach((f) => console.log('FAIL', f.name, f.extra || ''));
      process.exit(1);
    }
  } catch (err) {
    console.error('ERROR', err.message);
    console.log('\n---');
    console.log(`passed=${results.filter((r) => r.ok).length} failed=${results.filter((r) => !r.ok).length + 1}`);
    process.exit(1);
  }
})();
