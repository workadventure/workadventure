import path from "path";
import {
    CollisionGrid,
    ENTITIES_FOLDER_PATH,
    ENTITY_COLLECTION_FILE,
    EntityCollectionRaw,
    EntityRawPrefab,
    entityUploadSupportedFormatForMapStorage,
    mapCustomEntityDirectionToDirection,
} from "@workadventure/map-editor";
import { DeleteCustomEntityMessage, ModifyCustomEntityMessage, UploadEntityMessage } from "@workadventure/messages";
import { fileSystem } from "../fileSystem";
import { mapPathUsingDomainWithPrefix } from "./PathMapper";

export class CustomEntityCollectionService {
    private readonly hostname: string;

    private lock: Promise<void>;

    constructor(hostname: string) {
        this.hostname = hostname;
        this.lock = Promise.resolve();
    }

    private getEntityCollectionFileVirtualPath() {
        return mapPathUsingDomainWithPrefix(`${ENTITIES_FOLDER_PATH}/${ENTITY_COLLECTION_FILE}`, this.hostname);
    }

    private getEntityToUploadVirtualPath(fileName: string) {
        const { base: filenameWithoutPotentialPath, ext: fileExtension } = path.parse(fileName);

        if (fileExtension.match(entityUploadSupportedFormatForMapStorage) === null) {
            throw new Error("File extension is not a supported image");
        }
        return mapPathUsingDomainWithPrefix(`${ENTITIES_FOLDER_PATH}/${filenameWithoutPotentialPath}`, this.hostname);
    }

    public async uploadEntity(uploadEntityMessage: UploadEntityMessage) {
        const { imagePath, file } = uploadEntityMessage;
        await fileSystem.writeByteArrayAsFile(this.getEntityToUploadVirtualPath(imagePath), file);
        await this.addEntityInEntityCollectionFile(
            this.mapEntityFromUploadEntityMessageToEntityRawPrefab(uploadEntityMessage)
        );
        return;
    }

    public async modifyEntity(modifyCustomEntityMessage: ModifyCustomEntityMessage) {
        const { id, name, tags, depthOffset } = modifyCustomEntityMessage;
        let collisionGrid = undefined;
        if (modifyCustomEntityMessage.collisionGrid) {
            collisionGrid = CollisionGrid.parse(modifyCustomEntityMessage.collisionGrid);
        }
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
        } else {
            console.error(`[${new Date().toISOString()}] Unable to find the entity to modify in custom entities file`);
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
        this.lock = this.lock.then(async () => {
            await fileSystem.writeStringAsFile(
                this.getEntityCollectionFileVirtualPath(),
                JSON.stringify(customEntityCollection)
            );
            if (customEntityToDelete) {
                await fileSystem.deleteFiles(this.getEntityToUploadVirtualPath(customEntityToDelete.imagePath));
            }
        });
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
        this.lock = this.lock.then(async () => {
            await fileSystem.writeStringAsFile(
                this.getEntityCollectionFileVirtualPath(),
                JSON.stringify(customEntityCollection)
            );
        });
    }
}
