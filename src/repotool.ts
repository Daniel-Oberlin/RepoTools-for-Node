#!/usr/bin/env node

import * as fs from 'fs';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import RepositoryToolApp from './RepositoryToolApp.js';

const args = yargs(hideBin(process.argv))
  .command('status', 'check the status of the repo')
  .option('detail', {
    alias: 'd',
    type: 'boolean',
    default: false,
    description: "Preview changes but don't make them"
  })
  .strict()
  .demandCommand(1, 1, 'You need to specify a command')
  .parseSync();

const command = args._[0];

let rawData = fs.readFileSync(`.repositoryManifest`);
let manifest = JSON.parse(rawData.toString());

let repoToolApp = new RepositoryToolApp();
let a = repoToolApp.test();

console.log(`Blah`);
console.log(a.toString());
