import { db } from '@/db/client';
import { boundaries, provinces, regencies } from '@/db/schema';
import { validateArea, type Areas, validateSchema } from '@/validation';
import { and, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';

const optionsSchema = z.object({
  /**
   * Force sync all boundaries.
   */
  force: z.boolean().optional(),
});

type Options = z.infer<typeof optionsSchema>;

export const syncBoundaries = async (area: Areas, options?: Options) => {
  validateArea(area);
  validateSchema(optionsSchema, options);

  // Reset sync states
  if (options?.force) {
    await db
      .update(boundaries)
      .set({ sync: false, syncCode: null, syncedAt: null })
      .where(eq(boundaries.area, area));
  }

  const unsyncAreas = await db
    .select()
    .from(boundaries)
    .where(and(eq(boundaries.area, area), eq(boundaries.sync, false)));

  if (unsyncAreas.length === 0) {
    console.log(`No ${area} boundaries to sync`);
    return;
  }

  console.log(
    `${options?.force ? 'Force syncing' : 'Syncing'} ${unsyncAreas.length} ${area} boundaries`,
  );

  let syncCount = 0;

  for (const unsyncArea of unsyncAreas) {
    await db.transaction(async (tx) => {
      // Find the area data
      let syncCode;

      switch (area) {
        case 'provinces': {
          const matchProvince = await tx.query.provinces.findFirst({
            where: (provinces, { eq, ilike }) =>
              ilike(provinces.name, `${unsyncArea.PROVINSI}%`),
          });

          if (matchProvince) {
            syncCode = matchProvince.code;
          }

          break;
        }
        case 'regencies': {
          const matchRegencies = await tx
            .select()
            .from(regencies)
            .innerJoin(provinces, eq(regencies.provinceCode, provinces.code))
            .where(
              or(
                ilike(regencies.code, unsyncArea.KODE_KK as string),
                and(
                  ilike(provinces.name, `%${unsyncArea.PROVINSI}%`),
                  ilike(regencies.name, `%${unsyncArea.KAB_KOTA}%`),
                ),
              ),
            );

          syncCode = (
            matchRegencies.length > 1
              ? matchRegencies.find(
                  ({ regencies }) =>
                    regencies.code === unsyncArea.KODE_KK ||
                    regencies.name.endsWith(
                      (unsyncArea.KAB_KOTA as string).toUpperCase(),
                    ),
                )
              : matchRegencies[0]
          )?.regencies.code;

          break;
        }
        case 'districts': {
          break;
        }
        case 'villages': {
          break;
        }
      }

      if (!syncCode) {
        return;
      }

      // Update the area data
      await tx
        .update(boundaries)
        .set({
          sync: true,
          syncCode: syncCode as string,
          syncedAt: new Date(),
        })
        .where(
          and(eq(boundaries.FID, unsyncArea.FID), eq(boundaries.area, area)),
        );

      syncCount += 1;
    });
  }

  console.log(`Synced ${syncCount} ${area} boundaries`);
};
