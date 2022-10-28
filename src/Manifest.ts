import * as crypto from 'crypto';
import * as path from 'path';

import ManifestFile from './ManifestFile.js';
import ManifestDirectory from './ManifestDirectory.js';
import ManifestObject from './ManifestObject.js';


export default class Manifest {
    public guid: string;
    public rootDirectory: ManifestDirectory;
    public inceptionUtc: Date;
    public lastUpdateUtc: Date | null;
    public lastValidateUtc: Date | null;
    public ignoreList: string[];
    public defaultHashMethod: string;

    private static theDefaultHashMethod: string = 'MD5';
    private static theDateTimeComparisonToleranceInMilliseconds = 2000;
    private static theDefaultIgnoreList: string[] =
        [
            '^\\./\\.repositoryManifest$',
            '^\\./temp-repository/'
        ];

    private static standardManifestFileName = '.repositoryManifest';
    private static defaultManifestStandardFilePath = './' +
        this.standardManifestFileName;

    constructor() {
        this.guid              = crypto.randomUUID();
        this.rootDirectory     = new ManifestDirectory(".", null);
        this.inceptionUtc      = new Date();
        this.lastUpdateUtc     = null;
        this.lastValidateUtc   = null;
        this.ignoreList        = Manifest.theDefaultIgnoreList.slice();
        this.defaultHashMethod = Manifest.theDefaultHashMethod;
    }

    public static fromPlainObject(obj: any): Manifest {
        let manifest = new Manifest();

        manifest.guid = obj.Guid;
        manifest.inceptionUtc = new Date(obj.InceptionDateUtc);

        if ('LastUpdateDateUtc' in obj)
            manifest.lastUpdateUtc = new Date(obj.LastUpdateDateUtc);

        if ('LastValidateDateUtc' in obj)
            manifest.lastValidateUtc = new Date(obj.LastValidateDateUtc);

        manifest.ignoreList = obj.IgnoreList.slice();
        manifest.defaultHashMethod = obj.DefaultHashMethod;

        manifest.rootDirectory =
            ManifestDirectory.fromPlainObject(obj.RootDirectory, null);

        return manifest;
    }

    public toPlainObject() : any {
        let obj: any = {};

        obj.Guid = this.guid;
        obj.InceptionDateUtc = this.inceptionUtc.toJSON();

        if (this.lastUpdateUtc != null)
            obj.LastUpdateDateUtc = this.lastUpdateUtc.toJSON();
        
        if (this.lastValidateUtc != null)
            obj.LastValidateDateUtc = this.lastValidateUtc.toJSON();

        obj.IgnoreList = this.ignoreList.slice();
        obj.DefaultHashMethod = this.defaultHashMethod;

        obj.RootDirectory = this.rootDirectory.toPlainObject();

        return obj;
    }

	// Make a standard UNIX-style relative path, which will not
	// vary across platforms.
    public static makeStandardFilePathString(manFile: ManifestFile) : string {

        return this.makeStandardDirectoryPathString(manFile.fileParent) + manFile.name;

    }

    // Make a standard UNIX-style relative path, which will not
	// vary across platforms.
    public static makeStandardDirectoryPathString(manDirectory: ManifestDirectory) : string {

        let pathString = manDirectory.name + '/';

        let parent = manDirectory.parent;
        if (parent != null) pathString = this.makeStandardDirectoryPathString(parent) + pathString;

        return pathString;

    }

    public static makeNativeFilePathString(manFile: ManifestFile) : string {

        return path.resolve(this.makeStandardFilePathString(manFile));
   
    }

    public static makeNativeDirectoryPathString(manDir: ManifestDirectory) : string {

        return path.resolve(this.makeStandardDirectoryPathString(manDir));
   
    }

	// For various reasons, we tolerate up to two seconds difference between
    // times recorded in the filesystem and the manifest.
	public static compareDatesWithTolerance(date1:Date, date2:Date):boolean {

		return Math.abs(date1.getTime() - date2.getTime()) <=
            this.theDateTimeComparisonToleranceInMilliseconds;

	}

    public static getDefaultHashMethod():string {

        return this.theDefaultHashMethod;

    }
}