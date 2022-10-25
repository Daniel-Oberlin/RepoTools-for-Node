import * as fs from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

import Manifest from './Manifest.js';
import ManifestDirectory from './ManifestDirectory.js';
import ManifestFile from './ManifestFile.js';

export default class RepositoryTool {

    public showProgress : boolean = true;

    public newFiles : ManifestFile[] = [];
    public changedFiles : ManifestFile[] = [];
    public missingFiles : ManifestFile[] = [];
    public lastModifiedDateFiles : ManifestFile[] = [];
    public errorFiles : ManifestFile[] = [];
    public ignoredFiles : ManifestFile[] = [];
    public newlyIgnoredFiles : ManifestFile[] = [];

    protected manifest : Manifest;

    /*
    movedFiles = new HashMap<FileHash,MovedFileSet>();
    movedFileOrder = new ArrayList<FileHash>();
    duplicateFiles = new HashMap<FileHash, ArrayList<ManifestFileInfo>>();
    */

    public newFilesForGroom : string[] = [];
    public ignoredFilesForGroom : string[] = [];

    constructor(manifest : Manifest) {

        this.manifest = manifest;

    }

    public async update() {

        /*
        clear();
        */

        await this.updateRecursive('.', this.manifest.rootDirectory);

        /*
        if (trackMoves == true)
		{
			doTrackMoves();
		}
		
		if (trackDuplicates == true)
		{
			doTrackDuplicates();
		}
		
		manifest.setLastUpdateDateUtc(new Date());
        */

    }

    protected async updateRecursive(
        currentDirectoryPath: string | null,
        currentManifestDirectory : ManifestDirectory) {

        // Setup data for current directory as it exists in the file system,
		// and attempt to load all of the files and sub-directories for this
		// directory into these maps.
        const fileMap : Map<string, fs.Dirent> = new Map();
        const dirMap : Map<string, fs.Dirent> = new Map();

        if (currentDirectoryPath != null)
        {
            let dir : fs.Dir | null; 
            try {

                dir = fs.opendirSync(currentDirectoryPath);

            } catch (error) {

                let dirPath = Manifest.makeStandardDirectoryPathString(currentManifestDirectory);
                
                if (this.ignoreFile(dirPath)) {

					// This was implemented primarily to allow the user to
					// silence the process of skipping over inaccessible
					// system directories by ignoring them.  For example,
					// in some cases the "$RECYCLE BIN" under Windows
					// is not accessible and will generate an error.  The
					// user can now add such directories to the ignore list
					// and they will be silently ignored.  The special
					// message for showProgress alerts the user that the
					// directory is actually being skipped altogether
					// since it can't be accessed.  The only significant
					// implication of this is that the ignored files won't
					// be enumerated and counted as being ignored.
					if (this.showProgress) {

                        // Only show this if requested since the directory is ignored
						this.writeLine(`${dirPath} [IGNORED DIRECTORY AND CANNOT ACCESS]`);

					}
				}
				else
				{

                    // Always show this because it is an error and probably unexpected
					this.writeLine(`${dirPath} [ERROR: CANNOT ACCESS]`, true);

				}
				
                // TODO: Consider removing files in and below this directory
                // from the manifest like we do for other kinds of missing
                // files.

				return;
            }

            let nextDirEnt: fs.Dirent | null = null;
            while ((nextDirEnt = dir.readSync()) != null) {

                // We use form C because that's what we chose with the original
				// .NET version because it is the default for that platform.
                const normalizedName = nextDirEnt.name.normalize('NFC');

                if (this.ignoreFile(normalizedName) == true) {

                    this.writeLine(`${normalizedName} [IGNORED]`)

                } else if (nextDirEnt.isFile()) {

                    fileMap.set(normalizedName, nextDirEnt);

                } else if (nextDirEnt.isDirectory()) {

                    dirMap.set(normalizedName, nextDirEnt);

                } else {

                    this.writeLine(`${normalizedName} [ERROR UNKNOWN FILE ENTRY TYPE]`);

                }
            }

            dir.close();
        }


        //
        // Iterate through existing manifest entries
        //

        // Clone in case we modify during iteration
        let manifestFilesClone = currentManifestDirectory.files.slice(); 
        for (let nextManFile of manifestFilesClone) {

            this.writeLine(`NEXTFILE: ${Manifest.makeStandardFilePathString(nextManFile)}`);
            const nextFileDirEnt = fileMap.get(nextManFile.name);
            if (nextFileDirEnt != undefined) {

                const filePath = `${currentDirectoryPath}/${nextManFile.name}`;
                const digest = await this.makeFileHash(filePath, nextManFile.hashType);

                this.writeLine(`${filePath}: ${nextManFile.hashData == digest}`);

            } else {

                // TODO: Handle missing files
                this.writeLine(`MISSING: ${nextManFile.name}`);
                // TODO: Emit event
                // TODO: Remove from manifest
                // TODO: Add to missing files list
            }
        }


        //
        // Recurse looking for directories in manifest
        //

        // Clone in case we modify during iteration
        // TODO: Finish this section
        let manifestDirectoriesClone = currentManifestDirectory.subdirectories.slice();
        for (let nextManDir of manifestDirectoriesClone)
        {
            await this.updateRecursive(
                `${currentDirectoryPath}/${nextManDir.name}`,
                nextManDir);
        }


        //
        // Look for new files in this directory
        //


        //
        // Recurse looking for new directories
        //
    }

    protected message = "";
    protected write(message: string) {

        this.message += message;

    }

    protected writeLine(message: string = "", force: boolean = false) {

        this.write(message);
        if (this.showProgress) console.log(message);
        this.message = "";

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