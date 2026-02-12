import { UpdateWAMSettingCommand, type WAMFileFormat, WAMSettingsUtils } from "@workadventure/map-editor";

const DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL = "/resources/objects/megaphone/megaphone1.mp3";
import type { UpdateWAMSettingsMessage } from "@workadventure/messages/src/ts-proto-generated/messages";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";
import { megaphoneCanBeUsedStore, megaphoneSpaceSettingsStore } from "../../../../../Stores/MegaphoneStore";

export class UpdateWAMSettingFrontCommand extends UpdateWAMSettingCommand implements FrontCommandInterface {
    public constructor(
        wam: WAMFileFormat,
        updateWAMSettingsMessage: UpdateWAMSettingsMessage,
        private userTags: string[],
        private roomUrl: string,
        id?: string
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
                            scope: previousMegaphone?.scope ?? "",
                            title: previousMegaphone?.title ?? "",
                            rights: previousMegaphone?.rights ?? [],
                            enabled: previousMegaphone?.enabled ?? false,
                            audienceVideoFeedbackActivated: previousMegaphone?.audienceVideoFeedbackActivated ?? false,
                            notificationSoundUrl:
                                previousMegaphone?.notificationSoundUrl ?? DEFAULT_MEGAPHONE_NOTIFICATION_SOUND_URL,
                            enableSoundNotifications: previousMegaphone?.enableSoundNotifications ?? true,
                        },
                    },
                },
                this.userTags,
                this.roomUrl
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
                            rights: previousRecording?.rights ?? [],
                        },
                    },
                },
                this.userTags,
                this.roomUrl
            );
        }

        return this;
    }

    public async execute(): Promise<void> {
        await super.execute();

        const message: UpdateWAMSettingsMessage["message"] = this.updateWAMSettingsMessage.message;
        if (message?.$case === "updateMegaphoneSettingMessage") {
            const megaphoneSettingsMessage = message.updateMegaphoneSettingMessage;

            megaphoneCanBeUsedStore.set(WAMSettingsUtils.canUseMegaphone(this.wam.settings, this.userTags));

            const megaphoneSpaceName = WAMSettingsUtils.getMegaphoneUrl(
                this.wam.settings,
                new URL(this.roomUrl).host,
                this.roomUrl
            );
            if (!megaphoneSpaceName) {
                megaphoneSpaceSettingsStore.set(undefined);
            } else {
                megaphoneSpaceSettingsStore.set({
                    spaceName: megaphoneSpaceName,
                    audienceVideoFeedbackActivated: megaphoneSettingsMessage.audienceVideoFeedbackActivated ?? false,
                });
            }
        }
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitUpdateWAMSettingMessage(this.commandId, this.updateWAMSettingsMessage);
    }
}
