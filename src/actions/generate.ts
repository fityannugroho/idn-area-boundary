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
import { and, count, eq, sql } from 'drizzle-orm';
import * as shapefile from 'shapefile';

type Options = {
  signal?: AbortSignal;
};

export const generateBoundaries = async (area: Areas, options?: Options) => {
  validateArea(area);

  const pathToRawData = Bun.resolveSync(
    `../../raw-data/${area}/${area}.shp`,
    import.meta.dir,
  );

  // Check if raw data exists
  if (!(await Bun.file(pathToRawData).exists())) {
    throw new Error(
      `Raw data of ${area} does not exist. Please add the raw data first in the data directory`,
    );
  }

  const [{ count: syncedBoundariesCount }] = await db
    .select({ count: count() })
    .from(boundaries)
    .where(and(eq(boundaries.area, area), eq(boundaries.sync, true)));

  if (syncedBoundariesCount === 0) {
    throw new Error(
      `No synced boundaries found for ${area}\nRun 'sync ${area}' first`,
    );
  }

  console.log(`Generating boundaries of ${syncedBoundariesCount} ${area}...`);

  const shpSource = await shapefile.open(pathToRawData);
  const progressBar = initProgressBar({ total: syncedBoundariesCount });

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
  let feature = await shpSource.read();

  while (!feature.done && !options?.signal?.aborted) {
    const {
      rowCount,
      rows: [data],
    } = await db.execute(sql`
      SELECT ${boundaries.FID}, ${areaTable.code}, ${areaTable.name} FROM ${boundaries}
      INNER JOIN ${areaTable} ON ${areaTable.code} = ${boundaries.syncCode}
      WHERE ${boundaries.area} = ${area}
      AND ${boundaries.FID} = ${feature.value.properties?.FID}
      AND ${boundaries.syncCode} IS NOT NULL
    `);

    if (rowCount === 1 && data) {
      progressBar.increment();

      const destFile = Bun.resolveSync(
        `../../data/${area}/${data.code}.geojson`,
        import.meta.dir,
      );

      await Bun.write(
        destFile,
        JSON.stringify({
          type: feature.value.type,
          properties: {
            code: data.code,
            name: data.name,
          },
          geometry: feature.value.geometry,
        }),
      );

      successCount += 1;
    }

    feature = await shpSource.read();
  }

  console.log(`${successCount} ${area} boundaries generated`);
};
