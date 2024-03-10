import { db } from '@/db/client';
import { boundaries } from '@/db/schema';
import { validateArea, type Areas } from '@/validation';
import { and, eq } from 'drizzle-orm';
import * as shapefile from 'shapefile';
import { stringify, type GeoJSONGeometry } from 'wellknown';

type Options = {
  signal?: AbortSignal;
};

export const loadBoundaries = async (area: Areas, options?: Options) => {
  validateArea(area);

  const pathToRawData = `raw-data/${area}/${area}.shp`;

  // Check if raw data exists
  if (!(await Bun.file(pathToRawData).exists())) {
    throw new Error(
      `Raw data of ${area} does not exist. Please add the raw data first in the data directory`,
    );
  }

  const shpSource = await shapefile.open(pathToRawData);
  let feature = await shpSource.read();

  while (!feature.done) {
    if (options?.signal?.aborted) {
      break;
    }

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

    const data = await db
      .select()
      .from(boundaries)
      .where(
        and(eq(boundaries.area, area), eq(boundaries.FID, properties.FID)),
      );

    if (data.length === 0) {
      // Insert new data
      await db.insert(boundaries).values({
        ...properties,
        geometryWkt: stringify(feature.value.geometry as GeoJSONGeometry),
        area,
      });

      console.log(`${area} ${properties.FID} inserted`);
    } else {
      // Update existing data
      await db
        .update(boundaries)
        .set({
          ...properties,
          geometryWkt: stringify(feature.value.geometry as GeoJSONGeometry),
          updatedAt: new Date(),
        })
        .where(
          and(eq(boundaries.area, area), eq(boundaries.FID, properties.FID)),
        );

      console.log(`${area} ${properties.FID} updated`);
    }

    feature = await shpSource.read();
  }
};
