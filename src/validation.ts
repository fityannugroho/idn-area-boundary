import { ZodError, z } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Validate schema and throw error if invalid.
 *
 * @param schema - The schema to validate.
 * @param value - The value to validate.
 */
export const validateSchema = <T>(schema: z.ZodType<T>, value: unknown) => {
  try {
    schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }
};

export const areaSchema = z.enum([
  'provinces',
  'regencies',
  'districts',
  'villages',
]);

export type Areas = z.infer<typeof areaSchema>;

/**
 * Validate area and throw error if invalid.
 */
export const validateArea = (area: string) => {
  validateSchema(areaSchema, area);
};
