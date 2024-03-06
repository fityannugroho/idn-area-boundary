import { Command } from 'commander';
import { loadBoundaries } from './actions/load';
import { areaSchema, type Areas } from './validation';
import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';

const program = new Command();

program.name('idn-area-boundaries').description('Indonesia area boundaries');

program
  .command('load')
  .argument(
    '<area>',
    "Either 'provinces', 'regencies', 'districts', or 'villages'",
  )
  .action(async (area: Areas) => {
    try {
      areaSchema.parse(area);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(fromZodError(error).message);
        return;
      }
      throw error;
    }

    await loadBoundaries(area);
  });

program.parse();
