import { EntityCollectionRaw } from "../..";
import { EntitiesVersionMigration } from "../WamMigrations/AbstractWamVersionMigration";
import { EntitiesVersion00 } from "./EntitiesVersion0_0";

/**
 * Eslint rules are disabled here, because we don't want to type for all possible version of the file.
 * Only the last version has his own type
 */
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

export class EntitiesVersion10 extends EntitiesVersionMigration {
    version = "1.0";
    constructor() {
        super(new EntitiesVersion00());
    }

    protected migration(fileContent: any): EntityCollectionRaw {
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
