import { EntityCollectionRaw } from "../types";
import { EntitiesVersion10 } from "./EntitiesMigrations/EntitiesVersion1_0";
import { EntitiesVersionMigration } from "./WamMigrations/AbstractWamVersionMigration";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Migrations {
    [migrationVersionKey: string]: (fileContent: any) => any;
}
/**
 * This class takes a representation of any entity collection file (whatever the version of the file)
 * and will return a version of that file updated to the latest version.
 */
class EntitiesFileMigration {
    constructor(private lastVersion: EntitiesVersionMigration = new EntitiesVersion10()) {}

    public migrate(entitiesFileContent: any): EntityCollectionRaw {
        return EntityCollectionRaw.parse(this.lastVersion.migrate(entitiesFileContent));
    }

    public getLatestVersion(): string {
        return this.lastVersion.getVersion();
    }
}

export const entitiesFileMigration = new EntitiesFileMigration();
