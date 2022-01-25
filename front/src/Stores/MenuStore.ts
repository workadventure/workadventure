import { get, writable } from "svelte/store";
import Timeout = NodeJS.Timeout;
import { userIsAdminStore } from "./GameStore";
import { CONTACT_URL } from "../Enum/EnvironmentVariable";
import { analyticsClient } from "../Administration/AnalyticsClient";
import type { Translation } from "../i18n/i18n-types";

export const menuIconVisiblilityStore = writable(false);
export const menuVisiblilityStore = writable(false);
menuVisiblilityStore.subscribe((value) => {
    if (value) analyticsClient.openedMenu();
});
export const menuInputFocusStore = writable(false);
export const userIsConnected = writable(false);

let warningContainerTimeout: Timeout | null = null;
function createWarningContainerStore() {
    const { subscribe, set } = writable<boolean>(false);

    return {
        subscribe,
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
}

type MenuKeys = keyof Translation["menu"]["sub"];

interface TranslatedMenu {
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

function createSubMenusStore() {
    const { subscribe, update } = writable<MenuItem[]>([
        {
            type: "translated",
            key: SubMenusInterface.profile,
        },
        {
            type: "translated",
            key: SubMenusInterface.globalMessages,
        },
        {
            type: "translated",
            key: SubMenusInterface.contact,
        },
        {
            type: "translated",
            key: SubMenusInterface.settings,
        },
        {
            type: "translated",
            key: SubMenusInterface.invite,
        },
        {
            type: "translated",
            key: SubMenusInterface.aboutRoom,
        },
    ]);

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
    };
}

export const subMenusStore = createSubMenusStore();

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
