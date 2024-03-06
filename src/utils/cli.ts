import cliProgress from 'cli-progress';

type Options = {
  total: number;
};

export const initProgressBar = ({ total }: Options) => {
  const bar = new cliProgress.SingleBar(
    {
      stopOnComplete: true,
      stream: process.stdout,
      noTTYOutput: true,
      notTTYSchedule: 10_000, // 10 seconds
      format: '{bar} {percentage}% | {value}/{total} | ETA: {eta_formatted}',
      barsize: 32,
    },
    cliProgress.Presets.shades_classic,
  );

  bar.start(total, 0);
  return bar;
};
