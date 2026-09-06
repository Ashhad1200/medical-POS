const path = require('path');
const { execFileSync } = require('child_process');
const { Client } = require('pg');

const TEST_DB = 'medicalpos_test';
const conn = {
  host: process.env.TEST_PG_HOST || 'localhost',
  port: Number(process.env.TEST_PG_PORT || 5436),
  user: process.env.TEST_PG_USER || 'postgres',
  password: process.env.TEST_PG_PASSWORD || 'admin123',
};

module.exports = async () => {
  const admin = new Client({ ...conn, database: 'postgres' });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  // Apply every migration to the fresh test db.
  execFileSync(process.execPath, ['scripts/run-migrations.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      POSTGRES_HOST: conn.host,
      POSTGRES_PORT: String(conn.port),
      POSTGRES_DB: TEST_DB,
      POSTGRES_USER: conn.user,
      POSTGRES_PASSWORD: conn.password,
      POSTGRES_SSL: 'false',
    },
  });
};
