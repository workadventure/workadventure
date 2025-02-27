import { UpdateWAMSettingCommand } from "@workadventure/map-editor";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connection/RoomConnection";

export class UpdateWAMSettingFrontCommand extends UpdateWAMSettingCommand implements FrontCommandInterface {
    public getUndoCommand(): UpdateWAMSettingFrontCommand {
        if (
            this.updateWAMSettingsMessage.message?.$case === "updateMegaphoneSettingMessage" &&
            this.wam.settings?.megaphone
        ) {
            return new UpdateWAMSettingFrontCommand(this.wam, {
                message: {
                    $case: "updateMegaphoneSettingMessage",
                    updateMegaphoneSettingMessage: {
                        ...this.wam.settings?.megaphone,
                        scope: this.wam.settings?.megaphone.scope ?? "",
                        rights: this.wam.settings?.megaphone.rights ?? [],
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
