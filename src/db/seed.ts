import {
  getDistricts,
  getProvinces,
  getRegencies,
  getVillages,
} from 'idn-area-data';
import { db } from './client';
import { districts, provinces, regencies, villages } from './schema';

const main = async () => {
  try {
    await db.delete(villages);
    await db.delete(districts);
    await db.delete(regencies);
    await db.delete(provinces);

    await db.insert(provinces).values(await getProvinces());
    await db.insert(regencies).values(await getRegencies({ transform: true }));
    await db.insert(districts).values(await getDistricts({ transform: true }));

    // Insert villages in batch of 1000
    const villagesData = await getVillages({ transform: true });
    for (let i = 0; i < villagesData.length; i += 1000) {
      const batch = villagesData.slice(i, i + 1000);
      await db.insert(villages).values(batch);
    }
    console.log('Seed success');
  } catch (error) {
    console.error(`Database seed error: ${error}`);
  }
};

main().then(() => process.exit(0));
