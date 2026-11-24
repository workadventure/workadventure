import { UpdateWAMSettingCommand, type WAMFileFormat } from "@workadventure/map-editor";

import type { UpdateWAMSettingsMessage } from "@workadventure/messages/src/ts-proto-generated/messages";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";
import { gameManager } from "../../../GameManager";

export class UpdateWAMSettingFrontCommand extends UpdateWAMSettingCommand implements FrontCommandInterface {
    public constructor(
        wam: WAMFileFormat,
        updateWAMSettingsMessage: UpdateWAMSettingsMessage,
        private userTags: string[],
        private roomUrl: string,
        id?: string,
    ) {
        super(wam, updateWAMSettingsMessage, id);
    }

    public getUndoCommand(): UpdateWAMSettingFrontCommand {
        if (this.updateWAMSettingsMessage.message?.$case === "updateMegaphoneSettingMessage") {
            const previousMegaphone = this.oldConfig?.megaphone;
            return new UpdateWAMSettingFrontCommand(
                this.wam,
                {
                    message: {
                        $case: "updateMegaphoneSettingMessage",
                        updateMegaphoneSettingMessage: {
                            settings: previousMegaphone ? { ...previousMegaphone } : undefined,
                        },
                    },
                },
                this.userTags,
                this.roomUrl,
            );
        }
        if (this.updateWAMSettingsMessage.message?.$case === "updateRecordingSettingMessage") {
            const previousRecording = this.oldConfig?.recording;
            return new UpdateWAMSettingFrontCommand(
                this.wam,
                {
                    message: {
                        $case: "updateRecordingSettingMessage",
                        updateRecordingSettingMessage: {
                            settings: previousRecording ? { ...previousRecording } : undefined,
                        },
                    },
                },
                this.userTags,
                this.roomUrl,
            );
        }

        return this;
    }

    public async execute(): Promise<void> {
        await super.execute();

        const message: UpdateWAMSettingsMessage["message"] = this.updateWAMSettingsMessage.message;
        if (message?.$case === "updateMegaphoneSettingMessage" || message?.$case === "updateRecordingSettingMessage") {
            // The scene resolves the megaphone from this WAM and the world settings together.
            gameManager.getCurrentGameScene().applyMegaphoneSettings();
        }
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitUpdateWAMSettingMessage(this.commandId, this.updateWAMSettingsMessage);
    }
}
