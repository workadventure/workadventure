import { WAMFileFormat } from "../../types";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export abstract class WamVersionMigration {
    abstract version: string;

    constructor(private readonly previousVersion?: WamVersionMigration) {
        this.validatePreviousVersion();
    }

    public migrate(fileContent: any): WAMFileFormat {
        if (this.previousVersion) {
            return this.migration(this.previousVersion.migrate(fileContent));
        }
        return this.migration(fileContent);
    }

    public getVersion(): string {
        return this.version;
    }

    private validatePreviousVersion(): void {
        if (this.previousVersion && this.previousVersion.version === this.version) {
            throw new Error(`Previous version is the same as the current version for version ${this.version}.`);
        }
    }

    protected abstract migration(fileContent: any): WAMFileFormat;
}
