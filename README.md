# idn-area-boundary

Provides a simple way to get the boundary of a given area in Indonesia.

The data is taken from [Alf-Anas/batas-administrasi-indonesia][1]. The source data is extracted and converted to GeoJSON format.

The properties of the GeoJSON is also modified to be syncronized with the data from [idn-area-data](https://github.com/fityannugroho/idn-area-data).

> **Note:** The data still in syncronization and validation process, so some data may not be available yet.

## Prerequisite

- [Node.js 18 or later](https://nodejs.org/en/download/)
- [Bun v1.0 or later](https://bun.sh)
- [PostgreSQL](https://www.postgresql.org/download/)

## Installation

- Clone this repository
- Prepare the raw data

  Download the raw data from [Alf-Anas/batas-administrasi-indonesia][1] and extract it to `raw-data` directory. Make sure to put the data in the following directory structure:

  ```txt
  .
  |- raw-data
  |  |- provinces
  |  |  |- provinces.shp
  |  |  |- provinces.dbf
  |  |  |- ...
  |  |- regencies
  |  |  |- regencies.shp
  |  |  |- regencies.dbf
  |  |  |- ...
  |  |- districts
  |  |  |- districts.shp
  |  |  |- districts.dbf
  |  |  |- ...
  |  |- villages
  |  |  |- villages.shp
  |  |  |- villages.dbf
  |  |  |- ...
  |- src
  ...
  ```

- Create `.env` file and set the `DB_URL` with your PostgreSQL connection string
- Run `bun install` to install all dependencies
- Run `bun run db:migrate` to create the database schema
- Run `bun run db:seed` to seed the idn-area-data

## Usage

```sh
bun start [options] [command]

# Options:
#   -h, --help             display help for command

# Commands:
#   load <area>            load boundaries from raw data to the database safely (will
#                          update the data if it exists)
#   sync [options] <area>  sync boundaries from raw data with idn-area-data
#   export <area>          export synced boundaries into geojson files
#   help [command]         display help for command
```

[1]: https://github.com/Alf-Anas/batas-administrasi-indonesia
