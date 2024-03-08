import { db } from '@/db/client';
import { boundaries } from '@/db/schema';
import { validateArea, type Areas } from '@/validation';
import { eq } from 'drizzle-orm';
import * as shapefile from 'shapefile';

export const loadBoundaries = async (area: Areas) => {
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
};
