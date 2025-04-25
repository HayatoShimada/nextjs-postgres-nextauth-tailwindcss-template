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
  console.log('Dropping tables...');
  await pool.query('DROP TABLE IF EXISTS order_items CASCADE');
  await pool.query('DROP TABLE IF EXISTS orders CASCADE');
  await pool.query('DROP TABLE IF EXISTS products CASCADE');
  await pool.query('DROP TABLE IF EXISTS users CASCADE');
  console.log('Tables dropped');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to drop tables');
  console.error(err);
  process.exit(1);
}); 