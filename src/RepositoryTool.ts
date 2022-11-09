import * as fs from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

import Manifest from './Manifest.js';
import ManifestDirectory from './ManifestDirectory.js';
import ManifestFile from './ManifestFile.js';

export default class RepositoryTool {

    protected manifest: Manifest;

    // Update options
    public showProgress: boolean = true;
    public doUpdate: boolean = false;
    public alwaysCheckHash: boolean = false;
    public makeNewHash: boolean = false;
    public backDate: boolean = false;
    public trackMoves: boolean = true;
    public trackDuplicates: boolean = true;

    // Collections
    public newFiles: ManifestFile[] = [];
    public changedFiles: ManifestFile[] = [];
    public missingFiles: ManifestFile[] = [];
    public lastModifiedDateFiles: ManifestFile[] = [];
    public errorFiles: ManifestFile[] = [];
    public ignoredFiles: ManifestFile[] = [];
    public newlyIgnoredFiles: ManifestFile[] = [];
    public movedFiles: Map<string, [oldFiles: ManifestFile[], newFiles: ManifestFile[]]> = new Map();
    public movedFileOrder: string[] = [];
    public duplicateFiles: Map<string, ManifestFile[]> = new Map();
    public newFilesForGroom: string[] = [];
    public ignoredFilesForGroom: string[] = [];

    // Statistics
    public fileCheckedCount: number = 0;

    constructor(manifest: Manifest) {

        this.manifest = manifest;

    }

    public clear()
	{
        this.newFiles = [];
        this.changedFiles = [];
        this.missingFiles = [];
        this.lastModifiedDateFiles = [];
        this.errorFiles = [];
        this.ignoredFiles = [];
        this.newlyIgnoredFiles = [];
        this.movedFiles = new Map();
        this.movedFileOrder = [];
        this.duplicateFiles = new Map();
        this.newFilesForGroom = [];
        this.ignoredFilesForGroom = [];

        this.fileCheckedCount = 0;
	}

    public async update() {

        this.clear();

        await this.updateRecursive('.', this.manifest.rootDirectory);

        this.trackMoves && this.doTrackMoves();
        this.trackDuplicates && this.doTrackDuplicates();
	
        this.manifest.lastUpdateUtc = new Date();

    }

    protected async updateRecursive(
        currentNativeDirectoryPath: string | null,
        currentManifestDirectory: ManifestDirectory) {

        // Setup data for current directory as it exists in the file system,
		// and attempt to load all of the files and sub-directories for this
		// directory into these maps.
        const fileSet: Set<string> = new Set();
        const dirSet: Set<string> = new Set();

        this.populateFileAndDirSets(
            currentNativeDirectoryPath,
            currentManifestDirectory,
            fileSet,
            dirSet);
            
        await this.updateFilesFromManifestDirectory(
            currentManifestDirectory,
            fileSet);

        await this.updateDirectoriesFromManifestDirectory(
            currentManifestDirectory,
            dirSet);

        await this.findNewFilesInDirectory(
            currentManifestDirectory,
            fileSet);

        await this.findNewSubdirectories(
            currentManifestDirectory,
            dirSet);

    }


    protected populateFileAndDirSets(
        currentNativeDirectoryPath:string | null,
        currentManifestDirectory:ManifestDirectory,
        fileSet: Set<string>,
        dirSet: Set<string>) {

        if (currentNativeDirectoryPath != null) {

            let dir: fs.Dir | null; 
            try {

                dir = fs.opendirSync(currentNativeDirectoryPath);

            } catch (error) {

                const dirPath = Manifest.makeStandardDirectoryPathString(currentManifestDirectory);
                
                if (this.ignoreFile(dirPath)) {

                    this.writeLine(`${dirPath} [IGNORED DIRECTORY AND CANNOT ACCESS]`);

                } else {

                    this.writeLine(`${dirPath} [ERROR: CANNOT ACCESS]`, true);

                }
                
                // TODO: Consider removing files in and below this directory
                // from the manifest like we do for other kinds of missing
                // files.  Implement gatherRecursive method.

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

                    fileSet.add(normalizedName);

                } else if (nextDirEnt.isDirectory()) {

                    dirSet.add(normalizedName);

                } else {

                    this.writeLine(`${normalizedName} [ERROR UNKNOWN FILE ENTRY TYPE]`);

                }
            }

            dir.close();
        }
    }

    protected async updateFilesFromManifestDirectory(
        currentManifestDirectory: ManifestDirectory,
        fileSet: Set<string>) {

        // Clone in case we modify during iteration
        const manifestFilesClone = new Map(currentManifestDirectory.files);
        for (const [name, nextManFile] of manifestFilesClone) {

            const filePath = Manifest.makeStandardFilePathString(nextManFile);
            this.write(filePath);

            if (fileSet.has(name)) {

                this.fileCheckedCount++;
                const nextFileStat = fs.statSync(
                    Manifest.makeNativeFilePathString(nextManFile));

                if (this.ignoreFile(filePath)) {

                    this.write(' [NEWLY IGNORED]');

                    currentManifestDirectory.files.delete(name);
                    this.newlyIgnoredFiles.push(nextManFile);

                // TODO: consider putting conditional test logic into method
                } else if (nextManFile.length != nextFileStat.size &&
                    this.doUpdate == false &&
                    this.alwaysCheckHash == false) {

                    // Don't compute hash under these conditions

                    this.write(' [DIFFERENT]');
                    this.changedFiles.push(nextManFile);

                // TODO: consider putting conditional test logic into method
                } else if (this.alwaysCheckHash == true ||
					this.makeNewHash == true ||
					nextManFile.hashData == '' ||
					Manifest.compareDatesWithTolerance(
                        new Date(nextFileStat.mtimeMs),
						nextManFile.lastModifiedUtc) == false ||
					nextFileStat.size != nextManFile.length) {

                    // Compute the hash under these conditions

                    let exception:any;
                    let checkHash:string = '';

                    try {

                        checkHash = await this.computeFileHash(nextManFile);

                    } catch (ex) {

                        exception = ex;

                    }

                    if (exception != null) {

                        this.writeLine(' [ERROR]');
                        this.writeLine(exception.toString());
                        
                        this.errorFiles.push(nextManFile);

                    } else {

                        if (nextManFile.hashData == '') {

                            this.write(' [EMPTY HASH IN MANIFEST]');
                            this.changedFiles.push(nextManFile);

                        } else if (checkHash != nextManFile.hashData) {

                            this.write(' [DIFFERENT]');
                            this.changedFiles.push(nextManFile);

                        } else {

                            if (Manifest.compareDatesWithTolerance(
                                new Date(nextFileStat.mtimeMs),
                                    nextManFile.lastModifiedUtc) == false)
                            {
                                this.write(' [LAST MODIFIED DATE]');
                                this.lastModifiedDateFiles.push(nextManFile);
                            
                                if (this.backDate) {
                                    
                                    // Update last modified date
                                    fs.utimesSync(
                                        Manifest.makeNativeFilePathString(nextManFile),
                                        new Date(nextFileStat.atimeMs),
                                        nextManFile.lastModifiedUtc);
                                    
                                }
                            }
                        }
                    }

                    let newHash = checkHash;

                    if (this.makeNewHash) {

                        try {

                            nextManFile.hashType = this.manifest.defaultHashMethod;
                            nextManFile.hashData = '';

                            newHash = await this.computeFileHash(nextManFile);

                        } catch (ex: any) {

                            this.writeLine(' [ERROR MAKING NEW HASH]');
                            if (ex != null)this.writeLine(ex.toString());
                            this.errorFiles.push(nextManFile);
                        }

                    }

                    // Update hash, last modified date and size accordingly
                    nextManFile.hashData = newHash;
                    
                    nextManFile.lastModifiedUtc =
                        new Date(nextFileStat.mtimeMs);
                    
                    nextManFile.length = nextFileStat.size;

                } else {

					this.write(' [SKIPPED]');

				}

			} else {

				this.write(' [MISSING]');
                currentManifestDirectory.files.delete(name);
				this.missingFiles.push(nextManFile);

			}
			
			this.writeLine('');

        }

    }

    protected async updateDirectoriesFromManifestDirectory(
        currentManifestDirectory: ManifestDirectory,
        dirSet: Set<string>) {

        // Clone in case we modify during iteration
        const manifestDirectoriesClone = new Map(currentManifestDirectory.subdirectories); 
        for (const [name, nextManDir] of manifestDirectoriesClone) {

            let dirExists = false;
            if (dirSet.has(name)) {

                dirExists = true;
                const dirPath = Manifest.makeNativeDirectoryPathString(nextManDir);
                
                await this.updateRecursive(
                    dirPath,
                    nextManDir);

            }
                
            if (nextManDir.isEmpty() || dirExists == false) {

                currentManifestDirectory.subdirectories.delete(name);

                // TODO: Address the fact that missingFiles isn't updated
                // do we need to be tracking missingFiles for this?
                // Add gatherRecursive?

            }

        }

    }

    protected async findNewFilesInDirectory(
        currentManifestDirectory: ManifestDirectory,
        fileSet: Set<string>) {

        for (const nextFileName of fileSet) {

            if (currentManifestDirectory.files.has(nextFileName) == false) {

                const newManFile = new ManifestFile(
                    nextFileName,
                    currentManifestDirectory);

                newManFile.registeredUtc = new Date();

                const standardFilePath =
                    Manifest.makeStandardFilePathString(newManFile);

                const nativeFilePath =
                    Manifest.makeNativeFilePathString(newManFile);

                this.write(standardFilePath);

                if (this.ignoreFile(standardFilePath)) {

                    this.ignoredFiles.push(newManFile);

                    // Don't groom the manifest file!
                    if (this.isManifestFile(standardFilePath) == false) {
                        this.ignoredFilesForGroom.push(nativeFilePath);
                    }

                    this.write(' [IGNORED]');

                } else {

                    this.fileCheckedCount++;

                    let exception = undefined;

                    if (this.doUpdate == true ||
                        this.alwaysCheckHash == true ||
                        this.trackMoves == true) {

                        try {

                            newManFile.hashType = Manifest.getDefaultHashMethod();
                            newManFile.hashData = await this.computeFileHash(newManFile);
    
                        } catch (ex: any) {
    
                            exception = ex;
                            this.writeLine(' [ERROR READING FILE DATA]');

                        }

                    }

                    if (exception == undefined) {

                        try {

                            const newFileStat = fs.statSync(nativeFilePath);

                            newManFile.length = newFileStat.size;
                            newManFile.lastModifiedUtc = new Date(newFileStat.mtimeMs);

                        } catch (ex: any) {
    
                            exception = ex;
                            this.writeLine(' [ERROR GETTING FILE PROPERTIES]');

                        }

                    }

                    if (exception != undefined) {

                        if (exception != null) {

                            this.writeLine(exception.toString());

                        }

                        this.errorFiles.push(newManFile);

                    } else {

                        currentManifestDirectory.files.set(
                            newManFile.name,
                            newManFile);

                        this.newFiles.push(newManFile);
                        this.newFilesForGroom.push(nativeFilePath);

                        this.writeLine(' [NEW]');

                    }

                }

            }

        }

    }

    protected async findNewSubdirectories(
        currentManifestDirectory: ManifestDirectory,
        dirSet: Set<string>) {

        for (const nextDirName of dirSet) {
			
			if (currentManifestDirectory.subdirectories.has(
				nextDirName) == false) {

				const nextManDir = new ManifestDirectory(
                    nextDirName,
                    currentManifestDirectory);
			
				currentManifestDirectory.subdirectories.set(
                    nextDirName,
                    nextManDir);
			
				await this.updateRecursive(
					Manifest.makeNativeDirectoryPathString(nextManDir),
					nextManDir);
			
				if (nextManDir.isEmpty()) {

					currentManifestDirectory.subdirectories.delete(
						nextDirName);

				}

			}

		}

    }

    protected doTrackMoves() {

        // Map of file hash to lists of missing and new files with that hash
        const missingFilesMap =  new Map<string, ManifestFile[]>();
        this.hashFilesMapHelper(this.missingFiles, missingFilesMap);

        const newFilesMap = new Map<string, ManifestFile[]>();
        this.hashFilesMapHelper(this.newFiles, missingFilesMap);

		for (const checkMissingFile of this.missingFiles) {

            const hash = checkMissingFile.hashData;
            const missingFiles = missingFilesMap.get(hash);
            const newFiles = newFilesMap.get(hash);

            // Do this way for TypeScript
			if (this.movedFiles.has(hash) == false &&
                missingFiles != undefined &&
                newFiles != undefined) {
                    
                this.movedFiles.set(hash, [missingFiles, newFiles]);
                this.movedFileOrder.push(hash);
                
            }

        }

        this.missingFiles = this.missingFiles.filter(
            file => !this.movedFiles.has(file.hashData));

        this.newFiles = this.newFiles.filter(
            file => !this.movedFiles.has(file.hashData));

        this.newFilesForGroom = [];
        this.newFiles.map(
            file => this.newFilesForGroom.push(
                Manifest.makeNativeFilePathString(file)));

    }

    protected doTrackDuplicates() {

        this.duplicateFiles = new Map();

        const filesByHash = new Map<string, ManifestFile[]>();
        this.trackDuplicatesRecursive(this.manifest.rootDirectory, filesByHash);

        for (const [hash, files] of filesByHash) {

            if (files.length > 1) {

                this.duplicateFiles.set(hash, files);

            }

        }
    }

    protected trackDuplicatesRecursive(
        currentDirectory: ManifestDirectory,
        filesByHash: Map<string, ManifestFile[]>)
    {
        this.hashFilesMapHelper(currentDirectory.files.values(), filesByHash);

        for (const checkDirectory of currentDirectory.subdirectories.values()) {

            this.trackDuplicatesRecursive(checkDirectory, filesByHash);

        }

    }

    protected hashFilesMapHelper(
        fileList: Iterable<ManifestFile>,
        filesMap:Map<string, ManifestFile[]>) {

        for (const checkFile of fileList) {

            const tryFilesList = filesMap.get(checkFile.hashData);
            const filesList = tryFilesList != undefined ? tryFilesList : [];
            tryFilesList == undefined && filesMap.set(checkFile.hashData, filesList);
            filesList.push(checkFile);

        }

    }

    protected message = '';
    protected write(message: string) {

        this.message += message;

    }

    protected writeLine(message: string = '', force: boolean = false) {

        this.write(message);
        if (this.showProgress || force) console.log(this.message);
        this.message = '';

    }

    protected ignoreFile(filename: string): boolean {

        // TODO: fully implement
        return filename == '.repositoryManifest';

    }

    protected isManifestFile(filename: string): boolean {

        // TODO: fully implement
        return filename == '.repositoryManifest';

    }

    protected async computeFileHash(manFile: ManifestFile): Promise<string> {

        const filePath = Manifest.makeNativeFilePathString(manFile);
        const fileStream = fs.createReadStream(filePath);

        const hashType = (manFile.hashType != '' ? manFile.hashType :
            Manifest.getDefaultHashMethod()).toLowerCase();

        const hash = createHash(hashType).setEncoding('base64');
        await pipeline(fileStream, hash);
        return hash.read();

    }
}