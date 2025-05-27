import { WAMFileFormat } from "../types";
import { WamVersionMigration } from "./WamMigrations/AbstractWamVersionMigration";
import { WamVersion201 } from "./WamMigrations/WamVersion2_0_1";
/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * This class takes a representation of any wam file (whatever the version of the file)
 * and will return a version of that file updated to the latest version.
 */

export class WamFileMigration {
    constructor(private lastVersion: WamVersionMigration = new WamVersion201()) {}

    public migrate(wamFileContent: any): WAMFileFormat {
        return WAMFileFormat.parse(this.lastVersion.migrate(wamFileContent));
    }

    public getLatestVersion(): string {
        return this.lastVersion.getVersion();
    }
}

export const wamFileMigration = new WamFileMigration();
