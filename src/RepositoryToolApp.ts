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

        let jsonObj: any = manifest.toPlainObject();
        let jsonContent = JSON.stringify(jsonObj);
        fs.writeFile(".repositoryManifest", jsonContent, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }
            console.log("JSON file has been saved.");
        });


        return 5;
    }
}