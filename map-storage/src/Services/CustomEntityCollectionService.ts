import {
    ENTITIES_FOLDER_PATH,
    ENTITY_COLLECTION_FILE,
    EntityCollectionRaw,
    EntityRawPrefab,
    mapUploadEntityMessageDirectionToDirection,
} from "@workadventure/map-editor";
import { UploadEntityMessage } from "@workadventure/messages";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

export class CustomEntityCollectionService {
    private readonly hostname: string;

    constructor(hostname: string) {
        this.hostname = hostname;
    }

    private getEntityCollectionFileVirtualPath() {
        return mapPathUsingDomainWithPrefix(`${ENTITIES_FOLDER_PATH}/${ENTITY_COLLECTION_FILE}`, this.hostname);
    }

    private getEntityToUploadVirtualPath(fileName: string) {
        return mapPathUsingDomainWithPrefix(`${ENTITIES_FOLDER_PATH}/${fileName}`, this.hostname);
    }

    public async uploadEntity(uploadEntityMessage: UploadEntityMessage) {
        const { name, file } = uploadEntityMessage;
        await fileSystem.writeByteAsFile(this.getEntityToUploadVirtualPath(name), file);
        await this.addEntityInEntityCollectionFile(
            this.mapEntityFromUploadEntityMessageToEntityRawPrefab(uploadEntityMessage)
        );
        return;
    }

    private async readOrCreateEntitiesCollectionFile() {
        const entityCollectionFileVirtualPath = this.getEntityCollectionFileVirtualPath();
        const fileExist = await fileSystem.exist(entityCollectionFileVirtualPath);
        if (!fileExist) {
            const entityCollectionFile: EntityCollectionRaw = {
                collection: [],
                collectionName: "custom entities",
                tags: [],
            };
            await fileSystem.writeStringAsFile(entityCollectionFileVirtualPath, JSON.stringify(entityCollectionFile));
        }
        return fileSystem.readFileAsString(entityCollectionFileVirtualPath);
    }

    private mapEntityFromUploadEntityMessageToEntityRawPrefab(
        uploadEntityMessage: UploadEntityMessage
    ): EntityRawPrefab {
        return EntityRawPrefab.parse({
            ...uploadEntityMessage,
            direction: mapUploadEntityMessageDirectionToDirection(uploadEntityMessage.direction),
        });
    }

    private async addEntityInEntityCollectionFile(entityToAddInCollection: EntityRawPrefab) {
        const customEntityCollectionFileContent = await this.readOrCreateEntitiesCollectionFile();
        const customEntityCollection = EntityCollectionRaw.parse(JSON.parse(customEntityCollectionFileContent));
        customEntityCollection.collection.push(entityToAddInCollection);
        await fileSystem.writeStringAsFile(
            this.getEntityCollectionFileVirtualPath(),
            JSON.stringify(customEntityCollection)
        );
    }
}
