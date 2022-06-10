#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

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
  .parse();

const command = args._[0];

  console.log();
