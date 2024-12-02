import { compare } from 'fast-json-patch';
import { parentPort, workerData } from 'worker_threads';

// Helper function to get a value from an object based on a JSON pointer path
function getValueFromPath(obj: object, path: string): unknown {
  const pathSegments = path.slice(1).split('/'); // Remove leading '/' and split by '/'

  // @ts-ignore
  return pathSegments.reduce((current, segment) => {
    if (current && typeof current === 'object') {
      // Decode any escaped characters in JSON pointer
      const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

const { remoteData, localData } = workerData as {
  remoteData: object;
  localData: object;
};

const diffOperations = compare(remoteData, localData);

// Convert the output to a string to avoid serialization issues
// when sending it back to the main thread
let diffOutput = '';

if (diffOperations.length > 0) {
  console.log(`Found ${diffOperations.length} differences`);

  diffOutput = diffOperations
    .map((operation) => {
      const { op, path } = operation;
      const oldValue = getValueFromPath(remoteData, path);

      const location = `@@ ${path} @@ (${op})\n`;
      if (op === 'remove' || op === 'move' || op === 'copy') {
        return `${location}- ${oldValue}\n`;
      }
      return `${location}- ${oldValue}\n+ ${operation.value}\n`;
    })
    .join('\n');
}

parentPort?.postMessage(diffOutput);
