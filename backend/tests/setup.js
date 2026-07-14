import { afterAll } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DISABLE_CRON = 'true';

// Keep JWT secrets deterministic for local/test runs if missing.
if (!process.env.JWT_ACCESS_SECRET) {
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_change_me';
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_change_me';
}

afterAll(async () => {
  try {
    const { pool } = await import('../src/database/db.js');
    await pool.end();
  } catch {
    // Pool may not have been initialized if all tests were skipped.
  }
});
