import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import { v4 } from "uuid";
import type { RequireOnlyOne } from "../types";
import type { ActionsMenuActionClickedEvent } from "../Events/ActionsMenuActionClickedEvent";
import type { AddPlayerEvent } from "../Events/AddPlayerEvent";
import { IframeApiContribution, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import type { ButtonClickedCallback, ButtonDescriptor } from "./Ui/ButtonDescriptor";
import { Popup } from "./Ui/Popup";
import { ActionMessage } from "./Ui/ActionMessage";
import { Menu } from "./Ui/Menu";
import type { UIWebsiteCommands } from "./Ui/UIWebsite";
import website from "./Ui/UIWebsite";
import { RemotePlayer } from "./Players/RemotePlayer";
import modal from "./Ui/Modal";
import type { WorkadventureModalCommands } from "./Ui/Modal";
import buttonActionBar, { WorkAdventureButtonActionBarCommands } from "./Ui/ButtonActionBar";
import banner, { WorkadventureBannerCommands } from "./Ui/Banner";

let popupId = 0;
const popups: Map<number, Popup> = new Map<number, Popup>();
const popupCallbacks: Map<number, Map<number, ButtonClickedCallback>> = new Map<
    number,
    Map<number, ButtonClickedCallback>
>();

const menus: Map<string, Menu> = new Map<string, Menu>();
const menuCallbacks: Map<string, (command: string) => void> = new Map();
const actionMessages = new Map<string, ActionMessage>();

interface MenuDescriptor {
    callback?: (commandDescriptor: string) => void;
    iframe?: string;
    allowApi?: boolean;
    /**
     * A unique technical key identifying this menu
     */
    key?: string;
}

export type MenuOptions = RequireOnlyOne<MenuDescriptor, "callback" | "iframe">;

export interface ActionMessageOptions {
    message: string;
    type?: "message" | "warning";
    callback: () => void;
}

export class ActionsMenuAction {
    private remotePlayer: RemotePlayer;
    private key: string;
    private callback: () => void;

    constructor(remotePlayer: RemotePlayer, key: string, callback: () => void) {
        this.remotePlayer = remotePlayer;
        this.key = key;
        this.callback = callback;
    }

    public call(): void {
        this.callback();
    }

    public remove(): void {
        this.remotePlayer.removeAction(this.key);
    }
}

export class WorkAdventureUiCommands extends IframeApiContribution<WorkAdventureUiCommands> {
    public readonly _onRemotePlayerClicked: Subject<RemotePlayer>;
    public readonly onRemotePlayerClicked: Observable<RemotePlayer>;

    private currentlyClickedRemotePlayer?: RemotePlayer;

    constructor() {
        super();
        this._onRemotePlayerClicked = new Subject<RemotePlayer>();
        this.onRemotePlayerClicked = this._onRemotePlayerClicked.asObservable();
    }

    callbacks = [
        apiCallback({
            type: "buttonClickedEvent",
            callback: (payloadData) => {
                const callback = popupCallbacks.get(payloadData.popupId)?.get(payloadData.buttonId);
                const popup = popups.get(payloadData.popupId);
                if (popup === undefined) {
                    throw new Error('Could not find popup with ID "' + payloadData.popupId + '"');
                }
                if (callback) {
                    callback(popup);
                }
            },
        }),
        apiCallback({
            type: "menuItemClicked",
            callback: (event) => {
                const callback = menuCallbacks.get(event.menuItem);
                const menu = menus.get(event.menuItem);
                if (menu === undefined) {
                    throw new Error('Could not find menu named "' + event.menuItem + '"');
                }
                if (callback) {
                    callback(event.menuItem);
                }
            },
        }),
        apiCallback({
            type: "messageTriggered",
            callback: (event) => {
                const actionMessage = actionMessages.get(event.uuid);
                if (actionMessage) {
                    actionMessage.triggerCallback();
                }
            },
        }),
        apiCallback({
            type: "remotePlayerClickedEvent",
            callback: (payloadData: AddPlayerEvent) => {
                const remotePlayer = new RemotePlayer(payloadData);
                this.currentlyClickedRemotePlayer = remotePlayer;
                this._onRemotePlayerClicked.next(remotePlayer);
            },
        }),
        apiCallback({
            type: "actionsMenuActionClickedEvent",
            callback: (payloadData: ActionsMenuActionClickedEvent) => {
                this.currentlyClickedRemotePlayer?.callAction(payloadData.actionName);
            },
        }),
    ];

    /**
     * Open a popup in front of the game.
     * {@link https://workadventu.re/map-building/api-ui.md#opening-a-popup | Website documentation}
     *
     * @param {string} targetObject Targeted object name
     * @param {string} message Message to display
     * @param {ButtonDescriptor[]} buttons Buttons displayed below popup
     * @returns {Popup} Popup created
     */
    public openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup {
        popupId++;
        const popup = new Popup(popupId);
        const btnMap = new Map<number, () => void>();
        popupCallbacks.set(popupId, btnMap);
        let id = 0;
        for (const button of buttons) {
            const callback = button.callback;
            if (callback) {
                btnMap.set(id, () => {
                    callback(popup);
                });
            }
            id++;
        }

        sendToWorkadventure({
            type: "openPopup",
            data: {
                popupId,
                targetObject,
                message,
                buttons: buttons.map((button) => {
                    return {
                        label: button.label,
                        className: button.className,
                    };
                }),
            },
        });

        popups.set(popupId, popup);
        return popup;
    }

    /**
     * Add a custom menu item containing the text commandDescriptor in the navbar of the menu. options attribute accepts an object.
     * {@link https://workadventu.re/map-building/api-ui.md#add-custom-menu | Website documentation}
     *
     * @param {string} commandDescriptor Command description
     * @param {MenuOptions | ((commandDescriptor: string) => void)} options Manu options
     * @returns {Menu} Menu created
     */
    public registerMenuCommand(
        commandDescriptor: string,
        options: MenuOptions | ((commandDescriptor: string) => void)
    ): Menu {
        if (typeof options === "function") {
            options = {
                callback: options,
            };
        }

        const finalOptions = {
            ...options,
            allowApi: options.allowApi === undefined ? options.iframe !== undefined : options.allowApi,
            key: options.key ?? v4(),
        };

        const menu = new Menu(finalOptions.key);

        if (finalOptions.iframe !== undefined) {
            sendToWorkadventure({
                type: "registerMenu",
                data: {
                    name: commandDescriptor,
                    iframe: finalOptions.iframe,
                    key: finalOptions.key,
                    options: {
                        allowApi: finalOptions.allowApi,
                    },
                },
            });
        } else if (finalOptions.callback !== undefined) {
            menuCallbacks.set(finalOptions.key, finalOptions.callback);
            sendToWorkadventure({
                type: "registerMenu",
                data: {
                    name: commandDescriptor,
                    key: finalOptions.key,
                    options: {
                        allowApi: finalOptions.allowApi,
                    },
                },
            });
        } else {
            throw new Error(
                "When adding a menu with WA.ui.registerMenuCommand, you must pass either an iframe or a callback"
            );
        }

        menus.set(finalOptions.key, menu);
        return menu;
    }

    /**
     * Retrieves a menu from its key.
     * Keys are set when the menu is created with `registerMenuCommand`
     * In addition, the standard menus have the following keys: "settings", "profile", "invite", "credit", "globalMessages", "contact", "report"
     */
    public getMenuCommand(key: string): Promise<Menu> {
        // Note: we return a promise because in the future, we might want to check that the key we pass does indeed exist.
        return Promise.resolve(new Menu(key));
    }

    public addActionsMenuKeyToRemotePlayer(id: number, actionKey: string): void {
        sendToWorkadventure({
            type: "addActionsMenuKeyToRemotePlayer",
            data: { id, actionKey },
        });
    }

    public removeActionsMenuKeyFromRemotePlayer(id: number, actionKey: string): void {
        sendToWorkadventure({
            type: "removeActionsMenuKeyFromRemotePlayer",
            data: { id, actionKey },
        });
    }

    /**
     * Display a bubble like in proximity meeting (Draft function).
     * Todo: enhanced bubble functions behaviors
     */
    public displayBubble(): void {
        sendToWorkadventure({ type: "displayBubble", data: undefined });
    }

    /**
     * Remove a bubble like in proximity meeting.
     * Todo: enhanced bubble functions behaviors
     */
    public removeBubble(): void {
        sendToWorkadventure({ type: "removeBubble", data: undefined });
    }

    /**
     * Displays a message at the bottom of the screen (that will disappear when space bar is pressed).
     * {@link https://workadventu.re/map-building/api-ui.md#awaiting-user-confirmation-with-space-bar | Website documentation}
     *
     * @param {ActionMessageOptions} actionMessageOptions Action options
     * @returns {ActionMessage} Trigger action message
     */
    public displayActionMessage(actionMessageOptions: ActionMessageOptions): ActionMessage {
        const actionMessage = new ActionMessage(actionMessageOptions, () => {
            actionMessages.delete(actionMessage.uuid);
        });
        actionMessages.set(actionMessage.uuid, actionMessage);
        return actionMessage;
    }

    get website(): UIWebsiteCommands {
        return website;
    }

    get modal(): WorkadventureModalCommands {
        return modal;
    }

    get actionBar(): WorkAdventureButtonActionBarCommands {
        return buttonActionBar;
    }

    get banner(): WorkadventureBannerCommands {
        return banner;
    }
}

export default new WorkAdventureUiCommands();
