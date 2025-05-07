import { EntityCollectionRaw } from "../types";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
export interface Migrations {
    [migrationVersionKey: string]: (fileContent: any) => any;
}
/**
 * This class takes a representation of any entity collection file (whatever the version of the file)
 * and will return a version of that file updated to the latest version.
 */
class EntitiesFileMigration {
    private readonly migrations: Migrations;

    constructor() {
        this.migrations = {
            "0.0": (fileContent: any) => this.migrate_v0_to_v1(fileContent),
            "1.0": (fileContent) => fileContent,
        };
    }

    public migrate(entitiesFileContent: any): EntityCollectionRaw {
        for (const [version, migrationFunction] of Object.entries(this.migrations)) {
            const fileVersion = entitiesFileContent.version ?? "0.0";
            if (fileVersion === version) {
                try {
                    entitiesFileContent = migrationFunction(entitiesFileContent);
                } catch (error) {
                    // Remove this when tsconfig target is ES2022 (only supported on ES2022)
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    throw new Error(
                        `Unable to parse entity file content in EntityCollectionRaw format migration version : ${version}`,
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        //@ts-ignore
                        {
                            cause: error,
                        }
                    );
                }
            }
        }

        return EntityCollectionRaw.parse(entitiesFileContent);
    }

    private migrate_v0_to_v1(fileContent: any): any {
        return {
            ...fileContent,
            version: "1.0",
            collection: fileContent.collection.map((entity: any) => ({
                ...entity,
                id: `${fileContent.collectionName}:${entity.name}:${entity.color}:${entity.direction}`,
            })),
        };
    }

    public getLatestVersion(): string {
        return Object.keys(this.migrations)[Object.keys(this.migrations).length - 1];
    }
}

export const entitiesFileMigration = new EntitiesFileMigration();
