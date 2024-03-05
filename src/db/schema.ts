import { pgTable, varchar } from 'drizzle-orm/pg-core';

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
