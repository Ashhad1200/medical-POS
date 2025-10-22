const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");

const MIGRATIONS_TABLE = "schema_migrations";

async function ensureMigrationsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
}

async function getAppliedMigrations() {
  const { rows } = await pool.query(`SELECT filename FROM ${MIGRATIONS_TABLE}`);
  return new Set(rows.map((row) => row.filename));
}

async function applyMigration(filePath, filename) {
  const sql = fs.readFileSync(filePath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
      [filename]
    );
    await client.query("COMMIT");
    console.log(`⬆️  Applied migration ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ Failed to apply migration ${filename}`);
    console.error(error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function run() {
  try {
    await ensureMigrationsTable();
    const appliedMigrations = await getAppliedMigrations();

    const migrationsDir = path.resolve(__dirname, "../db/migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.warn("No migrations directory found. Skipping.");
      process.exit(0);
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        console.log(`✔️  Skipping already applied migration ${filename}`);
        continue;
      }

      const filePath = path.join(migrationsDir, filename);
      await applyMigration(filePath, filename);
    }

    console.log("✅ PostgreSQL migrations complete");
  } catch (error) {
    console.error("Migration process failed", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
