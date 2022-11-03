import ManifestObject from './ManifestObject.js';
import ManifestFile from './ManifestFile.js';


export default class ManifestDirectory extends ManifestObject {

    public files: Map<string, ManifestFile>;
    public subdirectories: Map<string, ManifestDirectory>;

    constructor(
        name: string,
        parent: ManifestDirectory | null) {
        super(name, parent);

        this.files             = new Map();
        this.subdirectories    = new Map();
    }

    public static fromPlainObject(obj: any, parent: ManifestDirectory | null): ManifestDirectory {

        const directory = new ManifestDirectory(obj.Name, parent);

        for (const prop in obj.Files) {
            const nextFilePlainObj: any = obj.Files[prop];
            const nextFileManifestObj =
                ManifestFile.fromPlainObject(nextFilePlainObj, directory);

            directory.files.set(nextFileManifestObj.name, nextFileManifestObj);
        }

        for (const prop in obj.Subdirectories) {
            const nextDirectoryPlainObj: any = obj.Subdirectories[prop];
            const nextDirectoryManifestObj: ManifestDirectory =
                ManifestDirectory.fromPlainObject(nextDirectoryPlainObj, directory);

            directory.subdirectories.set(nextDirectoryManifestObj.name, nextDirectoryManifestObj);
        }

        return directory;
    }

    public toPlainObject(): any {

        let obj: any = {
            'Name': this.name
        };

        obj.Files = {};
        for (const [name, file] of this.files) {
            obj.Files[file.name] = file.toPlainObject();
        }

        obj.Subdirectories = {};
        for (const [name, directory] of this.subdirectories) {
            obj.Subdirectories[directory.name] = directory.toPlainObject();
        }

        return obj;
    }

    public isEmpty(): boolean {

        return this.files.size == 0 && this.subdirectories.size == 0;
    }
}