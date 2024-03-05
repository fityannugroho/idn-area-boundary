import env from '@/utils/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: env.DB_URL,
});

export const db = drizzle(pool);
