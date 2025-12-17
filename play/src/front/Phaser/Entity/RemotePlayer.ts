import * as Sentry from "@sentry/svelte";
import { get } from "svelte/store";
import type CancelablePromise from "cancelable-promise";
import type { PositionMessage, PositionMessage_Direction, SayMessage } from "@workadventure/messages";
import { openModal } from "svelte-modals";
import type { WokaMenuAction } from "../../Stores/WokaMenuStore";
import { wokaMenuStore } from "../../Stores/WokaMenuStore";
import { Character } from "../Entity/Character";
import type { GameScene } from "../Game/GameScene";
import type { ActivatableInterface } from "../Game/ActivatableInterface";
import { LL } from "../../../i18n/i18n-svelte";
import { blackListManager } from "../../WebRtc/BlackListManager";
import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
import { iframeListener } from "../../Api/IframeListener";
import banIcon from "../../Components/images/ban-icon.svg";
import { openDirectChatRoom } from "../../Chat/Utils";
import chat from "../../Components/images/chat.png";
import { userIsConnected } from "../../Stores/MenuStore";
import RequiresLoginForChatModal from "../../Chat/Components/RequiresLoginForChatModal.svelte";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { IconCamera } from "@wa-icons";

export enum RemotePlayerEvent {
    Clicked = "Clicked",
}

/**
 * Class representing the sprite of a remote player (a player that plays on another computer)
 */
export class RemotePlayer extends Character implements ActivatableInterface {
    public readonly userId: number;
    public readonly userUuid: string;
    public readonly activationRadius: number;

    private visitCardUrl: string | null;

    constructor(
        userId: number,
        userUuid: string,
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: CancelablePromise<string[]>,
        direction: PositionMessage_Direction,
        moving: boolean,
        visitCardUrl: string | null,
        companionTexturePromise: CancelablePromise<string>,
        activationRadius?: number,
        private chatID: string | undefined = undefined,
        sayMessage?: SayMessage
    ) {
        super(Scene, x, y, texturesPromise, name, direction, moving, 1, true, companionTexturePromise);

        //set data
        this.userId = userId;
        this.userUuid = userUuid;
        this.visitCardUrl = visitCardUrl;
        this.setClickable(this.getDefaultWokaMenuActions().length > 0);
        this.activationRadius = activationRadius ?? 96;

        if (sayMessage) {
            this.say(sayMessage.message, sayMessage.type);
        }

        this.bindEventHandlers();
    }

    public updatePosition(position: PositionMessage): void {
        this.playAnimation(position.direction, position.moving);
        this.setX(position.x);
        this.setY(position.y);

        this.setDepth(position.y); //this is to make sure the perspective (player models closer the bottom of the screen will appear in front of models nearer the top of the screen).

        if (this.companion) {
            this.companion.setTarget(position.x, position.y, position.direction);
        }
    }

    public getVisitCardUrl(): string | null {
        return this.visitCardUrl;
    }

    public registerWokaMenuAction(action: WokaMenuAction): void {
        wokaMenuStore.addAction({
            ...action,
            priority: action.priority ?? 0,
            callback: () => {
                action.callback();
                wokaMenuStore.removeRemotePlayer(this.userUuid);
            },
        });
    }

    public unregisterWokaMenuAction(actionName: string) {
        wokaMenuStore.removeAction(actionName);
    }

    public activate(): void {
        this.toggleActionsMenu();
    }

    public deactivate(): void {
        wokaMenuStore.removeRemotePlayer(this.userUuid);
    }

    public destroy(): void {
        wokaMenuStore.removeRemotePlayer(this.userUuid);
        super.destroy();
    }

    public isActivatable(): boolean {
        return this.isClickable();
    }

    private toggleActionsMenu(): void {
        // Track the open woka menu action
        analyticsClient.openWokaMenu();

        // Close the woka menu if it is already open by the same remote player
        const wokaMenuStoreValue = get(wokaMenuStore);
        if (
            wokaMenuStoreValue?.userUuid !== undefined &&
            wokaMenuStoreValue.userUuid !== "" &&
            wokaMenuStoreValue.userUuid === this.userUuid
        ) {
            wokaMenuStore.removeRemotePlayer(this.userUuid);
            return;
        }

        // Initialize the woka menu
        wokaMenuStore.initialize(this.playerName, this.userId, this.userUuid, this.visitCardUrl ?? undefined);

        // Add the default actions to the woka menu
        for (const action of this.getDefaultWokaMenuActions()) {
            wokaMenuStore.addAction(action);
        }

        // Send the remote player clicked event to the iframe listener
        const userFound = this.scene.getRemotePlayersRepository().getPlayers().get(this.userId);
        if (!userFound) {
            console.error("Undefined clicked player!");
            return;
        }

        // Send the remote player clicked event to the iframe listener
        iframeListener.sendRemotePlayerClickedEvent(userFound);
    }

    private getDefaultWokaMenuActions(): WokaMenuAction[] {
        const actions: WokaMenuAction[] = [];
        actions.push({
            actionName: blackListManager.isBlackListed(this.userUuid)
                ? get(LL).report.block.unblock()
                : get(LL).report.block.block(),
            protected: true,
            priority: -1,
            style: "is-error bg-white/10 hover:bg-white/30 text-red-500",
            testId: "wokamenu-block-user-button",
            callback: () => {
                // Track the report user action
                analyticsClient.reportUser();

                showReportScreenStore.set({ userUuid: this.userUuid, userName: this.playerName });
            },
            actionIcon: banIcon,
        });
        if (!blackListManager.isBlackListed(this.userUuid)) {
            actions.push({
                actionName: get(LL).chat.userList.TalkTo(),
                protected: false,
                priority: 1,
                style: "bg-white/10 hover:bg-white/30",
                callback: () => {
                    // Track the talk to user action
                    analyticsClient.goToUser();

                    if (this.scene.connection != undefined)
                        this.scene.connection.emitAskPosition(this.userUuid, this.scene.roomUrl);
                },
                actionIcon: IconCamera,
            });
        }
        if (this.chatID != undefined) {
            actions.push({
                actionName: get(LL).chat.userList.sendMessage(),
                protected: false,
                priority: 2,
                style: "bg-white/10 hover:bg-white/30",
                callback: () => {
                    // Track the opened chat action
                    analyticsClient.openedChat();

                    if (!get(userIsConnected)) {
                        openModal(RequiresLoginForChatModal);
                        return;
                    }

                    openDirectChatRoom(this.chatID!).catch((error) => {
                        console.error("Error opening direct chat room:", error);
                        Sentry.captureException(error, {
                            extra: {
                                userId: this.userUuid,
                                chatId: this.chatID!,
                                playUri: this.scene.roomUrl,
                                username: this.playerName,
                            },
                        });
                    });
                },
                actionIcon: chat,
            });
        }

        return actions;
    }

    private bindEventHandlers(): void {
        this.on(Phaser.Input.Events.POINTER_DOWN, (event: Phaser.Input.Pointer) => {
            if (event.downElement.nodeName === "CANVAS" && event.leftButtonDown()) {
                this.emit(RemotePlayerEvent.Clicked);
            }
        });
    }
}
