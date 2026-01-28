import type { UpdateWAMSettingsMessage } from "@workadventure/messages";
import type { WAMFileFormat, WAMSettings } from "../../types";
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
                this.wam.settings.megaphone = {
                    scope: message.updateMegaphoneSettingMessage.scope ?? this.oldConfig?.megaphone?.scope,
                    title: message.updateMegaphoneSettingMessage.title ?? this.oldConfig?.megaphone?.title,
                    rights: message.updateMegaphoneSettingMessage.rights ?? this.oldConfig?.megaphone?.rights,
                    enabled:
                        message.updateMegaphoneSettingMessage.enabled ?? this.oldConfig?.megaphone?.enabled ?? false,
                    audienceVideoFeedbackActivated:
                        message.updateMegaphoneSettingMessage.audienceVideoFeedbackActivated ??
                        this.oldConfig?.megaphone?.audienceVideoFeedbackActivated ??
                        false,
                };
                break;
            }
            case "updateRecordingSettingMessage": {
                this.wam.settings.recording = {
                    rights: message.updateRecordingSettingMessage.rights ?? this.oldConfig?.recording?.rights,
                    enableSounds:
                        message.updateRecordingSettingMessage.enableSounds !== undefined
                            ? message.updateRecordingSettingMessage.enableSounds
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
