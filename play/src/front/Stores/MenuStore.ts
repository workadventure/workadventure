import { derived, get, writable } from "svelte/store";
import {
    CONTACT_URL,
    OPID_PROFILE_SCREEN_PROVIDER,
    ENABLE_REPORT_ISSUES_MENU,
    REPORT_ISSUES_URL,
} from "../Enum/EnvironmentVariable";
import type { Translation } from "../../i18n/i18n-types";
import { localUserStore } from "../Connection/LocalUserStore";
import { connectionManager } from "../Connection/ConnectionManager";
import {
    AddButtonActionBarEvent,
    RemoveButtonActionBarEvent,
    AddClassicButtonActionBarEvent,
    AddActionButtonActionBarEvent,
} from "../Api/Events/Ui/ButtonActionBarEvent";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";
import { userIsAdminStore } from "./GameStore";

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
        activateWarningContainer(timeToClose = 120000) {
            set(true);
            if (warningContainerTimeout) clearTimeout(warningContainerTimeout);
            if (timeToClose !== 0) {
                warningContainerTimeout = setTimeout(() => {
                    set(false);
                    warningContainerTimeout = null;
                }, timeToClose);
            }
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
    key: string;
}

export type MenuItem = TranslatedMenu | ScriptingMenu;

export const inviteMenu: MenuItem = {
    type: "translated",
    key: SubMenusInterface.invite,
};

export const inviteUserActivated = writable(true);
export const mapEditorActivated = writable(false);

function createSubMenusStore() {
    const store = writable<MenuItem[]>([
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
    const { subscribe, update } = store;

    // It is ok to not unsubscribe to this store because the function is called only once
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
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
        /**
         * Returns a translated menu item by its key.
         * Throw an error if the key was not found.
         */
        findByKey(key: MenuKeys | string): MenuItem {
            const menuItem = get(store).find((menu) => menu.key === key);
            if (menuItem === undefined) {
                throw new Error(`Menu key: ${key} was not founded in menuStore`);
            }
            return menuItem;
        },
        /**
         * Returns a custom menu item by its label.
         * Throw an error if the label was not found.
         */
        findByLabel(label: string): MenuItem {
            const menuItem = get(store).find((menu) => menu.type === "scripting" && menu.label === label);
            if (menuItem === undefined) {
                throw new Error(`Custom menu with label: ${label} was not founded in menuStore`);
            }
            return menuItem;
        },
        findMenuIndex(menuItem: MenuItem): number {
            const index = get(store).findIndex((item) => menuItem === item);
            if (index === -1) {
                throw new Error("Menu not found in menu store");
            }
            return index;
        },
        addScriptingMenu(menuCommand: string, menuKey: string) {
            update((menuList) => {
                if (!menuList.find((menu) => menu.type === "scripting" && menu.key === menuKey)) {
                    menuList.push({
                        type: "scripting",
                        label: menuCommand,
                        key: menuKey,
                    });
                }
                return menuList;
            });
        },
        removeScriptingMenu(key: string) {
            update((menuList) => {
                const index = menuList.findIndex((menu) => /*menu.type === "scripting" &&*/ menu.key === key);
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

function createActiveSubMenuStore() {
    const activeSubMenuStore = writable<number>(0);
    const { subscribe, set } = activeSubMenuStore;

    return {
        subscribe,
        activateByIndex(index: number) {
            set(index);
        },
        activateByMenuItem(menuItem: MenuItem) {
            const index = subMenusStore.findMenuIndex(menuItem);
            set(index);
        },
        isActive(menuItem: MenuItem): boolean {
            const index = subMenusStore.findMenuIndex(menuItem);
            return index === get(activeSubMenuStore);
        },
    };
}

export const activeSubMenuStore = createActiveSubMenuStore();

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
    key: string,
    source: string | undefined = undefined,
    options: { allowApi: boolean }
) {
    if (get(subMenusStore).find((item) => item.type === "scripting" && item.label === menuName)) {
        console.warn("The menu " + menuName + " already exist.");
        return;
    }

    subMenusStore.addScriptingMenu(menuName, key);

    if (iframeUrl !== undefined) {
        const url = new URL(iframeUrl, source);
        customMenuIframe.set(key, { url: url.toString(), allowApi: options.allowApi });
    }
}

export function handleMenuUnregisterEvent(key: string) {
    subMenusStore.removeScriptingMenu(key);
    customMenuIframe.delete(key);
}

export function handleOpenMenuEvent(key: string) {
    const menu = subMenusStore.findByKey(key);
    activeSubMenuStore.activateByMenuItem(menu);
    menuVisiblilityStore.set(true);
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

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
additionnalButtonsMenu.subscribe((map) => {
    addClassicButtonActionBarEvent.set(
        [...map.values()].filter((c) => c.type === "button") as AddClassicButtonActionBarEvent[]
    );
    addActionButtonActionBarEvent.set(
        [...map.values()].filter((c) => c.type === "action") as AddActionButtonActionBarEvent[]
    );
});
