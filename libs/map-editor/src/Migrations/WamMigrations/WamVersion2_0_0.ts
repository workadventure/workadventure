import { WAMFileFormat } from "../../types";

import { WamVersion100 } from "./WamVersion1_0_0";

import { WamVersionMigration } from "./AbstractWamVersionMigration";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

export class WamVersion200 extends WamVersionMigration {
    version = "2.0.0";
    constructor() {
        super(new WamVersion100());
    }

    public migration(fileContent: any): WAMFileFormat {
        return {
            ...fileContent,
            version: this.getVersion(),
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
}
