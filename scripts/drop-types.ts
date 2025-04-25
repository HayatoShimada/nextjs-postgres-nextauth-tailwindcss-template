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

async function main() {
  console.log('Dropping types...');
  await pool.query('DROP TYPE IF EXISTS status CASCADE');
  await pool.query('DROP TYPE IF EXISTS role CASCADE');
  console.log('Types dropped');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to drop types');
  console.error(err);
  process.exit(1);
}); 