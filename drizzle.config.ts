import env from '@/utils/env';
import { type Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: env.DB_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;
