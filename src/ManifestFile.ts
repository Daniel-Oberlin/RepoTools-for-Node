import ManifestObject from './ManifestObject.js';
import ManifestDirectory from './ManifestDirectory.js';

export default class ManifestFile extends ManifestObject
{
    public length: number;
    public lastModifiedUtc: Date;
    public registeredUtc: Date;
    public hashType: string;
    public hashData: string;

    constructor(
        name: string,
        parent: ManifestDirectory | null,
        length: number,
        lastModifiedUtc: Date,
        registeredUtc: Date,
        hashType: string,
        hashData: string)
    {
        super(name, parent);

        this.length             = length;
        this.lastModifiedUtc    = lastModifiedUtc;
        this.registeredUtc      = registeredUtc;
        this.hashType           = hashType;
        this.hashData           = hashData;
    }

    static fromPlainObject(obj:any, parent:ManifestDirectory): ManifestFile
    {
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
}