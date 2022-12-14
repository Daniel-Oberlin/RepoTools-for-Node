#!/usr/bin/env node

import * as fs from 'fs';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import Manifest from './Manifest.js';
import ManifestFile from './ManifestFile.js';
import RepositoryTool from './RepositoryTool.js';


const args = yargs(hideBin(process.argv))
  .command('status', 'Check every file in the manifest based on file length and last modified date.  Check the hash values of modified files.  Report new files, missing files, and any differences.')
  .command('validate', 'Check every file in the manifest against its hash value.  Report newfiles, missing files, and any differences.')
  .option('showProgress', {
    alias: 'p',
    type: 'boolean',
    default: false,
    description: 'List each file as it is being scanned.'
  })
  .option('ignoreDate', {
    type: 'boolean',
    default: false,
    description: "Don't count a date change alone as being a significant difference between the manifest and the repository.  Don't return an error exit code for this difference alone.  Useful for status and validate commands.."
  })
  .strict()
  .demandCommand(1, 1, 'You need to specify a command')
  .parseSync();

const command = args._[0];

let rawData = fs.readFileSync(`.repositoryManifest`);
let manifestObj = JSON.parse(rawData.toString());
let manifest  = Manifest.fromPlainObject(manifestObj);

let tool = new RepositoryTool(manifest);

command == 'validate' && (tool.alwaysCheckHash = true);
args.showProgress && (tool.showProgress = true);

await tool.update();

let different = false;

different = reportFiles(tool.missingFiles, 'are missing') || different;
different = reportFiles(tool.changedFiles, 'have changed content') || different;
different = reportFiles(tool.newFiles, 'are new') || different;
different = (reportFiles(tool.lastModifiedDateFiles, 'have last-modified dates which are different') && !args.ignoreDate) || different;

function reportFiles(files: ManifestFile[], description:string ): boolean {

  if (files.length > 0) {
    console.log(`${files.length} files ${description}.`);
    files.map( manFile => console.log(`   ${Manifest.makeStandardFilePathString(manFile)}`));
    console.log('');
    return true;
  }

  return false;
}

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