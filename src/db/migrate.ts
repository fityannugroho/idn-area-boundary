import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './client';

const main = async () => {
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });

    console.log('Migration success');
  } catch (error) {
    console.error(`Migration error: ${error}`);
  }
};

main().then(() => process.exit(0));
