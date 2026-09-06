const {
  app,
  request,
  pool,
  uniq,
  closePool,
  makePlatformAdmin,
  makeTenant,
} = require('./helpers');

let op;
beforeAll(async () => {
  op = await makePlatformAdmin();
});
afterAll(closePool);

const auth = (r) => r.set('Authorization', `Bearer ${op.token}`);

describe('plans CRUD', () => {
  it('lists the seeded catalogue with org counts', async () => {
    const res = await auth(request(app).get('/api/platform/plans'));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data[0]).toHaveProperty('organization_count');
  });

  it('creates, updates, and rejects a duplicate code', async () => {
    const code = uniq('plan');
    const created = await auth(
      request(app).post('/api/platform/plans').send({
        code,
        name: 'Team',
        price_monthly: 49,
        max_users: 10,
        features: { ai_analytics: true },
      })
    );
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const updated = await auth(
      request(app).patch(`/api/platform/plans/${id}`).send({ price_monthly: 59 })
    );
    expect(updated.status).toBe(200);
    expect(Number(updated.body.data.price_monthly)).toBe(59);

    const dup = await auth(
      request(app).post('/api/platform/plans').send({ code, name: 'Dup' })
    );
    expect(dup.status).toBe(409);
  });

  it('retires (soft-deletes) a plan that is assigned to an org', async () => {
    // seeded plans are referenced by the seed org, so basic is "in use"
    const basic = (
      await auth(request(app).get('/api/platform/plans'))
    ).body.data.find((p) => p.code === 'basic');
    // give it a user first
    await makeTenant('basic');
    const res = await auth(
      request(app).delete(`/api/platform/plans/${basic.id}`)
    );
    expect(res.status).toBe(200);
    expect(res.body.data.is_active).toBe(false);
    // reactivate so other tests aren't affected
    await auth(
      request(app)
        .patch(`/api/platform/plans/${basic.id}`)
        .send({ is_active: true, is_public: true })
    );
  });
});

describe('organizations', () => {
  it('provisions an org + first admin in one call; that admin can log in', async () => {
    const code = uniq('org');
    const adminEmail = `${uniq('a')}@neworg.test`;
    const res = await auth(
      request(app).post('/api/platform/organizations').send({
        name: 'Green Cross',
        code,
        planCode: 'pro',
        admin: { username: uniq('u'), email: adminEmail, password: 'admin-pw-123' },
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.data.organization.code).toBe(code);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'admin-pw-123' });
    expect(login.status).toBe(200);
  });

  it('rejects org creation without admin credentials', async () => {
    const res = await auth(
      request(app)
        .post('/api/platform/organizations')
        .send({ name: 'x', code: uniq('org') })
    );
    expect(res.status).toBe(400);
  });

  it('changes plan and records a subscription_event', async () => {
    const tenant = await makeTenant('basic');
    const orgRow = await pool.query(
      'SELECT id FROM organizations WHERE code = $1',
      [tenant.organizationCode]
    );
    const orgId = orgRow.rows[0].id;

    const res = await auth(
      request(app)
        .patch(`/api/platform/organizations/${orgId}/plan`)
        .send({ planCode: 'pro', notes: 'upgrade' })
    );
    expect(res.status).toBe(200);

    const ev = await pool.query(
      `SELECT event_type FROM subscription_events
       WHERE organization_id = $1 AND event_type = 'plan_changed'`,
      [orgId]
    );
    expect(ev.rows.length).toBe(1);
  });

  it('extends the access window by N days', async () => {
    const tenant = await makeTenant('basic');
    const orgRow = await pool.query(
      'SELECT id FROM organizations WHERE code = $1',
      [tenant.organizationCode]
    );
    const orgId = orgRow.rows[0].id;

    const res = await auth(
      request(app)
        .patch(`/api/platform/organizations/${orgId}/access`)
        .send({ extendDays: 30 })
    );
    expect(res.status).toBe(200);
    expect(new Date(res.body.data.access_valid_till).getTime()).toBeGreaterThan(
      Date.now()
    );
  });

  it('suspend blocks tenant logins and revokes sessions; reactivate restores', async () => {
    const tenant = await makeTenant('basic');
    const orgRow = await pool.query(
      'SELECT id FROM organizations WHERE code = $1',
      [tenant.organizationCode]
    );
    const orgId = orgRow.rows[0].id;

    const suspend = await auth(
      request(app)
        .patch(`/api/platform/organizations/${orgId}/status`)
        .send({ action: 'suspend' })
    );
    expect(suspend.status).toBe(200);
    expect(suspend.body.data.is_active).toBe(false);

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: tenant.email, password: tenant.password });
    expect(blocked.status).toBe(403);

    const reactivate = await auth(
      request(app)
        .patch(`/api/platform/organizations/${orgId}/status`)
        .send({ action: 'reactivate' })
    );
    expect(reactivate.status).toBe(200);

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: tenant.email, password: tenant.password });
    expect(ok.status).toBe(200);
  });

  it('hides the internal __platform__ org from listing and overview', async () => {
    const list = await auth(request(app).get('/api/platform/organizations'));
    expect(list.body.data.some((o) => o.code === '__platform__')).toBe(false);

    const overview = await auth(request(app).get('/api/platform/overview'));
    expect(overview.status).toBe(200);
    expect(overview.body.data.organizations).toHaveProperty('total');
  });
});

describe('cross-tenant users', () => {
  it('revokes a user session', async () => {
    const tenant = await makeTenant('basic');
    const u = await pool.query('SELECT id FROM users WHERE email = $1', [
      tenant.email,
    ]);
    const res = await auth(
      request(app).post(`/api/platform/users/${u.rows[0].id}/revoke-session`)
    );
    expect(res.status).toBe(200);
    const after = await pool.query(
      'SELECT session_token FROM users WHERE id = $1',
      [u.rows[0].id]
    );
    expect(after.rows[0].session_token).toBeNull();
  });

  it('toggles a user active flag', async () => {
    const tenant = await makeTenant('basic');
    const u = await pool.query('SELECT id FROM users WHERE email = $1', [
      tenant.email,
    ]);
    const off = await auth(
      request(app)
        .patch(`/api/platform/users/${u.rows[0].id}/status`)
        .send({ isActive: false })
    );
    expect(off.body.data.is_active).toBe(false);
  });
});
