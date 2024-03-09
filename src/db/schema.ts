import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const provinces = pgTable('provinces', {
  code: varchar('code', { length: 2 }).primaryKey(),
  name: varchar('name').notNull(),
});

export const regencies = pgTable('regencies', {
  code: varchar('code', { length: 5 }).primaryKey(),
  name: varchar('name').notNull(),
  provinceCode: varchar('province_code', { length: 2 }).references(
    () => provinces.code,
  ),
});

export const districts = pgTable('districts', {
  code: varchar('code', { length: 8 }).primaryKey(),
  name: varchar('name').notNull(),
  regencyCode: varchar('regency_code', { length: 5 }).references(
    () => regencies.code,
  ),
});

export const villages = pgTable('villages', {
  code: varchar('code', { length: 13 }).primaryKey(),
  name: varchar('name').notNull(),
  districtCode: varchar('district_code', { length: 8 }).references(
    () => districts.code,
  ),
});

export const areaEnum = pgEnum('area', [
  'provinces',
  'regencies',
  'districts',
  'villages',
]);

export const boundaries = pgTable(
  'boundaries',
  {
    FID: varchar('fid').notNull(),
    area: areaEnum('area').notNull(),
    KODE_PROV: varchar('p_code'),
    PROVINSI: varchar('p_name'),
    KODE_KK: varchar('r_code'),
    KAB_KOTA: varchar('r_name'),
    KODE_KEC: varchar('d_code'),
    KECAMATAN: varchar('d_name'),
    KODE_KD: varchar('v_code'),
    NAME: varchar('v_name'),
    TIPE_KD: integer('v_type_num'),
    JENIS_KD: varchar('v_type'),
    sync: boolean('sync').notNull().default(false),
    syncCode: varchar('sync_code'),
    syncedAt: timestamp('synced_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    exportedAt: timestamp('exported_at'),
    geometry: jsonb('geometry'),
  },
  (table) => {
    return {
      pk: primaryKey({ name: 'id', columns: [table.FID, table.area] }),
    };
  },
);
