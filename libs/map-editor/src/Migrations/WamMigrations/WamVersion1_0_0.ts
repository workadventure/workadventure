import { WAMFileFormat } from "../../types";
import { WamVersionMigration } from "./AbstractWamVersionMigration";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */

export class WamVersion100 extends WamVersionMigration {
    version = "1.0.0";
    constructor() {
        super();
    }

    public applyMigration(fileContent: any): WAMFileFormat {
        return {
            ...fileContent,
            version: this.getMigrationVersion(),
        };
    }
}
