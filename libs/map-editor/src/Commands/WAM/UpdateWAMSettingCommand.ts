import type { UpdateWAMSettingsMessage } from "@workadventure/messages";
import type { WAMFileFormat, WAMSettings } from "../../types";
import { MegaphoneSettings, RecordingSettings } from "../../types";
import { Command } from "../Command";

export class UpdateWAMSettingCommand extends Command {
    protected readonly oldConfig: WAMSettings | undefined;
    constructor(
        protected wam: WAMFileFormat,
        protected updateWAMSettingsMessage: UpdateWAMSettingsMessage,
        id?: string
    ) {
        super(id);
        this.oldConfig = structuredClone(this.wam.settings);
    }

    execute(): Promise<void> {
        if (this.wam.settings === undefined) {
            this.wam.settings = {};
        }

        const message: UpdateWAMSettingsMessage["message"] = this.updateWAMSettingsMessage.message;
        if (message === undefined) {
            console.warn("Empty settings message received");
            return Promise.resolve();
        }
        // NOTE : Override the old config with the new config even if the new one is partially defined
        switch (message.$case) {
            case "updateMegaphoneSettingMessage": {
                const parsedMegaphoneSettings = MegaphoneSettings.safeParse(
                    message.updateMegaphoneSettingMessage.value
                );
                if (!parsedMegaphoneSettings.success) {
                    console.error("Invalid megaphone settings", parsedMegaphoneSettings.error);
                    throw new Error("Invalid megaphone settings");
                }
                this.wam.settings.megaphone = parsedMegaphoneSettings.data;
                break;
            }
            case "updateRecordingSettingMessage": {
                const parsedRecordingSettings = RecordingSettings.safeParse(
                    message.updateRecordingSettingMessage.value
                );
                if (!parsedRecordingSettings.success) {
                    console.error("Invalid recording settings", parsedRecordingSettings.error);
                    throw new Error("Invalid recording settings");
                }
                const nextRecordingSettings = parsedRecordingSettings.data;
                this.wam.settings.recording = {
                    rights: nextRecordingSettings.rights ?? this.oldConfig?.recording?.rights,
                    enableSounds:
                        nextRecordingSettings.enableSounds !== undefined
                            ? nextRecordingSettings.enableSounds
                            : this.oldConfig?.recording?.enableSounds ?? true,
                };
                break;
            }
            default: {
                const _exhaustiveCheck: never = message;
                return _exhaustiveCheck;
            }
        }
        return Promise.resolve();
    }

    /*undo(): Promise<void> {
        if (this.wam.settings === undefined) {
            this.wam.settings = {};
        }
        if (this.name === "megaphone") {
            this.wam.settings.megaphone = this.oldConfig;
        }
        return Promise.resolve();
    }*/
}
