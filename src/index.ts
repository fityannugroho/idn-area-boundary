import { Command } from 'commander';
import { loadBoundaries } from './actions/load';
import { type Areas } from './validation';
import { syncBoundaries } from './actions/sync';

const program = new Command();

program.name('idn-area-boundaries').description('Indonesia area boundaries');

program
  .command('load')
  .argument(
    '<area>',
    "Either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .action(async (area: Areas) => {
    await loadBoundaries(area);
  });

program
  .command('sync')
  .argument(
    '<area>',
    "Either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .option('-f, --force', 'Force sync all boundaries', false)
  .action(async (area: Areas, options) => {
    await syncBoundaries(area, options);
  });

try {
  await program.parseAsync();
  console.log('Done!');
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    throw error;
  }
}
