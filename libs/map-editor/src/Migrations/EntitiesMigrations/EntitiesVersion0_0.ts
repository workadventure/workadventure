import { EntityCollectionRaw } from "../..";
import { EntitiesVersionMigration } from "../WamMigrations/AbstractWamVersionMigration";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return */

export class EntitiesVersion00 extends EntitiesVersionMigration {
    version = "0.0";
    constructor() {
        super();
    }

    protected migration(fileContent: any): EntityCollectionRaw {
        return fileContent;
    }
}
