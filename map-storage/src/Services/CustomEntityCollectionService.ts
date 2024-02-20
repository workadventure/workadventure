import {
    CollisionGrid,
    ENTITIES_FOLDER_PATH,
    ENTITY_COLLECTION_FILE,
    EntityCollectionRaw,
    EntityRawPrefab,
    mapCustomEntityDirectionToDirection,
} from "@workadventure/map-editor";
import { DeleteCustomEntityMessage, ModifyCustomEntityMessage, UploadEntityMessage } from "@workadventure/messages";
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

    public async modifyEntity(modifyCustomEntityMessage: ModifyCustomEntityMessage) {
        const { id, name, tags, depthOffset } = modifyCustomEntityMessage;
        const collisionGrid = CollisionGrid.parse(modifyCustomEntityMessage.collisionGrid);
        const customEntityCollectionFileContent = await this.readOrCreateEntitiesCollectionFile();
        const customEntityCollection = EntityCollectionRaw.parse(JSON.parse(customEntityCollectionFileContent));
        const indexOfEntityToModify = customEntityCollection.collection.findIndex((entity) => entity.id === id);
        if (indexOfEntityToModify !== -1) {
            const entityToModify = customEntityCollection.collection[indexOfEntityToModify];
            customEntityCollection.collection[indexOfEntityToModify] = {
                ...entityToModify,
                name,
                tags,
                depthOffset,
                collisionGrid,
            };
            await fileSystem.writeStringAsFile(
                this.getEntityCollectionFileVirtualPath(),
                JSON.stringify(customEntityCollection)
            );
        }
    }

    public async deleteEntity(deleteCustomEntityMessage: DeleteCustomEntityMessage) {
        const { id } = deleteCustomEntityMessage;
        const customEntityCollectionFileContent = await this.readOrCreateEntitiesCollectionFile();
        const customEntityCollection = EntityCollectionRaw.parse(JSON.parse(customEntityCollectionFileContent));
        const customEntityToDelete = customEntityCollection.collection.find((entity) => entity.id === id);
        customEntityCollection.collection = customEntityCollection.collection.filter(
            (customEntity) => customEntity.id !== id
        );
        await fileSystem.writeStringAsFile(
            this.getEntityCollectionFileVirtualPath(),
            JSON.stringify(customEntityCollection)
        );
        if (customEntityToDelete) {
            await fileSystem.deleteFiles(this.getEntityToUploadVirtualPath(customEntityToDelete.imagePath));
        }
    }

    private async readOrCreateEntitiesCollectionFile() {
        const entityCollectionFileVirtualPath = this.getEntityCollectionFileVirtualPath();
        const fileExist = await fileSystem.exist(entityCollectionFileVirtualPath);
        if (!fileExist) {
            const entityCollectionFile: EntityCollectionRaw = {
                version: "1.0",
                collection: [],
                collectionName: "custom entities",
                tags: [],
            };
            await fileSystem.writeStringAsFile(entityCollectionFileVirtualPath, JSON.stringify(entityCollectionFile));
        }
        //Check current version and migrate to new one
        return fileSystem.readFileAsString(entityCollectionFileVirtualPath);
    }

    private mapEntityFromUploadEntityMessageToEntityRawPrefab(
        uploadEntityMessage: UploadEntityMessage
    ): EntityRawPrefab {
        return EntityRawPrefab.parse({
            ...uploadEntityMessage,
            direction: mapCustomEntityDirectionToDirection(uploadEntityMessage.direction),
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
