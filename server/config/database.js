const { Pool } = require("pg");

let pool;

// Check if DATABASE_URL exists (Heroku environment)
if (process.env.DATABASE_URL) {
  // Use a full connection string (Heroku / Railway / Coolify).
  // Managed Postgres wants SSL; a Coolify-internal DB does not — opt out with
  // DATABASE_SSL=false or PGSSLMODE=disable.
  const noSsl =
    process.env.DATABASE_SSL === "false" ||
    process.env.PGSSLMODE === "disable" ||
    /[?&]sslmode=disable/.test(process.env.DATABASE_URL);
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: noSsl ? false : { rejectUnauthorized: false },
    max: Number(process.env.POSTGRES_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT || 30000),
    connectionTimeoutMillis: Number(
      process.env.POSTGRES_CONNECTION_TIMEOUT || 2000
    ),
  });
} else {
  // Local development configuration
  pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || "medicalPOS",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "admin123",
    ssl:
      process.env.POSTGRES_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
    max: Number(process.env.POSTGRES_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT || 30000),
    connectionTimeoutMillis: Number(
      process.env.POSTGRES_CONNECTION_TIMEOUT || 2000
    ),
  });
}


pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error", err);
});

const query = (text, params) => pool.query(text, params);

const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
};
