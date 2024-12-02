import { validateArea, type Areas } from '@/validation';
import { writeFile, mkdir } from 'fs/promises';
import { Worker } from 'worker_threads';

type Options = {
  signal?: AbortSignal;
};

export const compareBoundaries = async (
  area: Areas,
  code: string,
  { signal }: Options = {},
) => {
  validateArea(area);

  const localFile = Bun.file(`data/${area}/${code}.geojson`);

  if (!(await localFile.exists())) {
    throw new Error(
      `Error: local boundary not found for ${area}/${code}.geojson`,
    );
  }

  const url = `https://raw.githubusercontent.com/fityannugroho/idn-area-boundary/refs/heads/main/data/${area}/${code}.geojson`;
  const resRemote = await fetch(url, { signal });

  if (!resRemote.ok) {
    throw new Error(
      `Can't fetch remote boundary for ${area}/${code}.geojson (error: ${resRemote.status})`,
    );
  }
  const remoteData = await resRemote.json();
  const localData = await localFile.json();

  const diffOutput = await new Promise<string | null>((resolve, reject) => {
    console.log(`Comparing ${area}/${code}.geojson...`);

    const worker = new Worker(new URL('./diff-worker.ts', import.meta.url), {
      workerData: { remoteData, localData },
    });

    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    signal?.addEventListener('abort', () => {
      worker.terminate();
      reject(new Error('Comparison aborted'));
    });
  });

  if (!diffOutput) {
    console.log(`${area}/${code}.geojson is the same as the remote`);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = `diffs/${area}_${code}_diff_${timestamp}.txt`;

  // Create diffs directory if it doesn't exist
  await mkdir('diffs', { recursive: true });

  // Write diff to file
  await writeFile(outputPath, diffOutput);
  console.log(`Diff output written to ${outputPath}`);
};
