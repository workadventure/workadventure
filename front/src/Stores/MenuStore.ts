import { get, writable } from "svelte/store";
import Timeout = NodeJS.Timeout;
import { userIsAdminStore } from "./GameStore";
import { CONTACT_URL } from "../Enum/EnvironmentVariable";

export const menuIconVisiblilityStore = writable(false);
export const menuVisiblilityStore = writable(false);
export const menuInputFocusStore = writable(false);

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
    settings = "Settings",
    profile = "Profile",
    createMap = "Create a Map",
    aboutRoom = "About the Room",
    globalMessages = "Global Messages",
    contact = "Contact",
}

function createSubMenusStore() {
    const { subscribe, update } = writable<string[]>([
        SubMenusInterface.settings,
        SubMenusInterface.profile,
        SubMenusInterface.createMap,
        SubMenusInterface.aboutRoom,
        SubMenusInterface.globalMessages,
        SubMenusInterface.contact,
    ]);

    return {
        subscribe,
        addMenu(menuCommand: string) {
            update((menuList: string[]) => {
                if (!menuList.find((menu) => menu === menuCommand)) {
                    menuList.push(menuCommand);
                }
                return menuList;
            });
        },
        removeMenu(menuCommand: string) {
            update((menuList: string[]) => {
                const index = menuList.findIndex((menu) => menu === menuCommand);
                if (index !== -1) {
                    menuList.splice(index, 1);
                }
                return menuList;
            });
        },
    };
}

export const subMenusStore = createSubMenusStore();

function checkSubMenuToShow() {
    if (!get(userIsAdminStore)) {
        subMenusStore.removeMenu(SubMenusInterface.globalMessages);
    }

    if (CONTACT_URL === undefined) {
        subMenusStore.removeMenu(SubMenusInterface.contact);
    }
}

checkSubMenuToShow();
