import { Command } from 'commander';
import { loadBoundaries } from './actions/load';
import { type Areas } from './validation';
import { syncBoundaries } from './actions/sync';
import { generateBoundaries } from './actions/generate';

const abortController = new AbortController();

process.on('SIGINT', () => {
  abortController.abort();
});

const program = new Command();

program.name('idn-area-boundaries').description('Indonesia area boundaries');

program
  .command('load')
  .description('load boundaries from raw data to the database')
  .argument(
    '<area>',
    "either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .action(async (area: Areas) => {
    await loadBoundaries(area);
  });

program
  .command('sync')
  .description('sync boundaries from raw data with idn-area-data')
  .argument(
    '<area>',
    "either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .option('-f, --force', 'force sync all boundaries', false)
  .action(async (area: Areas, options) => {
    await syncBoundaries(area, {
      ...options,
      signal: abortController.signal,
    });
  });

program
  .command('generate')
  .description('generate boundaries of synced areas to geojson files')
  .argument(
    '<area>',
    "either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .action(async (area: Areas) => {
    await generateBoundaries(area);
  });

try {
  await program.parseAsync();
  console.log('Done!');
  process.exit(0);
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    throw error;
  }
}
