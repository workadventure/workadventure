import type { UpdateWAMSettingsMessage } from "@workadventure/messages";
import { WAMFileFormat, WAMSettings } from "../../types";
import { Command } from "../Command";

export class UpdateWAMSettingCommand extends Command {
    private readonly oldConfig: WAMSettings | undefined;
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

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
        const message: UpdateWAMSettingsMessage["message"] = this.updateWAMSettingsMessage.message;
        if (message === undefined) {
            console.warn("Empty settings message received");
            return Promise.resolve();
        }
        // NOTE : Override the old config with the new config even if the new one is partially defined

        // TODO: add the switch when we have several message types on which we can discriminate
        //switch (message.$case) {
        //    case "updateMegaphoneSettingMessage": {
        this.wam.settings.megaphone = {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            scope: message.updateMegaphoneSettingMessage.scope ?? this.oldConfig?.megaphone?.scope,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            title: message.updateMegaphoneSettingMessage.title ?? this.oldConfig?.megaphone?.title,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            rights: message.updateMegaphoneSettingMessage.rights ?? this.oldConfig?.megaphone?.rights,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            enabled: message.updateMegaphoneSettingMessage.enabled ?? this.oldConfig?.megaphone?.enabled ?? false,
        };
        /*        break;
            }
            default: {
                const _exhaustiveCheck: never = message;
            }
        }*/
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
