import * as fs from 'fs';

import Manifest from './Manifest.js';
import ManifestDirectory from './ManifestDirectory.js';
import ManifestObject from './ManifestObject.js';

import { createHash } from 'crypto';


export default class RepositoryTool {

    protected manifest : Manifest;

    constructor(manifest : Manifest) {

        this.manifest = manifest;

    }

    public update() {

        this.updateRecursive(
            '.',
            this.manifest.rootDirectory);

    }

    protected updateRecursive(
        currentDirectoryPath: string,
        currentManifestDirectory : ManifestDirectory) {

        let fileMap : Map<string, fs.Dirent> = new Map();
        let dirMap : Map<string, fs.Dirent> = new Map();

        let dir = fs.opendirSync(currentDirectoryPath); // TODO: Catch errors
        let nextDirEnt: fs.Dirent | null = null;
        while ((nextDirEnt = dir.readSync()) != null) {

            // TODO: Normalize file name

            if (this.ignoreFile(nextDirEnt.name) == true) {

                // TODO: Emit event
                console.log(`Ignoring: ${nextDirEnt.name}`)

            } else if (nextDirEnt.isFile()) {

                fileMap.set(nextDirEnt.name, nextDirEnt);
                console.log(`Adding file: ${nextDirEnt.name}`)

            } else if (nextDirEnt.isDirectory()) {

                dirMap.set(nextDirEnt.name, nextDirEnt);
                console.log(`Adding dir: ${nextDirEnt.name}`)

            } else {

                console.log(`Error, ${nextDirEnt.name} unexpected file type`);

            }
        }
        dir.close();

        // Clone in case we modify during iteration
        let manifestFilesClone = currentManifestDirectory.files.slice(); 
        for (let nextManFile of manifestFilesClone) {

            const filePath = `${currentDirectoryPath}/${nextManFile.name}`;

            // TODO: don't read file completely
            const fileBuffer = fs.readFileSync(filePath);

            let digest = createHash('md5')
                .update(fileBuffer)
                .digest('base64');
    
            console.log(nextManFile.hashData == digest);
            console.log(`${filePath}: ${nextManFile.hashData}, ${digest}`);
        }

        // Clone in case we modify during iteration
        let manifestDirectoriesClone = currentManifestDirectory.subdirectories.slice();
        for (let nextManDir of manifestDirectoriesClone)
        {
            this.updateRecursive(
                `${currentDirectoryPath}/${nextManDir.name}`,
                nextManDir);
        }
    }

    protected ignoreFile(filename : string) : boolean
    {
        return filename == '.repositoryManifest';
    }
}