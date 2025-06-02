import { WAMFileFormat } from "../../types";
import { WamVersionMigration } from "./AbstractWamVersionMigration";
import { WamVersion200 } from "./WamVersion2_0_0";
/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type

 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

export class WamVersion201 extends WamVersionMigration {
    version = "2.0.1";
    constructor() {
        super(new WamVersion200());
    }

    public migration(fileContent: any): WAMFileFormat {
        return {
            ...fileContent,
            version: this.getVersion(),
            entityCollections: fileContent.entityCollections.concat([
                {
                    url: "https://limezu-entities-julio.workadventu.re/modern-office/collection.json",
                    type: "file",
                },
                {
                    url: "https://limezu-entities-julio.workadventu.re/modern-interior/collection.json",
                    type: "file",
                },
                {
                    url: "https://limezu-entities-julio.workadventu.re/modern-exterior/collection.json",
                    type: "file",
                },
            ]),
        };
    }
}
