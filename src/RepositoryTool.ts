import * as fs from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

import Manifest from './Manifest.js';
import ManifestDirectory from './ManifestDirectory.js';
import ManifestObject from './ManifestObject.js';

export default class RepositoryTool {

    protected manifest : Manifest;

    constructor(manifest : Manifest) {

        this.manifest = manifest;

    }

    public async update() {

        await this.updateRecursive('.', this.manifest.rootDirectory);
        
    }

    protected async updateRecursive(
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

            } else if (nextDirEnt.isDirectory()) {

                dirMap.set(nextDirEnt.name, nextDirEnt);

            } else {

                console.log(`Error, ${nextDirEnt.name} unexpected file type`);

            }
        }
        dir.close();

        // Clone in case we modify during iteration
        let manifestFilesClone = currentManifestDirectory.files.slice(); 
        for (let nextManFile of manifestFilesClone) {

            const nextFileDirEnt = fileMap.get(nextManFile.name);
            if (nextFileDirEnt != undefined) {

                const filePath = `${currentDirectoryPath}/${nextManFile.name}`;
                const digest = await this.makeFileHash(filePath, nextManFile.hashType);

                console.log(`${filePath}: ${nextManFile.hashData == digest}`);

            } else {

                // TODO: Handle missing files
                console.log(`MISSING: ${nextManFile.name}`);
                // TODO: Emit event
                // TODO: Remove from manifest
                // TODO: Add to missing files list
            }
        }

        // Clone in case we modify during iteration
        let manifestDirectoriesClone = currentManifestDirectory.subdirectories.slice();
        for (let nextManDir of manifestDirectoriesClone)
        {
            await this.updateRecursive(
                `${currentDirectoryPath}/${nextManDir.name}`,
                nextManDir);
        }
    }

    protected ignoreFile(filename : string) : boolean {

        // TODO: fully implement
        return filename == '.repositoryManifest';

    }

    protected async makeFileHash(filePath : string, hashMethod : string) : Promise<string> {

        const fstream = fs.createReadStream(filePath);
        var hash = createHash(hashMethod.toLowerCase()).setEncoding('base64');
        await pipeline(fstream, hash);
        return hash.read();

    }
}