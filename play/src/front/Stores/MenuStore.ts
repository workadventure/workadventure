import type { Readable, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { ComponentProps, ComponentType, SvelteComponentTyped } from "svelte";
import type { Translation } from "../../i18n/i18n-types";
import { connectionManager } from "../Connection/ConnectionManager";
import { localUserStore } from "../Connection/LocalUserStore";
import { ABSOLUTE_PUSHER_URL } from "../Enum/ComputedConst";
import {
    CONTACT_URL,
    ENABLE_OPENID,
    ENABLE_REPORT_ISSUES_MENU,
    OPID_PROFILE_SCREEN_PROVIDER,
    REPORT_ISSUES_URL,
} from "../Enum/EnvironmentVariable";
import MapSubMenu from "../Components/ActionBar/MenuIcons/MapSubMenu.svelte";
import LoginMenuItem from "../Components/ActionBar/MenuIcons/LoginMenuItem.svelte";
import InviteMenuItem from "../Components/ActionBar/MenuIcons/InviteMenuItem.svelte";
import CustomActionBarButton from "../Components/ActionBar/MenuIcons/CustomActionBarButton.svelte";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { userIsAdminStore } from "./GameStore";
import { megaphoneCanBeUsedStore } from "./MegaphoneStore";
import { chatVisibilityStore, isMatrixChatEnabledStore } from "./ChatStore";
import { gameSceneStore } from "./GameSceneStore";
import { modalIframeStore, modalVisibilityStore, showModalGlobalComminucationVisibilityStore } from "./ModalStore";
import { getAdditionalMenuItemStore } from "./AdditionalItemsMenuStore";

export const menuIconVisiblilityStore = writable(false);
export const menuVisiblilityStore = writable(false);
export const userIsConnected = writable(false);

export const profileAvailable = derived(userIsConnected, ($userIsConnected) => {
    return $userIsConnected && OPID_PROFILE_SCREEN_PROVIDER !== undefined;
});

let warningContainerTimeout: NodeJS.Timeout | null = null;
function createWarningBannerStore() {
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

export const warningBannerStore = createWarningBannerStore();

export enum SubMenusInterface {
    settings = "settings",
    profile = "profile",
    invite = "invite",
    aboutRoom = "credit",
    globalMessages = "globalMessages",
    contact = "contact",
    report = "report",
    chat = "chat",
    shortcuts = "shortcuts",
}

export type MenuKeys = keyof Translation["menu"]["sub"];

export interface TranslatedMenu {
    type: "translated";
    key: MenuKeys;
    visible: Readable<boolean>;
}

/**
 * A menu item from the scripting API
 */
interface ScriptingMenu {
    type: "scripting";
    label: string;
    key: string;
    visible: Readable<boolean>;
}

export type MenuItem = TranslatedMenu | ScriptingMenu;

export const inviteUserActivated = writable(true);
export const mapEditorActivated = writable(false);
export const mapManagerActivated = writable(true);
export const screenSharingActivatedStore = writable(true);
export const mapEditorActivatedForCurrentArea = writable(false);
export const mapEditorActivatedForThematics = writable(false);
export const roomListActivated = writable(true);
export const contactPageStore = writable<string | undefined>(CONTACT_URL);

const alwaysVisible = writable(true);

function createSubMenusStore() {
    const store = writable<MenuItem[]>([
        {
            type: "translated",
            key: SubMenusInterface.profile,
            visible: profileAvailable,
        },
        {
            type: "translated",
            key: SubMenusInterface.settings,
            visible: alwaysVisible,
        },
        {
            type: "translated",
            key: SubMenusInterface.aboutRoom,
            visible: alwaysVisible,
        },
        {
            type: "translated",
            key: SubMenusInterface.invite,
            visible: inviteUserActivated,
        },
        {
            type: "translated",
            key: SubMenusInterface.globalMessages,
            visible: userIsAdminStore,
        },
        {
            type: "translated",
            key: SubMenusInterface.chat,
            visible: isMatrixChatEnabledStore,
        },
        {
            type: "translated",
            key: SubMenusInterface.contact,
            visible: derived(contactPageStore, ($contactPageStore) => $contactPageStore !== undefined),
        },
        {
            type: "translated",
            key: SubMenusInterface.report,
            visible: derived(
                gameSceneStore,
                ($gameSceneStore) =>
                    $gameSceneStore?.room.reportIssuesUrl !== undefined ||
                    (ENABLE_REPORT_ISSUES_MENU != undefined &&
                        ENABLE_REPORT_ISSUES_MENU &&
                        REPORT_ISSUES_URL != undefined)
            ),
        },
        {
            type: "translated",
            key: SubMenusInterface.shortcuts,
            visible: alwaysVisible,
        },
    ]);
    const { subscribe, update } = store;

    return {
        subscribe,
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
                        visible: alwaysVisible,
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

export const customMenuIframe = new Map<string, { url: string; allowApi: boolean; allow?: string | undefined }>();

export function handleMenuRegistrationEvent(
    menuName: string,
    iframeUrl: string | undefined = undefined,
    key: string,
    source: string | undefined = undefined,
    options: { allowApi: boolean; allow?: string | undefined }
) {
    if (get(subMenusStore).find((item) => item.type === "scripting" && item.label === menuName)) {
        console.warn("The menu " + menuName + " already exist.");
        return;
    }

    subMenusStore.addScriptingMenu(menuName, key);

    if (iframeUrl !== undefined) {
        const url = new URL(iframeUrl, source);
        customMenuIframe.set(key, { url: url.toString(), allowApi: options.allowApi, allow: options.allow });
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

export interface CustomButtonActionBarDescriptor {
    id: string;
    label?: string | undefined;
    tooltipTitle?: string | undefined;
    tooltipDesc?: string | undefined;
    imageSrc?: string | undefined;
    state: "normal" | "active" | "forbidden" | "disabled";
    bgColor?: string | undefined;
    textColor?: string | undefined;
    isGradient?: boolean | undefined;
}

export const additionalRightButtonsMenu = derived(getAdditionalMenuItemStore("top"), ($additionalTopMenuItems) => {
    const menuItems: RightMenuItem<CustomActionBarButton>[] = [];
    $additionalTopMenuItems.forEach((props, id) => {
        menuItems.push({
            id: id,
            fallsInBurgerMenuStore: writable(false),
            component: CustomActionBarButton,
            props: {
                last: false,
                button: props,
            },
        });
    });
    return menuItems;
});

export interface RightMenuItem<T extends SvelteComponentTyped> {
    id: string;
    fallsInBurgerMenuStore: Writable<boolean>;
    component: ComponentType<T>;
    props: ComponentProps<T>;
}

const mapsMenuItem: RightMenuItem<MapSubMenu> = {
    id: "maps",
    fallsInBurgerMenuStore: writable(false),
    component: MapSubMenu,
    props: {},
};

const loginMenuItem: RightMenuItem<LoginMenuItem> = {
    id: "login",
    fallsInBurgerMenuStore: writable(true),
    component: LoginMenuItem,
    props: {
        last: false,
    },
};

const inviteMenuItem: RightMenuItem<InviteMenuItem> = {
    id: "invite",
    fallsInBurgerMenuStore: writable(false),
    component: InviteMenuItem,
    props: {
        last: false,
    },
};

export const rightActionBarMenuItems: Readable<RightMenuItem<SvelteComponentTyped>[]> = derived(
    [additionalRightButtonsMenu, userIsConnected, inviteUserActivated],
    ([$additionalButtonsMenu, $userIsConnected, $inviteUserActivated]) => {
        const menuItems: RightMenuItem<SvelteComponentTyped>[] = [...$additionalButtonsMenu.values()];
        if ($inviteUserActivated) {
            menuItems.push(inviteMenuItem);
        }
        if (!$userIsConnected && ENABLE_OPENID) {
            menuItems.push(loginMenuItem);
        }

        if (menuItems.length > 0) {
            menuItems[menuItems.length - 1].props.last = true;
        }

        menuItems.push(mapsMenuItem);

        return menuItems;
    }
);

// It is ok to not unsubscribe to this store because it is a singleton.

/*additionalButtonsMenu.subscribe((map) => {
    addClassicButtonActionBarEvent.set(
        [...map.values()].filter((c) => c.type === "button") as AddClassicButtonActionBarEvent[]
    );
    addActionButtonActionBarEvent.set(
        [...map.values()].filter((c) => c.type === "action") as AddActionButtonActionBarEvent[]
    );
});*/

// The store that decides what tools to display just below the menu (typically triggered when you click on an item in the action bar)
export const activeSecondaryZoneActionBarStore = writable<"emote" | "audio-manager" | undefined>(undefined);

export const helpTextDisabledStore = derived(
    activeSecondaryZoneActionBarStore,
    ($activeSecondaryZoneActionBarStore) => {
        return $activeSecondaryZoneActionBarStore !== undefined;
    }
);

export const mapEditorMenuVisibleStore = derived(
    [mapEditorActivated, mapManagerActivated, mapEditorActivatedForThematics],
    ([$mapEditorActivated, $mapManagerActivated, $mapEditorActivatedForThematics]) => {
        return ($mapEditorActivated || $mapEditorActivatedForThematics) && $mapManagerActivated;
    }
);
export const globalMessageVisibleStore = derived(
    [megaphoneCanBeUsedStore, userIsAdminStore],
    ([$megaphoneCanBeUsedStore, $userIsAdminStore]) => {
        return $megaphoneCanBeUsedStore || $userIsAdminStore;
    }
);
export const mapMenuVisibleStore = derived(
    [mapEditorMenuVisibleStore, globalMessageVisibleStore, getAdditionalMenuItemStore("buildMenu")],
    ([$mapEditorMenuVisibleStore, $globalMessageVisibleStore, $additionalBuildMenuItems]) => {
        return $mapEditorMenuVisibleStore || $globalMessageVisibleStore || $additionalBuildMenuItems.size > 0;
    }
);

type Menus = "appMenu" | "profileMenu" | "mapMenu";

function createOpenedMenuStore() {
    const openedMenuStore = writable<Menus | undefined>(undefined);
    const { subscribe, set } = openedMenuStore;

    return {
        subscribe,
        open(menu: Menus) {
            set(menu);
            activeSecondaryZoneActionBarStore.set(undefined);
        },
        close(menu: Menus) {
            if (get({ subscribe }) === menu) {
                set(undefined);
            }
        },
        closeAll() {
            set(undefined);
        },
        toggle(menu: Menus) {
            if (get({ subscribe }) === menu) {
                set(undefined);
            } else {
                set(menu);
                activeSecondaryZoneActionBarStore.set(undefined);
                analyticsClient.openProfileMenu();
            }
        },
    };
}

export const openedMenuStore = createOpenedMenuStore();

export function showMenuItem(key: MenuKeys | string) {
    const menuItem = subMenusStore.findByKey(key);
    if (get(menuVisiblilityStore)) {
        menuVisiblilityStore.set(false);
        activeSubMenuStore.activateByIndex(0);
        return;
    }
    activeSubMenuStore.activateByMenuItem(menuItem);
    menuVisiblilityStore.set(true);

    chatVisibilityStore.set(false);
    modalVisibilityStore.set(false);
    modalIframeStore.set(null);
    showModalGlobalComminucationVisibilityStore.set(false);
}
