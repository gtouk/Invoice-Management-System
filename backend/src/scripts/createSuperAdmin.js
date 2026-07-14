import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';

const SUPER_ADMIN = {
  full_name: 'Super Admin',
  email: 'superadmin@invoice.com',
  username: 'superadmin',
  password: 'SuperAdmin123!'
};

async function main() {
  const roleResult = await query(
    `
      SELECT id
      FROM roles
      WHERE name = 'super_admin'
      LIMIT 1
    `
  );

  const role = roleResult.rows[0];

  if (!role) {
    throw new Error("Le rôle 'super_admin' est introuvable. Ajoute-le dans la table roles.");
  }

  const existingResult = await query(
    `
      SELECT id, email, username
      FROM users
      WHERE email = $1
         OR username = $2
      LIMIT 1
    `,
    [SUPER_ADMIN.email, SUPER_ADMIN.username]
  );

  if (existingResult.rows[0]) {
    console.log('Super admin existe déjà :', existingResult.rows[0]);
    return;
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 10);

  const insertResult = await query(
    `
      INSERT INTO users (
        role_id,
        full_name,
        email,
        username,
        password_hash,
        status,
        company_id,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'actif',
        NULL,
        CURRENT_TIMESTAMP
      )
      RETURNING id, full_name, email, username, company_id
    `,
    [
      role.id,
      SUPER_ADMIN.full_name,
      SUPER_ADMIN.email,
      SUPER_ADMIN.username,
      passwordHash
    ]
  );

  console.log('Super admin créé avec succès :', insertResult.rows[0]);
  console.log('Identifiants :');
  console.log(`Email    : ${SUPER_ADMIN.email}`);
  console.log(`Username : ${SUPER_ADMIN.username}`);
  console.log(`Password : ${SUPER_ADMIN.password}`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erreur création super admin :', error);
    process.exit(1);
  });
