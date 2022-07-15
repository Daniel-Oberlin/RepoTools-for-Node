import * as fs from 'fs';

import Manifest from './Manifest.js';
import ManifestDirectory from './ManifestDirectory.js';
import ManifestObject from './ManifestObject.js';

export default class RepositoryToolApp
{
    constructor() {

    }

    test() {

        let rawData = fs.readFileSync(`.repositoryManifest`);
        let manifestObj = JSON.parse(rawData.toString());

        let manifest  = Manifest.fromPlainObject(manifestObj);


        return 5;
    }
}