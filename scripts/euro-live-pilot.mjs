#!/usr/bin/env node
/**
 * Euro Live Core pilot: calculate → hold → correct → release → complaint → SOS → audit
 * Requires the API running at BASE (default http://localhost:3000/api/v1).
 */
const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const ADMIN_LOGIN = process.env.SEED_ADMIN_EMAIL || 'osamakhan16708e@gmail.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Osama@123';

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data ?? json;
}

async function main() {
  const admin = await req('POST', '/admin/auth/login', {
    body: { login: ADMIN_LOGIN, password: ADMIN_PASSWORD },
  });
  const token = admin.accessToken;
  if (!token) throw new Error('Admin login failed');

  await req('PATCH', '/admin/countries/PK', { token, body: { payoutHoldDays: 0 } });

  const rules = await req('GET', '/admin/salary-rules?countryCode=PK', { token });
  let ruleId = (rules.items || rules)[0]?.id;
  if (!ruleId) {
    const rule = await req('POST', '/admin/salary-rules', {
      token,
      body: {
        countryCode: 'PK',
        name: 'PK Pilot',
        requiredHours: 10,
        requiredDays: 2,
        requiredBeans: 0,
        salaryAmount: 1000,
        bonusAmount: 200,
        agencySharePercent: 10,
      },
    });
    ruleId = rule.id;
  }

  const period = await req('POST', '/admin/salary/periods', {
    token,
    body: {
      label: `Pilot ${new Date().toISOString().slice(0, 10)}`,
      startsOn: '2026-09-01',
      endsOn: '2026-09-30',
    },
  });

  const hosts = await req('GET', '/admin/hosts?limit=20', { token });
  const pkHost = (hosts.items || []).find((h) => h.country === 'PK');
  if (!pkHost) throw new Error('No PK host seeded');

  await req('POST', `/admin/hosts/${pkHost.id}/hours`, {
    token,
    body: { periodId: period.id, liveHours: 40, liveDays: 7, beans: 100 },
  });

  const batch = await req('POST', '/admin/payouts/calculate', {
    token,
    body: { periodId: period.id },
  });
  await req('POST', `/admin/payouts/${batch.id}/approve-hold`, { token });

  const hostItem = (batch.items || []).find((i) => i.partyType === 'host' && i.partyId === pkHost.id);
  if (hostItem) {
    await req('POST', `/admin/payouts/${batch.id}/items/${hostItem.id}/correct`, {
      token,
      body: { newAmount: Number(hostItem.amount) + 50, reason: 'Pilot correction' },
    });
  }

  const released = await req('POST', `/admin/payouts/${batch.id}/release`, { token });
  if (released.status !== 'released') throw new Error('Release failed');

  const hostAuth = await req('POST', '/app/auth/login', {
    body: { login: 'host_pk_1', password: 'Host@1234', deviceId: 'pilot-device' },
  });
  await req('POST', '/host/salary/pin', { token: hostAuth.accessToken, body: { pin: '1234' } });
  await req('POST', '/host/salary/view', { token: hostAuth.accessToken, body: { pin: '1234' } });

  const room = await req('POST', '/host/rooms', {
    token: hostAuth.accessToken,
    body: { title: 'Pilot Room' },
  });

  const complaint = await req('POST', '/host/complaints', {
    token: hostAuth.accessToken,
    body: {
      targetId: pkHost.userId,
      targetType: 'user',
      summary: 'Pilot complaint',
      evidence: [{ type: 'image', url: 'https://example.com/evidence.png' }],
    },
  });
  await req('POST', `/admin/complaints/${complaint.id}/review`, {
    token,
    body: { action: 'confirm', note: 'Pilot review', salaryDeduct: false },
  });

  const sos = await req('POST', '/host/sos', {
    token: hostAuth.accessToken,
    body: { roomId: room.id, message: 'Pilot SOS' },
  });
  await req('POST', `/admin/sos/${sos.id}/ack`, { token });
  await req('POST', `/admin/sos/${sos.id}/resolve`, { token, body: { outcome: 'handled' } });

  const audit = await req('GET', '/admin/audit-logs?limit=5', { token });
  console.log(
    JSON.stringify(
      {
        ok: true,
        payout: released.id,
        complaint: complaint.caseNumber,
        sos: sos.caseNumber,
        auditRows: audit.meta?.total ?? audit.items?.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
