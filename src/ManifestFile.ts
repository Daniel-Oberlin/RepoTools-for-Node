import ManifestObject from './ManifestObject.js';
import ManifestDirectory from './ManifestDirectory.js';

export default class ManifestFile extends ManifestObject {

    public length: number;
    public lastModifiedUtc: Date;
    public registeredUtc: Date;
    public hashType: string;
    public hashData: string;

    protected _fileParent: ManifestDirectory;

    constructor(
        name: string,
        parent: ManifestDirectory,
        length: number = 0,
        lastModifiedUtc: Date = new Date(0),
        registeredUtc: Date = new Date(0),
        hashType: string = "",
        hashData: string = "") {
        super(name, parent);

        this.length             = length;
        this.lastModifiedUtc    = lastModifiedUtc;
        this.registeredUtc      = registeredUtc;
        this.hashType           = hashType;
        this.hashData           = hashData;
        this._fileParent         = parent;
    }

    public static fromPlainObject(obj:any, parent:ManifestDirectory): ManifestFile {
        return new ManifestFile(
            obj.Name,
            parent,
            obj.FileLength,
            new Date(obj.LastModifiedUtc),
            new Date(obj.RegisteredUtc),
            obj.FileHash.HashType,
            obj.FileHash.HashData
        );
    }

    public toPlainObject(): any {
        return {
            'Name': this.name,
            'FileLength' : this.length,
            'LastModifiedUtc': this.lastModifiedUtc.toJSON(),
            'RegisteredUtc': this.registeredUtc.toJSON(),
            'FileHash': {
                'HashType': this.hashType,
                'HashData': this.hashData
            }
        }
    }

    public get fileParent() : ManifestDirectory {
        return this._fileParent;
    }
}