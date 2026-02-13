import { UpdateWAMSettingCommand } from "@workadventure/map-editor";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";

export class UpdateWAMSettingFrontCommand extends UpdateWAMSettingCommand implements FrontCommandInterface {
    public getUndoCommand(): UpdateWAMSettingFrontCommand {
        if (this.updateWAMSettingsMessage.message?.$case === "updateMegaphoneSettingMessage") {
            const previousMegaphone = this.oldConfig?.megaphone;
            return new UpdateWAMSettingFrontCommand(this.wam, {
                message: {
                    $case: "updateMegaphoneSettingMessage",
                    updateMegaphoneSettingMessage: {
                        scope: previousMegaphone?.scope ?? "",
                        title: previousMegaphone?.title ?? "",
                        rights: previousMegaphone?.rights ?? [],
                        enabled: previousMegaphone?.enabled ?? false,
                        audienceVideoFeedbackActivated: previousMegaphone?.audienceVideoFeedbackActivated ?? false,
                    },
                },
            });
        }
        if (this.updateWAMSettingsMessage.message?.$case === "updateRecordingSettingMessage") {
            const previousRecording = this.oldConfig?.recording;
            return new UpdateWAMSettingFrontCommand(this.wam, {
                message: {
                    $case: "updateRecordingSettingMessage",
                    updateRecordingSettingMessage: {
                        rights: previousRecording?.rights ?? [],
                    },
                },
            });
        }

        return this;
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitUpdateWAMSettingMessage(this.commandId, this.updateWAMSettingsMessage);
    }
}
