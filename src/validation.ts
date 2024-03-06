import { z } from 'zod';

export const areaSchema = z.enum([
  'provinces',
  'regencies',
  'districts',
  'villages',
]);

export type Areas = z.infer<typeof areaSchema>;
