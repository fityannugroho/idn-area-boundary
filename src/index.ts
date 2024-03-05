import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import shapefile from 'shapefile';
import { fileURLToPath } from 'url';
import { db } from './db/client';
import { boundaries } from './db/schema';

type Area = 'provinces' | 'regencies' | 'districts' | 'villages';

const main = async () => {
  const [area] = process.argv.slice(2) as [Area];

  // Validate area
  if (!area) {
    throw new Error(
      'Please provide an area: provinces, regencies, districts, or villages',
    );
  }
  if (!['provinces', 'regencies', 'districts', 'villages'].includes(area)) {
    throw new Error('Invalid area');
  }

  const dirName = path.dirname(fileURLToPath(import.meta.url));
  const pathToRawData = path.resolve(
    dirName,
    `../raw-data/${area}/${area}.shp`,
  );

  // Check if raw data exists
  if (!fs.existsSync(pathToRawData)) {
    throw new Error(
      `Raw data of ${area} does not exist. Please add the raw data first in the data directory`,
    );
  }

  const shpSource = await shapefile.open(pathToRawData);

  // Clear existing boundaries data
  await db.delete(boundaries).where(eq(boundaries.area, area));

  let feature = await shpSource.read();
  while (!feature.done) {
    const properties = feature.value.properties as {
      FID: string;
      KODE_PROV?: string;
      PROVINSI?: string;
      KODE_KK?: string;
      KAB_KOTA?: string;
      KODE_KEC?: string;
      KECAMATAN?: string;
      KODE_KD?: string;
      NAME?: string;
      TIPE_KD?: number;
      JENIS_KD?: string;
    };

    try {
      await db.insert(boundaries).values({
        ...properties,
        area,
      });

      console.log(`${area} ${properties.FID} inserted`);
    } catch (error) {
      throw new Error(`Failed to insert ${area} ${properties.FID}`, {
        cause: error,
      });
    }

    feature = await shpSource.read();
  }

  console.log('Done!');
};

main().then(() => process.exit(0));
