import { ENABLE_REPORT_ISSUES_MENU, REPORT_ISSUES_URL } from "./../Enum/EnvironmentVariable";
import { AddClassicButtonActionBarEvent, AddActionButtonActionBarEvent } from "./../Api/Events/Ui/ButtonActionBarEvent";
import { derived, get, writable } from "svelte/store";
import { userIsAdminStore } from "./GameStore";
import { CONTACT_URL, OPID_PROFILE_SCREEN_PROVIDER, PUSHER_URL } from "../Enum/EnvironmentVariable";
import type { Translation } from "../../i18n/i18n-types";
import { localUserStore } from "../Connexion/LocalUserStore";
import { connectionManager } from "../Connexion/ConnectionManager";
import { AddButtonActionBarEvent, RemoveButtonActionBarEvent } from "../Api/Events/Ui/ButtonActionBarEvent";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";

export const menuIconVisiblilityStore = writable(false);
export const menuVisiblilityStore = writable(false);
export const menuInputFocusStore = writable(false);
export const userIsConnected = writable(false);

export const profileAvailable = derived(userIsConnected, ($userIsConnected) => {
    return $userIsConnected && OPID_PROFILE_SCREEN_PROVIDER !== undefined;
});

let warningContainerTimeout: NodeJS.Timeout | null = null;
function createWarningContainerStore() {
    const { subscribe, set } = writable<boolean>(false);

    return {
        subscribe,
        set,
        activateWarningContainer() {
            set(true);
            if (warningContainerTimeout) clearTimeout(warningContainerTimeout);
            warningContainerTimeout = setTimeout(() => {
                set(false);
                warningContainerTimeout = null;
            }, 120000);
        },
    };
}

export const warningContainerStore = createWarningContainerStore();

export enum SubMenusInterface {
    settings = "settings",
    profile = "profile",
    invite = "invite",
    aboutRoom = "credit",
    globalMessages = "globalMessages",
    contact = "contact",
    report = "report",
}

type MenuKeys = keyof Translation["menu"]["sub"];

export interface TranslatedMenu {
    type: "translated";
    key: MenuKeys;
}

/**
 * A menu item from the scripting API
 */
interface ScriptingMenu {
    type: "scripting";
    label: string;
}

export type MenuItem = TranslatedMenu | ScriptingMenu;

export const inviteMenu: MenuItem = {
    type: "translated",
    key: SubMenusInterface.invite,
};

export const inviteUserActivated = writable(true);
export const mapEditorActivated = writable(false);

function createSubMenusStore() {
    const { subscribe, update } = writable<MenuItem[]>([
        {
            type: "translated",
            key: SubMenusInterface.profile,
        },
        {
            type: "translated",
            key: SubMenusInterface.settings,
        },
        {
            type: "translated",
            key: SubMenusInterface.aboutRoom,
        },
        inviteMenu,
        {
            type: "translated",
            key: SubMenusInterface.globalMessages,
        },
        {
            type: "translated",
            key: SubMenusInterface.contact,
        },
    ]);

    inviteUserActivated.subscribe((value) => {
        //update menu tab
        update((valuesSubMenusStore) => {
            const indexInviteMenu = valuesSubMenusStore.findIndex(
                (menu) => (menu as TranslatedMenu).key === SubMenusInterface.invite
            );
            if (value && indexInviteMenu === -1) {
                valuesSubMenusStore.splice(3, 0, inviteMenu);
            } else if (!value && indexInviteMenu !== -1) {
                valuesSubMenusStore.splice(indexInviteMenu, 1);
            }
            return valuesSubMenusStore;
        });
    });

    return {
        subscribe,
        addTranslatedMenu(menuCommand: MenuKeys) {
            update((menuList) => {
                if (!menuList.find((menu) => menu.type === "translated" && menu.key === menuCommand)) {
                    menuList.push({
                        type: "translated",
                        key: menuCommand,
                    });
                }
                return menuList;
            });
        },
        removeTranslatedMenu(menuCommand: MenuKeys) {
            update((menuList) => {
                const index = menuList.findIndex((menu) => menu.type === "translated" && menu.key === menuCommand);
                if (index !== -1) {
                    menuList.splice(index, 1);
                }
                return menuList;
            });
        },
        addScriptingMenu(menuCommand: string) {
            update((menuList) => {
                if (!menuList.find((menu) => menu.type === "scripting" && menu.label === menuCommand)) {
                    menuList.push({
                        type: "scripting",
                        label: menuCommand,
                    });
                }
                return menuList;
            });
        },
        removeScriptingMenu(menuCommand: string) {
            update((menuList) => {
                const index = menuList.findIndex((menu) => menu.type === "scripting" && menu.label === menuCommand);
                if (index !== -1) {
                    menuList.splice(index, 1);
                }
                return menuList;
            });
        },
        addReportIssuesMenu() {
            if (
                connectionManager.currentRoom?.reportIssuesUrl != undefined ||
                (ENABLE_REPORT_ISSUES_MENU != undefined &&
                    ENABLE_REPORT_ISSUES_MENU === true &&
                    REPORT_ISSUES_URL != undefined)
            ) {
                update((valuesSubMenusStore) => {
                    valuesSubMenusStore.push({
                        type: "translated",
                        key: SubMenusInterface.report,
                    });
                    return valuesSubMenusStore;
                });
            }
        },
    };
}

export const subMenusStore = createSubMenusStore();

export const activeSubMenuStore = writable<number>(0);

export const contactPageStore = writable<string | undefined>(CONTACT_URL);

export function checkSubMenuToShow() {
    subMenusStore.removeTranslatedMenu(SubMenusInterface.globalMessages);
    subMenusStore.removeTranslatedMenu(SubMenusInterface.contact);

    if (get(userIsAdminStore)) {
        subMenusStore.addTranslatedMenu(SubMenusInterface.globalMessages);
    }

    if (get(contactPageStore) !== undefined) {
        subMenusStore.addTranslatedMenu(SubMenusInterface.contact);
    }
}

export const customMenuIframe = new Map<string, { url: string; allowApi: boolean }>();

export function handleMenuRegistrationEvent(
    menuName: string,
    iframeUrl: string | undefined = undefined,
    source: string | undefined = undefined,
    options: { allowApi: boolean }
) {
    if (get(subMenusStore).find((item) => item.type === "scripting" && item.label === menuName)) {
        console.warn("The menu " + menuName + " already exist.");
        return;
    }

    subMenusStore.addScriptingMenu(menuName);

    if (iframeUrl !== undefined) {
        const url = new URL(iframeUrl, source);
        customMenuIframe.set(menuName, { url: url.toString(), allowApi: options.allowApi });
    }
}

export function handleMenuUnregisterEvent(menuName: string) {
    subMenusStore.removeScriptingMenu(menuName);
    customMenuIframe.delete(menuName);
}

export function getProfileUrl() {
    return new URL(
        `profile-callback?token=${localUserStore.getAuthToken()}&playUri=${connectionManager.currentRoom?.key}`,
        ABSOLUTE_PUSHER_URL
    ).toString();
}

function createAdditionalButtonsMenu() {
    const { subscribe, update } = writable<Map<string, AddButtonActionBarEvent>>(
        new Map<string, AddButtonActionBarEvent>()
    );
    return {
        subscribe,
        addAdditionnalButtonActionBar(button: AddButtonActionBarEvent) {
            console.log("MenuStore => additionnalButtonsMenu => addAdditionnalButtonActionBar => button", button);
            update((additionnalButtonsMenu) => {
                additionnalButtonsMenu.set(button.id, button);
                return additionnalButtonsMenu;
            });
        },
        removeAdditionnalButtonActionBar(button: RemoveButtonActionBarEvent) {
            update((additionnalButtonsMenu) => {
                additionnalButtonsMenu.delete(button.id);
                return additionnalButtonsMenu;
            });
        },
    };
}
export const additionnalButtonsMenu = createAdditionalButtonsMenu();
export const addClassicButtonActionBarEvent = writable<AddClassicButtonActionBarEvent[]>([]);
export const addActionButtonActionBarEvent = writable<AddActionButtonActionBarEvent[]>([]);
additionnalButtonsMenu.subscribe((map) => {
    addClassicButtonActionBarEvent.set(
        [...map.values()].filter((c) => c.type === "button") as AddClassicButtonActionBarEvent[]
    );
    addActionButtonActionBarEvent.set(
        [...map.values()].filter((c) => c.type === "action") as AddActionButtonActionBarEvent[]
    );
});
