import { WAMFileFormat } from "../types";
import { Migrations } from "./EntitiesFileMigration";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
/**
 * This class takes a representation of any wam file (whatever the version of the file)
 * and will return a version of that file updated to the latest version.
 */
class WamFileMigration {
    private readonly migrations: Migrations;

    constructor() {
        this.migrations = {
            "1.0.0": (fileContent: any) => this.migrate_v1_to_v2(fileContent),
            "2.0.0": (fileContent) => fileContent,
        };
    }

    public migrate(wamFileContent: any): WAMFileFormat {
        for (const [version, migrationFunction] of Object.entries(this.migrations)) {
            const fileVersion = wamFileContent.version ?? "1.0.0";
            if (fileVersion === version) {
                try {
                    wamFileContent = migrationFunction(wamFileContent);
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

        return WAMFileFormat.parse(wamFileContent);
    }

    private migrate_v1_to_v2(fileContent: any): any {
        return {
            ...fileContent,
            version: "2.0.0",
            areas: fileContent?.areas.map((area: any) => ({
                ...area,
                properties: area.properties?.map((property: any) => {
                    if (property.type === "jitsiRoomProperty") {
                        const jitsiRoomAdminTag = property.jitsiRoomConfig.jitsiRoomAdminTag ?? undefined;

                        delete property.jitsiRoomConfig.jitsiRoomAdminTag;

                        return {
                            ...property,
                            jitsiRoomConfig: property.jitsiRoomConfig,
                            jitsiRoomAdminTag,
                        };
                    }

                    return property;
                }),
            })),
        };
    }

    public getLatestVersion(): string {
        return Object.keys(this.migrations)[Object.keys(this.migrations).length - 1];
    }
}

export const wamFileMigration = new WamFileMigration();
