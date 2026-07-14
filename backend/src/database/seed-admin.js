import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, pool } from './db.js';

const fullName = 'Administrateur';
const email = 'admin@app.com';
const username = 'admin';
const password = 'Admin123!';

async function seedAdmin() {
  const roleResult = await query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
  const adminRole = roleResult.rows[0];

  if (!adminRole) {
    throw new Error('Role admin introuvable. Executez d abord la migration SQL.');
  }

  const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
  if (existing.rows.length > 0) {
    console.log('Admin existe deja.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await query(
    `INSERT INTO users (id, role_id, full_name, email, username, password_hash, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'actif')`,
    [uuidv4(), adminRole.id, fullName, email, username, passwordHash]
  );

  console.log('Admin cree: username=admin password=Admin123!');
}

seedAdmin()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
