import { db } from '@/db/client';
import {
  boundaries,
  districts,
  provinces,
  regencies,
  villages,
} from '@/db/schema';
import { initProgressBar } from '@/utils/cli';
import env from '@/utils/env';
import { validateArea, type Areas, validateSchema } from '@/validation';
import { and, eq, ilike, or } from 'drizzle-orm';
import PQueue from 'p-queue';
import { z } from 'zod';

const optionsSchema = z
  .object({
    /**
     * Force sync all boundaries.
     */
    force: z.boolean().optional(),
  })
  .optional();

type Options = z.infer<typeof optionsSchema> & {
  signal?: AbortSignal;
};

type Task = Parameters<InstanceType<typeof PQueue>['add']>[0];

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

  const queue = new PQueue({ concurrency: env.CONCURRENCY });
  const progressBar = initProgressBar({ total: unsyncAreas.length });
  let syncCount = 0;

  queue.on('completed', () => {
    progressBar.increment();
  });

  unsyncAreas.forEach((unsyncArea) => {
    const task: Task = async ({ signal }) => {
      if (signal?.aborted) {
        return;
      }

      // Find the area data
      let syncCode;

      switch (area) {
        case 'provinces': {
          const matchProvince = await db.query.provinces.findFirst({
            where: (provinces, { ilike }) =>
              ilike(provinces.name, `${unsyncArea.PROVINSI}%`),
          });

          if (matchProvince) {
            syncCode = matchProvince.code;
          }

          break;
        }
        case 'regencies': {
          const matchRegencies = await db
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
                    regencies.name
                      .toUpperCase()
                      .endsWith((unsyncArea.KAB_KOTA as string).toUpperCase()),
                )
              : matchRegencies[0]
          )?.regencies.code;

          break;
        }
        case 'districts': {
          const matchDistricts = await db
            .select()
            .from(districts)
            .innerJoin(regencies, eq(districts.regencyCode, regencies.code))
            .innerJoin(provinces, eq(regencies.provinceCode, provinces.code))
            .where(
              or(
                ilike(districts.code, unsyncArea.KODE_KEC as string),
                and(
                  ilike(provinces.name, `%${unsyncArea.PROVINSI}%`),
                  ilike(regencies.name, `%${unsyncArea.KAB_KOTA}%`),
                  ilike(districts.name, `%${unsyncArea.KECAMATAN}%`),
                ),
              ),
            );

          syncCode = (
            matchDistricts.length > 1
              ? matchDistricts.find(
                  ({ districts }) => districts.code === unsyncArea.KODE_KEC,
                ) ??
                matchDistricts.find(
                  ({ districts }) =>
                    districts.name.toUpperCase() ===
                    unsyncArea.KECAMATAN?.toUpperCase(),
                )
              : matchDistricts[0]
          )?.districts.code;

          break;
        }
        case 'villages': {
          const matchVillages = await db
            .select()
            .from(villages)
            .innerJoin(districts, eq(villages.districtCode, districts.code))
            .innerJoin(regencies, eq(districts.regencyCode, regencies.code))
            .innerJoin(provinces, eq(regencies.provinceCode, provinces.code))
            .where(
              or(
                ilike(villages.code, unsyncArea.KODE_KD as string),
                and(
                  ilike(provinces.name, `%${unsyncArea.PROVINSI}%`),
                  ilike(regencies.name, `%${unsyncArea.KAB_KOTA}%`),
                  ilike(districts.name, `%${unsyncArea.KECAMATAN}%`),
                  ilike(villages.name, `%${unsyncArea.NAME}%`),
                ),
              ),
            );

          syncCode = (
            matchVillages.length > 1
              ? matchVillages.find(
                  ({ villages }) => villages.code === unsyncArea.KODE_KD,
                ) ??
                matchVillages.find(
                  ({ villages }) =>
                    villages.name.toUpperCase() ===
                    unsyncArea.NAME?.toUpperCase(),
                )
              : matchVillages[0]
          )?.villages.code;

          break;
        }
      }

      if (!syncCode) {
        return;
      }

      // Update the area data
      await db
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
    };

    queue.add(task, { signal: options?.signal }).catch((error) => {
      if (!(error instanceof DOMException)) {
        throw error;
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    queue.on('idle', () => {
      resolve();
    });

    queue.on('error', (error) => {
      progressBar.stop();

      // Aborted
      if (error instanceof DOMException) {
        resolve();
      }

      // Other errors
      reject(error);
    });
  });

  console.log(`Synced ${syncCount} ${area} boundaries`);
};
