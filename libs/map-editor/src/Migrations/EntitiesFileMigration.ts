import { EntityCollectionRaw } from "../types";

export interface Migrations {
    v0: (fileContent: any) => any;
    v1: (fileContent: any) => any;
}

export class EntitiesFileMigration {
    private entitiesFileContent: any;
    private readonly migrations: Migrations;

    constructor(entitiesFileContent: any) {
        this.entitiesFileContent = entitiesFileContent;
        this.migrations = {
            v0: (fileContent: any) => this.migrate_v0_to_v1(fileContent),
            v1: () => this.entitiesFileContent,
        };
    }

    public getLastVersionForEntitiesFile(): EntityCollectionRaw {
        for (const [version, migrationFunction] of Object.entries(this.migrations)) {
            const fileVersion = this.mapFileVersionToMigrationVersion();
            if (fileVersion === version) {
                this.entitiesFileContent = migrationFunction(this.entitiesFileContent);
            }
        }
        return EntityCollectionRaw.parse(this.entitiesFileContent);
    }

    private mapFileVersionToMigrationVersion(): keyof Migrations {
        const { version } = this.entitiesFileContent as unknown as { version?: string };
        switch (version) {
            case "1.0": {
                return "v1";
            }
            default:
                return "v0";
        }
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
