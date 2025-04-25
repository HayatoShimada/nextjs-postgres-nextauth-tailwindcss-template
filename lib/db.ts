import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  serial,
  boolean,
  uuid
} from 'drizzle-orm/pg-core';
import { count, eq, ilike, and } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import fs from 'fs';
import path from 'path';

// サーバーサイドでのみ実行されるように修正
declare global {
  var db: ReturnType<typeof drizzle> | undefined;
  var pool: Pool | undefined;
}

if (typeof window === 'undefined' && !global.db) {
  // SSL設定
  const sslConfig = {
    ca: fs.readFileSync(path.join(process.cwd(), 'certs', 'server-ca.pem')).toString(),
    cert: fs.readFileSync(path.join(process.cwd(), 'certs', 'client-cert.pem')).toString(),
    key: fs.readFileSync(path.join(process.cwd(), 'certs', 'client-key.pem')).toString(),
    rejectUnauthorized: false
  };

  global.pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: sslConfig
  });

  global.db = drizzle(global.pool);
}

// テーブル存在チェックと作成
async function ensureTablesExist() {
  if (!global.pool) return;
  
  try {
    // 列挙型の作成
    await global.pool.query(`
      DO $$ BEGIN
        CREATE TYPE status AS ENUM ('active', 'inactive', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await global.pool.query(`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('admin', 'store_manager', 'store_staff');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // stores テーブルの作成
    await global.pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        status status NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // users テーブルの作成
    await global.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT NOT NULL UNIQUE,
        email_verified TIMESTAMP,
        image TEXT,
        role role DEFAULT 'store_staff',
        store_id INTEGER REFERENCES stores(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // products テーブルの作成
    await global.pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES stores(id),
        image_url TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status status NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        stock INTEGER NOT NULL,
        available_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // orders テーブルの作成
    await global.pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL REFERENCES stores(id),
        user_id UUID REFERENCES users(id),
        total_amount NUMERIC(10,2) NOT NULL,
        status status NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // order_items テーブルの作成
    await global.pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

// データベースの初期化
ensureTablesExist().catch(console.error);

// データアクセス関数
export async function getProducts(
  search: string,
  offset: number,
  storeId?: number
): Promise<{
  products: Product[];
  newOffset: number | null;
  totalProducts: number;
}> {
  if (!global.db) {
    throw new Error('Database connection not initialized');
  }

  try {
    let whereClause = undefined;
    if (search) {
      whereClause = ilike(products.name, `%${search}%`);
    }
    if (storeId) {
      whereClause = whereClause 
        ? and(whereClause, eq(products.storeId, storeId))
        : eq(products.storeId, storeId);
    }

    const query = global.db.select().from(products).where(whereClause);
    const totalProducts = await global.db
      .select({ count: count() })
      .from(products)
      .where(whereClause);

    const moreProducts = await query.limit(5).offset(offset);
    const newOffset = moreProducts.length >= 5 ? offset + 5 : null;

    return {
      products: moreProducts,
      newOffset,
      totalProducts: totalProducts[0].count
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      products: [],
      newOffset: null,
      totalProducts: 0
    };
  }
}

// 列挙型の定義
export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);
export const roleEnum = pgEnum('role', ['admin', 'store_manager', 'store_staff']);

// 店舗テーブル
export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  status: statusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ユーザーテーブル
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  role: roleEnum('role').default('store_staff'),
  storeId: integer('store_id').references(() => stores.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// 商品テーブル
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  imageUrl: text('image_url').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: statusEnum('status').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull(),
  availableAt: timestamp('available_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// 注文テーブル
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: statusEnum('status').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// 注文明細テーブル
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  productId: integer('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// 型定義
export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// スキーマ定義
export const insertStoreSchema = createInsertSchema(stores);
export const insertUserSchema = createInsertSchema(users);
export const insertProductSchema = createInsertSchema(products);
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);

export async function deleteProductById(id: number) {
  if (!global.db) {
    throw new Error('Database connection not initialized');
  }
  await global.db.delete(products).where(eq(products.id, id));
}

// 店舗一覧を取得する関数
export async function getStores() {
  if (!global.db) {
    throw new Error('Database connection not initialized');
  }
  try {
    return await global.db.select().from(stores).where(eq(stores.status, 'active'));
  } catch (error) {
    console.error('Error fetching stores:', error);
    return [];
  }
}

// ユーザーの店舗を更新する関数
export async function updateUserStore(userId: string, storeId: number) {
  if (!global.db) {
    throw new Error('Database connection not initialized');
  }
  try {
    await global.db
      .update(users)
      .set({ storeId })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error('Error updating user store:', error);
    return false;
  }
}

export async function createStore(store: {
  name: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
}) {
  if (!global.db) {
    throw new Error('Database connection not initialized');
  }
  try {
    const result = await global.db.insert(stores).values(store).returning();
    return result[0];
  } catch (error) {
    console.error('Error creating store:', error);
    throw error;
  }
}

// グローバルのdbインスタンスをエクスポート
export const db = global.db;
