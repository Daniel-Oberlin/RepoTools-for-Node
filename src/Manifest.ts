import * as crypto from "crypto";

import ManifestDirectory from "./ManifestDirectory.js";


export default class Manifest
{
    public guid: string;
    public rootDirectory: ManifestDirectory;
    public inceptionUtc: Date;
    public lastUpdateUtc: Date | null;
    public lastValidateUtc: Date | null;
    public ignoreList: string[];
    public defaultHashMethod: string;

    private static theDefaultHashMethod: string = "MD5";
    private static theDefaultIgnoreList: string[] =
        [
            "^\\./\\.repositoryManifest$",
            "^\\./temp-repository/"
        ];

    constructor()
    {
        this.guid              = crypto.randomUUID();
        this.rootDirectory     = new ManifestDirectory(".", null);
        this.inceptionUtc      = new Date();
        this.lastUpdateUtc     = null;
        this.lastValidateUtc   = null;
        this.ignoreList        = Manifest.theDefaultIgnoreList.slice();
        this.defaultHashMethod = Manifest.theDefaultHashMethod;
    }

    public static fromPlainObject(obj: any) : Manifest
    {
        let manifest = new Manifest();

        manifest.guid = obj.Guid;
        manifest.inceptionUtc = new Date(obj.InceptionDateUtc);

        if ('LastUpdateDateUtc' in obj)
            manifest.lastUpdateUtc = new Date(obj.LastUpdateDateUtc);

        if ('LastValidateDateUtc' in obj)
            manifest.lastValidateUtc = new Date(obj.LastValidateDateUtc);

        manifest.ignoreList = obj.IgnoreList;
        manifest.defaultHashMethod = obj.DefaultHashMethod;

        manifest.rootDirectory =
            ManifestDirectory.fromPlainObject(obj.RootDirectory, null);

        return manifest;
    }
}