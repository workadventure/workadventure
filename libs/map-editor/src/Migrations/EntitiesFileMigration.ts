import { EntityCollectionRaw } from "../types";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions */
export interface Migrations {
    [migrationVersionKey: string]: (fileContent: any) => any;
}

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
                entitiesFileContent = migrationFunction(entitiesFileContent);
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
}

export const entitiesFileMigration = new EntitiesFileMigration();
