CREATE TABLE IF NOT EXISTS "districts" (
	"code" varchar(8) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"regency_code" varchar(5)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "provinces" (
	"code" varchar(2) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regencies" (
	"code" varchar(5) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"province_code" varchar(2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "villages" (
	"code" varchar(13) PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"district_code" varchar(8)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "districts" ADD CONSTRAINT "districts_regency_code_regencies_code_fk" FOREIGN KEY ("regency_code") REFERENCES "regencies"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "regencies" ADD CONSTRAINT "regencies_province_code_provinces_code_fk" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "villages" ADD CONSTRAINT "villages_district_code_districts_code_fk" FOREIGN KEY ("district_code") REFERENCES "districts"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
