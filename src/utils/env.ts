import { z } from 'zod';

const schema = z.object({
  DB_URL: z.string().url(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  CONCURRENCY: z.coerce.number().int().min(1).default(10),
});

export type Env = z.infer<typeof schema>;

export default schema.parse(process.env);
