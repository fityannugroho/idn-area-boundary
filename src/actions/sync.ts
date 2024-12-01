import { db } from '@/db/client';
import {
  boundaries,
  districts,
  provinces,
  regencies,
  villages,
} from '@/db/schema';
import { initProgressBar } from '@/utils/cli';
import { validateArea, validateSchema, type Areas } from '@/validation';
import { sql } from 'drizzle-orm';
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

export const syncBoundaries = async (area: Areas, options?: Options) => {
  validateArea(area);
  validateSchema(optionsSchema, options);

  const areaTables = {
    provinces: provinces,
    regencies: regencies,
    districts: districts,
    villages: villages,
  } as const;

  //#region Syncing boundaries by code
  const bAreaCode = {
    provinces: boundaries.KODE_PROV,
    regencies: boundaries.KODE_KK,
    districts: boundaries.KODE_KEC,
    villages: boundaries.KODE_KD,
  } as const;

  process.stdout.write(`Syncing ${area} boundaries by code...`);

  const selectTimeStart = performance.now();

  const sqlSyncedCodes = sql`
    SELECT ${areaTables[area].code}
    FROM ${boundaries}
    INNER JOIN ${areaTables[area]}
      ON ${bAreaCode[area]} = ${areaTables[area].code}
    WHERE
      ${boundaries.area} = ${area}
      AND ${bAreaCode[area]} IS NOT NULL
      AND ${bAreaCode[area]} NOT LIKE '%-%'
    GROUP BY ${areaTables[area].code}
    HAVING COUNT(${areaTables[area].code}) = 1
  `;

  const syncedBoundsByCode = await db.execute<{
    fid: string;
    synced_code: string;
  }>(sql`
    SELECT ${boundaries.FID}, ${bAreaCode[area]} as synced_code
    FROM ${boundaries}
    WHERE
      ${boundaries.area} = ${area}
      AND ${bAreaCode[area]} IN (${sqlSyncedCodes})
      ${options?.force ? sql`` : sql`AND ${boundaries.sync} = FALSE`}
  `);

  process.stdout.write(
    ` [${(performance.now() - selectTimeStart).toFixed(2)}ms]\n`,
  );

  if (syncedBoundsByCode.rowCount === null) {
    return;
  }

  process.stdout.write(
    `Updating ${syncedBoundsByCode.rowCount} boundaries...\n`,
  );

  const progressBar = initProgressBar({
    total: syncedBoundsByCode.rowCount,
  });

  for (const { fid, synced_code } of syncedBoundsByCode.rows) {
    if (options?.signal?.aborted) {
      break;
    }

    await db.update(boundaries).set({
      sync: true,
      syncCode: synced_code,
      syncedAt: new Date(),
    }).where(sql`
      ${boundaries.FID} = ${fid}
      AND ${boundaries.area} = ${area}
    `);

    progressBar.increment();
  }

  progressBar.stop();

  if (options?.signal?.aborted) {
    return;
  }

  //#region Syncing boundaries by name
  const bAreaName = {
    provinces: boundaries.PROVINSI,
    regencies: boundaries.KAB_KOTA,
    districts: boundaries.KECAMATAN,
    villages: boundaries.NAME,
  } as const;

  process.stdout.write(`Syncing ${area} boundaries by name...`);

  const selectByNameTimeStart = performance.now();

  const sqlSyncedNames = sql`
    SELECT ${bAreaName[area]}
    FROM ${boundaries}
    INNER JOIN ${areaTables[area]}
      ON ${bAreaName[area]} = ${areaTables[area].name}
    WHERE
      ${boundaries.area} = ${area}
      AND ${bAreaName[area]} IS NOT NULL
    GROUP BY ${bAreaName[area]}
    HAVING COUNT(${bAreaName[area]}) = 1
  `;

  const syncedBoundsByName = await db.execute<{
    fid: string;
    synced_code: string;
  }>(sql`
    SELECT ${boundaries.FID}, ${areaTables[area].code} as synced_code
    FROM ${boundaries}
    INNER JOIN ${areaTables[area]}
      ON ${bAreaName[area]} = ${areaTables[area].name}
    WHERE
      ${boundaries.area} = ${area}
      AND ${bAreaName[area]} IN (${sqlSyncedNames})
      AND ${areaTables[area].code} NOT IN (${sqlSyncedCodes})
      AND ${bAreaCode[area]} NOT LIKE '%-%'
      ${
        area === 'villages'
          ? sql`AND (
              ${boundaries.KODE_KK} = SUBSTRING(${areaTables[area].code}, 1, 5)
              OR (
                SUBSTRING(${boundaries.KODE_PROV}, 1, 1) = '9'
                AND SUBSTRING(${areaTables[area].code}, 1, 1) = '9'
              )
            )`
          : sql``
      }
      ${options?.force ? sql`` : sql`AND ${boundaries.sync} = FALSE`}
  `);

  process.stdout.write(
    ` [${(performance.now() - selectByNameTimeStart).toFixed(2)}ms]\n`,
  );

  if (syncedBoundsByName.rowCount === null) {
    return;
  }

  process.stdout.write(
    `Updating ${syncedBoundsByName.rowCount} boundaries...\n`,
  );

  progressBar.start(syncedBoundsByName.rowCount, 0);

  for (const { fid, synced_code } of syncedBoundsByName.rows) {
    if (options?.signal?.aborted) {
      break;
    }

    await db.update(boundaries).set({
      sync: true,
      syncCode: synced_code,
      syncedAt: new Date(),
    }).where(sql`
      ${boundaries.FID} = ${fid}
      AND ${boundaries.area} = ${area}
    `);

    progressBar.increment();
  }

  progressBar.stop();
};
