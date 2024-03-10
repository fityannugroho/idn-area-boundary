import { Command } from 'commander';
import { loadBoundaries } from './actions/load';
import { type Areas } from './validation';
import { syncBoundaries } from './actions/sync';
import { exportBoundaries } from './actions/export';

const abortController = new AbortController();

process.on('SIGINT', () => {
  abortController.abort();
});

const program = new Command();

program.name('idn-area-boundaries').description('Indonesia area boundaries');

program
  .command('load')
  .description(
    'load boundaries from raw data to the database safely (will update the data if it exists)',
  )
  .argument(
    '<area>',
    "either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .action(async (area: Areas) => {
    await loadBoundaries(area, { signal: abortController.signal });
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
  .command('export')
  .description('export synced boundaries into geojson files')
  .argument(
    '<area>',
    "either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .action(async (area: Areas) => {
    await exportBoundaries(area, { signal: abortController.signal });
  });

program.hook('preAction', () => {
  console.log('Start... (press Ctrl+C to abort)\n');
});

program.exitOverride();

try {
  await program.parseAsync();
  console.log('\nDone!');
} catch (error) {
  if (error instanceof Error && error.name !== 'CommanderError') {
    console.error(`${error.name}: ${error.message}`);
  } else {
    throw error;
  }
}

process.exit(0);
