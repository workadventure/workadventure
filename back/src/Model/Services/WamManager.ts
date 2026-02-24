import type { AreaData, AtLeast, EntityDataProperties, WAMEntityData, WAMFileFormat } from "@workadventure/map-editor";
import {
    CreateAreaCommand,
    CreateEntityCommand,
    DeleteAreaCommand,
    DeleteCustomEntityCommand,
    DeleteEntityCommand,
    UpdateAreaCommand,
    UpdateEntityCommand,
    UpdateWAMMetadataCommand,
    UpdateWAMSettingCommand,
    WamFile,
} from "@workadventure/map-editor";
import type { EditMapCommandMessage } from "@workadventure/messages";

export class WamManager {
    private readonly wamFile: WamFile;
    private applyLock: Promise<void> = Promise.resolve();

    public constructor(initialWam: WAMFileFormat) {
        this.wamFile = new WamFile(structuredClone(initialWam));
    }

    public getWam(): WAMFileFormat {
        return this.wamFile.getWam();
    }

    public getWamSettings(): WAMFileFormat["settings"] {
        return this.wamFile.getWam().settings;
    }

    public applyCommand(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        const applyPromise = this.applyLock.then(() => this.applyCommandInternal(editMapCommandMessage));
        this.applyLock = applyPromise.catch(() => undefined);
        return applyPromise;
    }

    private async applyCommandInternal(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        const editMapMessage = editMapCommandMessage.editMapMessage?.message;
        if (!editMapMessage) {
            return;
        }

        const wamFile = this.wamFile;

        switch (editMapMessage.$case) {
            case "modifyAreaMessage": {
                const message = editMapMessage.modifyAreaMessage;

                const dataToModify: AtLeast<AreaData, "id"> = structuredClone(message);
                if (!message.modifyProperties) {
                    dataToModify.properties = undefined;
                }

                const area = wamFile.getGameMapAreas().getArea(message.id);
                if (!area) {
                    break;
                }

                await new UpdateAreaCommand(wamFile, dataToModify, editMapCommandMessage.id, area).execute();
                break;
            }
            case "createAreaMessage": {
                const message = editMapMessage.createAreaMessage;
                const areaObjectConfig: AreaData = {
                    ...message,
                    visible: true,
                };
                await new CreateAreaCommand(wamFile, areaObjectConfig, editMapCommandMessage.id).execute();
                break;
            }
            case "deleteAreaMessage": {
                const message = editMapMessage.deleteAreaMessage;
                await new DeleteAreaCommand(wamFile, message.id, editMapCommandMessage.id).execute();
                break;
            }
            case "modifyEntityMessage": {
                const message = editMapMessage.modifyEntityMessage;
                const dataToModify: Partial<WAMEntityData> = structuredClone(message);
                if (!message.modifyProperties) {
                    dataToModify.properties = undefined;
                }

                const entity = wamFile.getGameMapEntities().getEntity(message.id);
                if (!entity) {
                    break;
                }

                await new UpdateEntityCommand(
                    wamFile,
                    message.id,
                    dataToModify,
                    editMapCommandMessage.id,
                    entity
                ).execute();
                break;
            }
            case "createEntityMessage": {
                const message = editMapMessage.createEntityMessage;
                await new CreateEntityCommand(
                    wamFile,
                    message.id,
                    {
                        prefabRef: {
                            id: message.prefabId,
                            collectionName: message.collectionName,
                        },
                        x: message.x,
                        y: message.y,
                        properties: message.properties as EntityDataProperties,
                        name: message.name,
                    },
                    editMapCommandMessage.id
                ).execute();
                break;
            }
            case "deleteEntityMessage": {
                const message = editMapMessage.deleteEntityMessage;
                await new DeleteEntityCommand(wamFile, message.id, editMapCommandMessage.id).execute();
                break;
            }
            case "updateWAMSettingsMessage": {
                const message = editMapMessage.updateWAMSettingsMessage;
                const wam = wamFile.getWam();
                await new UpdateWAMSettingCommand(wam, message, editMapCommandMessage.id).execute();
                break;
            }
            case "modifiyWAMMetadataMessage": {
                const message = editMapMessage.modifiyWAMMetadataMessage;
                const wam = wamFile.getWam();
                await new UpdateWAMMetadataCommand(wam, message, editMapCommandMessage.id).execute();
                break;
            }
            case "deleteCustomEntityMessage": {
                const message = editMapMessage.deleteCustomEntityMessage;
                await new DeleteCustomEntityCommand(message, wamFile).execute();
                break;
            }
            case "uploadEntityMessage":
            case "modifyCustomEntityMessage":
            case "uploadFileMessage":
            case "errorCommandMessage":
                break;
            default: {
                const _exhaustiveCheck: never = editMapMessage;
                return _exhaustiveCheck;
            }
        }

        wamFile.updateLastCommandIdProperty(editMapCommandMessage.id);
    }
}
