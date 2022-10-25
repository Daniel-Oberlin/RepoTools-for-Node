import ManifestDirectory from './ManifestDirectory.js';

export default abstract class ManifestObject {
    private _name: string;
    private _parent: ManifestDirectory | null;

    constructor(name: string, parent: ManifestDirectory | null) {
        this._name = name;
        this._parent = parent;
    }

    public get name() : string {
        return this._name;
    }

    private set name(val: string) {
        this._name = val;
    }

    public get parent() : ManifestDirectory | null {
        return this._parent;
    }
}