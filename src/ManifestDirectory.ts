import ManifestObject from './ManifestObject.js';
import ManifestFile from './ManifestFile.js';


export default class ManifestDirectory extends ManifestObject {

    public files: ManifestFile[];
    public subdirectories: ManifestDirectory[];

    constructor(
        name: string,
        parent: ManifestDirectory | null) {
        super(name, parent);

        this.files             = [];
        this.subdirectories    = [];
    }

    public static fromPlainObject(obj: any, parent: ManifestDirectory | null): ManifestDirectory {

        let directory = new ManifestDirectory(obj.Name, parent);

        for (const prop in obj.Files) {
            let nextFile: any = obj.Files[prop];
            directory.files.push(ManifestFile.fromPlainObject(nextFile, directory));
        }

        for (const prop in obj.Subdirectories) {
            let nextDirectory: any = obj.Subdirectories[prop];
            directory.subdirectories.push(ManifestDirectory.fromPlainObject(nextDirectory, directory));
        }

        return directory;
    }

    public toPlainObject(): any {
        
        let obj: any = {
            'Name': this.name
        };

        obj.Files = {};
        for (const file of this.files) {
            obj.Files[file.name] = file.toPlainObject();
        }

        obj.Subdirectories = {};
        for (const directory of this.subdirectories) {
            obj.Subdirectories[directory.name] = directory.toPlainObject();
        }

        return obj;
    }

    public isEmpty(): boolean {

        return this.files.length == 0 && this.subdirectories.length == 0;
    }
}