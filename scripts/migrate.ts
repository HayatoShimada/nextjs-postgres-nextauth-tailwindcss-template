import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const sslConfig = {
  ca: fs.readFileSync(path.join(process.cwd(), 'certs', 'server-ca.pem')).toString(),
  cert: fs.readFileSync(path.join(process.cwd(), 'certs', 'client-cert.pem')).toString(),
  key: fs.readFileSync(path.join(process.cwd(), 'certs', 'client-key.pem')).toString(),
  rejectUnauthorized: false
};

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: sslConfig
});

const db = drizzle(pool);

async function main() {
  console.log('Migration started...');
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  console.log('Migration completed');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed');
  console.error(err);
  process.exit(1);
}); 