import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AssignDuration, CatalogItemType } from '../src/common/enums';

describe('Portal APIs (e2e)', () => {
  let app: INestApplication;
  let adminAccess: string;
  let resellerAccess: string;
  let resellerId: string;
  let frameId: string;
  let assignedItemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('logs in as seeded super admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ login: 'admin@kinglive.local', password: 'ChangeMe@Admin1' })
      .expect(201);

    expect(res.body.data.requires2fa).toBe(false);
    expect(res.body.data.accessToken).toBeDefined();
    adminAccess = res.body.data.accessToken;
  });

  it('loads admin dashboard KPIs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);

    expect(res.body.data.usersTotal).toBeGreaterThanOrEqual(1);
  });

  it('creates a reseller with recharge and frame permissions', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/resellers')
      .set('Authorization', `Bearer ${adminAccess}`)
      .send({
        email: `reseller.e2e.${Date.now()}@kinglive.local`,
        username: `reseller_e2e_${Date.now()}`,
        password: 'Reseller@1234',
        displayName: 'E2E Reseller',
        creditLimit: 500,
        commissionRate: 10,
        initialBalance: 1000,
        permissions: {
          canRecharge: true,
          canAssignFrame: true,
          canAssignEntry: true,
          canAssignBadge: true,
          canRemove: true,
          canSetExpiry: true,
          dailyRechargeLimit: 5000,
          dailyFrameLimit: 50,
        },
      })
      .expect(201);

    resellerId = res.body.data.id;
    expect(resellerId).toBeDefined();
    expect(res.body.data.permissions.canRecharge).toBe(true);
  });

  it('lists catalog frames and picks the seed frame', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/catalog')
      .query({ type: CatalogItemType.FRAME })
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);

    const frame = res.body.data.items.find((item: { name: string }) => item.name === 'Gold Frame');
    expect(frame).toBeDefined();
    frameId = frame.id;
  });

  it('logs in as the reseller', async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/v1/admin/resellers/${resellerId}`)
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/v1/reseller/auth/login')
      .send({ login: list.body.data.email, password: 'Reseller@1234' })
      .expect(201);

    resellerAccess = res.body.data.accessToken;
    expect(resellerAccess).toBeDefined();
  });

  it('transfers coins to the seeded demo user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/reseller/coins/transfer')
      .set('Authorization', `Bearer ${resellerAccess}`)
      .send({
        publicId: '10000001',
        amount: 150,
        idempotencyKey: `e2e-transfer-${Date.now()}`,
      })
      .expect(201);

    expect(res.body.data.debit.amount).toBe(150);
    expect(res.body.data.credit.amount).toBe(150);
  });

  it('replays an identical transfer via idempotency key', async () => {
    const key = `e2e-idem-${Date.now()}`;
    const first = await request(app.getHttpServer())
      .post('/api/v1/reseller/coins/transfer')
      .set('Authorization', `Bearer ${resellerAccess}`)
      .send({ publicId: '10000001', amount: 10, idempotencyKey: key })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/reseller/coins/transfer')
      .set('Authorization', `Bearer ${resellerAccess}`)
      .send({ publicId: '10000001', amount: 10, idempotencyKey: key })
      .expect(201);

    expect(second.body.data.debit.id).toBe(first.body.data.debit.id);
  });

  it('assigns a frame to the demo user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/reseller/frames/assign')
      .set('Authorization', `Bearer ${resellerAccess}`)
      .send({
        publicId: '10000001',
        catalogItemId: frameId,
        duration: AssignDuration.DAYS_7,
      })
      .expect(201);

    assignedItemId = res.body.data.id;
    expect(assignedItemId).toBeDefined();
    expect(res.body.data.itemType).toBe(CatalogItemType.FRAME);
  });

  it('records audit entries for transfer and assign', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminAccess}`)
      .expect(200);

    const actions = res.body.data.items.map((row: { action: string }) => row.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        'reseller.create',
        'reseller.coins.transfer',
        'reseller.frame.assign',
      ]),
    );
  });

  it('shows reseller transactions and sales report', async () => {
    const tx = await request(app.getHttpServer())
      .get('/api/v1/reseller/transactions')
      .set('Authorization', `Bearer ${resellerAccess}`)
      .expect(200);
    expect(tx.body.data.items.length).toBeGreaterThan(0);

    const sales = await request(app.getHttpServer())
      .get('/api/v1/reseller/reports/sales')
      .set('Authorization', `Bearer ${resellerAccess}`)
      .expect(200);
    expect(sales.body.data.total).toBeGreaterThan(0);
  });
});
