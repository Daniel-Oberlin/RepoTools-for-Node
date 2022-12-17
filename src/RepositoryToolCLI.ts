import * as fs from 'fs';

import yargs, {Argv} from 'yargs';
import { hideBin } from 'yargs/helpers';

import Manifest from './Manifest.js';
import ManifestFile from './ManifestFile.js';
import RepositoryTool from './RepositoryTool.js';

export default class RepositoryToolCLI {

    protected command:string | number;
    protected tool:RepositoryTool;

    constructor() {

        this.command = this.args._[0];

        this.tool = new RepositoryTool(
            this.readManifest('.repositoryManifest'));

        this.command == 'validate' && (this.tool.alwaysCheckHash = true);
        this.args.showProgress && (this.tool.showProgress = true);
        this.args.trackMoves && (this.tool.trackMoves = true);
        this.args.trackDuplicates && (this.tool.trackDuplicates = true);

    }

    public async run() { await this.tool.update(); }

    public report():boolean {

        let different = false;

        different = this.reportFiles(this.tool.missingFiles, 'are missing') || different;
        different = this.reportFiles(this.tool.changedFiles, 'have changed content') || different;
        different = this.reportFiles(this.tool.newFiles, 'are new') || different;
        different = (this.reportFiles(this.tool.lastModifiedDateFiles, 'have last-modified dates which are different') && !this.args.ignoreDate) || different;
        different = this.reportFiles(this.tool.errorFiles, 'have errors') || different;
        different = this.reportMovedFiles(this.tool.movedFileOrder, this.tool.movedFiles) || different;

        this.reportDuplicateFiles(this.tool.duplicateFiles);
        this.reportFiles(this.tool.newlyIgnoredFiles, 'are newly ignored');
        this.reportFiles(this.tool.ignoredFiles, 'were ignored', 1);
        
        return different;
    }

    protected readManifest(filePath: string): Manifest {

        let rawData = fs.readFileSync(filePath);
        let manifestObj = JSON.parse(rawData.toString());
        return Manifest.fromPlainObject(manifestObj);

    }

    protected writeManifest(manifest:Manifest, filePath: string) {

        let jsonObj: any = manifest.toPlainObject();
        let jsonContent = JSON.stringify(jsonObj);
        fs.writeFile(filePath, jsonContent, 'utf8', function (err) {
            if (err) {
                console.log('An error occured while writing JSON Object to File.');
                return console.log(err);
            }
            console.log('JSON file has been saved.');
        });

    }

    protected reportFiles(files: ManifestFile[], description:string, moreThan:number = 0): boolean {

        if (files.length > moreThan) {
            console.log(`${files.length} files ${description}.`);

            if (this.args.detail) {
                files.map( manFile => console.log(`   ${Manifest.makeStandardFilePathString(manFile)}`));
                console.log();
            }

            return true;
        }

        return false;
    }
      
    protected reportMovedFiles(
        movedFileOrder: string[],
        movedFiles: Map<string, [oldFiles: ManifestFile[], newFiles: ManifestFile[]]>): boolean {

        if (movedFileOrder.length > 0) {
            console.log(`${movedFiles.size} files were moved.`);

            if (this.args.detail) {
                movedFileOrder.map(movedFileKey => {

                    let files = movedFiles.get(movedFileKey);
                    if (files != undefined) {
                        let out = '   ';
                        let [oldFiles, newFiles] = files;

                        oldFiles.map(oldFile => out += `${Manifest.makeStandardFilePathString(oldFile)} `);
                        out += '->';
                        newFiles.map(newFile => out += ` ${Manifest.makeStandardFilePathString(newFile)}`);

                        console.log(out);
                    }

                });

                console.log();
            }

            return true;
        }

        return false;
    }

    protected reportDuplicateFiles(duplicateFiles: Map<string, ManifestFile[]>) {

        if (duplicateFiles.size > 0) {
            console.log(`${duplicateFiles.size} file hashes were duplicates.`);

            if (this.args.detail) {

                for (let [hash, files] of duplicateFiles) {
                    console.log(`   Hash: ${hash}`);
                    files.map(file => console.log(`      ${Manifest.makeStandardFilePathString(file)}`));
                }

            }
                
            console.log();
        }

    }
    
    // Process the command line arguments here because I don't know how to
    // give a concrete type to this member without explicitly initializing
    // it.  ¯\_(ツ)_/¯
    protected args = yargs(hideBin(process.argv))
        .command('status', 'Check every file in the manifest based on file length and last modified date.  Check the hash values of modified files.  Report new files, missing files, and any differences.')
        .command('validate', 'Check every file in the manifest against its hash value.  Report newfiles, missing files, and any differences.')
        .option('detail', {
            alias: 'd',
            type: 'boolean',
            default: false,
            description: 'List the actual files that are different - not just the counts.'})
        .option('showProgress', {
            alias: 'p',
            type: 'boolean',
            default: false,
            description: 'List each file as it is being scanned.'})
        .option('trackMoves', {
            alias: 'm',
            type: 'boolean',
            default: false,
            description: 'Try to identify files that have been renamed or moved based on their hash values.'})
        .option('trackDuplicates', {
            type: 'boolean',
            default: false,
            description: 'Try to identify duplicate files based on their hash values.'})
        .option('ignoreDate', {
            type: 'boolean',
            default: false,
            description: "Don't count a date change alone as being a significant difference between the manifest and the repository.  Don't return an error exit code for this difference alone.  Useful for status and validate commands.."
        })
        .strict()
        .demandCommand(1, 1, 'You need to specify a command')
        .parseSync();

}
