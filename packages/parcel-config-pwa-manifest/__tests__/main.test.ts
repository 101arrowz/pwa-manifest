import Parcel, { createWorkerFarm } from '@parcel/core';
import { MemoryFS } from '@parcel/fs';
import { join } from 'path';

process.chdir(__dirname);

const fp = (...p: string[]): string => join(__dirname, ...p);

const workerFarm = createWorkerFarm();
const outputFS = new MemoryFS(workerFarm);

const parcel = new Parcel({
  entries: [fp('index.html')], // TODO: Multi-entry
  workerFarm,
  outputFS
});
jest.setTimeout(120000); // Thanks, Parcel 2
test('Integrated correctly', async () => {
  const { bundleGraph } = await parcel.run();
  const bundles = bundleGraph.getBundles();
  expect(
    (
      await outputFS.readFile(
        bundles.find(b => b.filePath.endsWith('index.html'))!.filePath,
        'utf8'
      )
    ).replace(/<script(.*)>/, '')
  ).toMatchSnapshot();
  expect(
    await outputFS.readFile(
      bundles.find(b => b.filePath.endsWith('.xml'))!.filePath,
      'utf8'
    )
  ).toMatchSnapshot();
  expect(
    JSON.parse(
      await outputFS.readFile(
        bundles.find(b => b.filePath.endsWith('.webmanifest'))!.filePath,
        'utf8'
      )
    )
  ).toMatchSnapshot();
  await workerFarm.end();
});
