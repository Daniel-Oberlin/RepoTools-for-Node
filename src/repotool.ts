#!/usr/bin/env node

import * as fs from 'fs';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import Manifest from './Manifest.js';
import RepositoryTool from './RepositoryTool.js';


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
let manifestObj = JSON.parse(rawData.toString());
let manifest  = Manifest.fromPlainObject(manifestObj);

let tool = new RepositoryTool(manifest);
tool.update();

/*
        let jsonObj: any = manifest.toPlainObject();
        let jsonContent = JSON.stringify(jsonObj);
        fs.writeFile(".repositoryManifest", jsonContent, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            console.log("JSON file has been saved.");
        });
*/