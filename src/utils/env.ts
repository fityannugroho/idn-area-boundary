import { z } from 'zod';

const schema = z.object({
  DB_URL: z.string().url(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Env = z.infer<typeof schema>;

export default schema.parse(process.env);
