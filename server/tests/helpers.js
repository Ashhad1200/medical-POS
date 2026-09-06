const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../server');
const { pool } = require('../config/database');

let counter = 0;
const uniq = (p = 'x') => `${p}-${Date.now().toString(36)}-${counter++}`;

/** Insert an is_platform_admin user (in the hidden __platform__ org) and log in. */
async function makePlatformAdmin() {
  const org = await pool.query(
    `INSERT INTO organizations (code, name, is_active)
     VALUES ('__platform__', 'Platform Operations', true)
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const email = `${uniq('op')}@platform.test`;
  const password = 'operator-pw-123';
  const hash = await bcrypt.hash(password, 4);
  await pool.query(
    `INSERT INTO users (username, email, password_hash, full_name, role, role_in_pos,
       organization_id, is_active, is_email_verified, is_platform_admin, permissions)
     VALUES ($1, $2, $3, 'Op', 'admin', 'admin', $4, true, true, true, '["all"]'::jsonb)`,
    [uniq('op'), email, hash, org.rows[0].id]
  );
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return { token: res.body.data.token, email };
}

/** Create a tenant via the public signup endpoint. Returns token + ids. */
async function makeTenant(planCode = 'basic') {
  const email = `${uniq('owner')}@tenant.test`;
  const password = 'tenant-pw-123';
  const res = await request(app).post('/api/public/signup').send({
    organizationName: `Shop ${uniq('s')}`,
    fullName: 'Owner',
    email,
    password,
    planCode,
  });
  if (res.status !== 201) {
    throw new Error(`signup failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return {
    token: res.body.data.token,
    email,
    password,
    organizationId: res.body.data.organization.id,
    organizationCode: res.body.data.organization.code,
  };
}

/**
 * Provision an org of a given type via the platform API and log its admin in.
 * Returns token + ids. Used for supplier tenants (signup only makes pharmacies).
 */
async function makeOrg(orgType = 'pharmacy', planCode = 'pro') {
  const op = await makePlatformAdmin();
  const code = uniq(orgType);
  const adminEmail = `${uniq('a')}@${orgType}.test`;
  const password = 'org-admin-pw-123';
  const res = await request(app)
    .post('/api/platform/organizations')
    .set('Authorization', `Bearer ${op.token}`)
    .send({
      name: `${orgType} ${code}`,
      code,
      planCode,
      orgType,
      admin: { username: uniq('u'), email: adminEmail, password },
    });
  if (res.status !== 201) {
    throw new Error(`makeOrg failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: adminEmail, password });
  return {
    token: login.body.data.token,
    email: adminEmail,
    password,
    organizationId: res.body.data.organization.id,
    organizationCode: code,
  };
}

const makeSupplier = (planCode = 'pro') => makeOrg('supplier', planCode);

const closePool = () => pool.end();

module.exports = {
  app,
  request,
  pool,
  uniq,
  makePlatformAdmin,
  makeTenant,
  makeOrg,
  makeSupplier,
  closePool,
};
