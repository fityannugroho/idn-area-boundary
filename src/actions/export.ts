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
import { validateArea, type Areas } from '@/validation';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import PQueue from 'p-queue';
import { parse } from 'wellknown';

type Options = {
  signal?: AbortSignal;
};

type Task = Parameters<InstanceType<typeof PQueue>['add']>[0];

export const exportBoundaries = async (area: Areas, options?: Options) => {
  validateArea(area);

  const syncedBoundaries = await db
    .select({ FID: boundaries.FID })
    .from(boundaries)
    .where(
      and(
        eq(boundaries.area, area),
        eq(boundaries.sync, true),
        isNotNull(boundaries.geometryWkt),
      ),
    );

  if (syncedBoundaries.length === 0) {
    throw new Error(
      `No synced boundaries found for ${area}\nRun 'sync ${area}' first`,
    );
  }

  console.log(`Exporting ${syncedBoundaries.length} ${area} boundaries...`);

  const queue = new PQueue({ concurrency: env.CONCURRENCY });
  const progressBar = initProgressBar({ total: syncedBoundaries.length });

  queue.on('completed', () => {
    progressBar.increment();
  });

  let areaTable:
    | typeof provinces
    | typeof regencies
    | typeof districts
    | typeof villages;

  switch (area) {
    case 'provinces':
      areaTable = provinces;
      break;
    case 'regencies':
      areaTable = regencies;
      break;
    case 'districts':
      areaTable = districts;
      break;
    case 'villages':
      areaTable = villages;
      break;
  }

  let successCount = 0;

  syncedBoundaries.forEach((boundary) => {
    const task: Task = async ({ signal }) => {
      if (signal?.aborted) {
        return;
      }

      const {
        rowCount,
        rows: [properties],
      } = await db.execute(sql`
        SELECT ${areaTable.code}, ${areaTable.name} FROM ${boundaries}
        INNER JOIN ${areaTable} ON ${areaTable.code} = ${boundaries.syncCode}
        WHERE ${boundaries.area} = ${area}
        AND ${boundaries.FID} = ${boundary.FID}
        AND ${boundaries.syncCode} IS NOT NULL
      `);

      if (rowCount === 1 && properties) {
        const [{ geometryWkt }] = await db
          .select({ geometryWkt: boundaries.geometryWkt })
          .from(boundaries)
          .where(
            and(eq(boundaries.area, area), eq(boundaries.FID, boundary.FID)),
          );

        if (!geometryWkt) {
          return;
        }

        await Bun.write(
          `data/${area}/${properties.code}.geojson`,
          JSON.stringify({
            type: 'Feature',
            properties,
            geometry: parse(geometryWkt),
          }),
        );

        // Update boundaries export timestamp
        await db
          .update(boundaries)
          .set({
            exportedAt: new Date(),
          })
          .where(
            and(eq(boundaries.area, area), eq(boundaries.FID, boundary.FID)),
          );

        successCount += 1;
      }
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

      reject(error);
    });
  });

  console.log(`${successCount} ${area} boundaries exported`);
};
