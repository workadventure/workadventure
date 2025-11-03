import { writable } from "svelte/store";
import { ComponentProps } from "svelte";
import CustomActionBarButton from "../Components/ActionBar/MenuIcons/CustomActionBarButton.svelte";
import { AddButtonActionBarEvent, RemoveButtonActionBarEvent } from "../Api/Events/Ui/ButtonActionBarEvent";
import { gameManager } from "../Phaser/Game/GameManager";

const additionalMenuItemStores = {
    top: writable<Map<string, ComponentProps<CustomActionBarButton>>>(new Map()),
    appsMenu: writable<Map<string, ComponentProps<CustomActionBarButton>>>(new Map()),
    buildMenu: writable<Map<string, ComponentProps<CustomActionBarButton>>>(new Map()),
    profileMenu: writable<Map<string, ComponentProps<CustomActionBarButton>>>(new Map()),
};

export function getAdditionalMenuItemStore(location: "top" | "appsMenu" | "buildMenu" | "profileMenu") {
    return additionalMenuItemStores[location];
}

export function registerAdditionalMenuItem(button: AddButtonActionBarEvent) {
    const location = button.location;
    const store = getAdditionalMenuItemStore(location ?? "top");
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
        additionalMenuItemStores.top,
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
