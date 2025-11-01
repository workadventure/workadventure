import { writable } from "svelte/store";
import { ComponentProps } from "svelte";
import CustomActionBarButton from "../Components/ActionBar/MenuIcons/CustomActionBarButton.svelte";
import { AddButtonActionBarEvent, RemoveButtonActionBarEvent } from "../Api/Events/Ui/ButtonActionBarEvent";
import { gameManager } from "../Phaser/Game/GameManager";

const additionalMenuItemStores = {
    appsMenu: writable<Map<string, ComponentProps<CustomActionBarButton>>>(new Map()),
    buildMenu: writable<Map<string, ComponentProps<CustomActionBarButton>>>(new Map()),
    profileMenu: writable<Map<string, ComponentProps<CustomActionBarButton>>>(new Map()),
};

export function getAdditionalMenuItemStore(location: "appsMenu" | "buildMenu" | "profileMenu") {
    return additionalMenuItemStores[location];
}

export function registerAdditionalMenuItem(button: AddButtonActionBarEvent) {
    const location = button.location;
    if (location === "top" || location === undefined) {
        throw new Error("Top location is not supported for additional menu items.");
    }
    const store = getAdditionalMenuItemStore(location);
    store.update((items) => {
        let imgSrc: string | undefined = undefined;
        if (button.imageSrc) {
            imgSrc = new URL(button.imageSrc, gameManager.currentStartedRoom.mapUrl).toString();
        }
        items.set(button.id, {
            last: false,
            button: {
                id: button.id,
                label: button.label ? button.label : undefined,
                tooltipTitle: button.toolTip,
                imageSrc: imgSrc,
                state: "normal",
                isGradient: button.isGradient,
                bgColor: button.bgColor,
                textColor: button.textColor,
            },
        });
        return items;
    });
}

export function unregisterAdditionalMenuItem(button: RemoveButtonActionBarEvent) {
    for (const menuStore of [
        additionalMenuItemStores.appsMenu,
        additionalMenuItemStores.buildMenu,
        additionalMenuItemStores.profileMenu,
    ]) {
        menuStore.update((items) => {
            items.delete(button.id);
            return items;
        });
    }
}
