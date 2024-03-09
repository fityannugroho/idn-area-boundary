import { db } from '@/db/client';
import {
  boundaries,
  districts,
  provinces,
  regencies,
  villages,
} from '@/db/schema';
import { initProgressBar } from '@/utils/cli';
import { validateArea, type Areas } from '@/validation';
import { and, eq, sql } from 'drizzle-orm';

type Options = {
  signal?: AbortSignal;
};

export const exportBoundaries = async (area: Areas, options?: Options) => {
  validateArea(area);

  const syncedBoundaries = await db
    .select()
    .from(boundaries)
    .where(and(eq(boundaries.area, area), eq(boundaries.sync, true)));

  if (syncedBoundaries.length === 0) {
    throw new Error(
      `No synced boundaries found for ${area}\nRun 'sync ${area}' first`,
    );
  }

  console.log(`Exporting ${syncedBoundaries.length} ${area} boundaries...`);

  const progressBar = initProgressBar({ total: syncedBoundaries.length });

  process.on('SIGINT', () => {
    progressBar.stop();
  });

  let areaTable;
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

  for (const boundary of syncedBoundaries) {
    if (options?.signal?.aborted) {
      break;
    }

    const {
      rowCount,
      rows: [data],
    } = await db.execute(sql`
      SELECT ${boundaries.FID}, ${areaTable.code}, ${areaTable.name} FROM ${boundaries}
      INNER JOIN ${areaTable} ON ${areaTable.code} = ${boundaries.syncCode}
      WHERE ${boundaries.area} = ${area}
      AND ${boundaries.FID} = ${boundary.FID}
      AND ${boundaries.syncCode} IS NOT NULL
    `);

    if (rowCount === 1 && data) {
      await Bun.write(
        `data/${area}/${data.code}.geojson`,
        JSON.stringify({
          type: 'Feature',
          properties: {
            code: data.code,
            name: data.name,
          },
          geometry: boundary.geometry,
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

    progressBar.increment();
  }

  console.log(`${successCount} ${area} boundaries exported`);
};
