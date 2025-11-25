import { EntityCollectionRaw, WAMFileFormat } from "../../types";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any , @typescript-eslint/no-unsafe-member-access */

export abstract class VersionMigration<T extends WAMFileFormat | EntityCollectionRaw> {
    abstract version: string;

    constructor(protected firstVersion: string, private readonly previousVersion?: VersionMigration<T>) {}

    public migrate(fileContent: any): T {
        if (this.previousVersion && fileContent.version !== this.version) {
            return this.migration(this.previousVersion.migrate(fileContent));
        }
        return this.migration(fileContent);
    }

    public getVersion(): string {
        return this.version;
    }

    protected abstract migration(fileContent: any): T;
}

export abstract class WamVersionMigration extends VersionMigration<WAMFileFormat> {
    constructor(previousVersion?: WamVersionMigration) {
        super("1.0.0", previousVersion);
    }

    protected abstract migration(fileContent: any): WAMFileFormat;
}

export abstract class EntitiesVersionMigration extends VersionMigration<EntityCollectionRaw> {
    constructor(previousVersion?: EntitiesVersionMigration) {
        super("0.0", previousVersion);
    }
    protected abstract migration(fileContent: any): EntityCollectionRaw;
}
