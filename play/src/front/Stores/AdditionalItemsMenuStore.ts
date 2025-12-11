import type { Readable } from "svelte/store";
import { derived, writable } from "svelte/store";
import type { AddButtonActionBarEvent, RemoveButtonActionBarEvent } from "../Api/Events/Ui/ButtonActionBarEvent";
import { gameManager } from "../Phaser/Game/GameManager";
import type { CustomButtonActionBarDescriptor } from "./MenuStore";

type AdditionalMenuItem = CustomButtonActionBarDescriptor & {
    location: "top" | "appsMenu" | "buildMenu" | "profileMenu";
};

const additionalMenuItemStores = writable<Map<string, AdditionalMenuItem>>(new Map());

const derivedStores: {
    [location in "top" | "appsMenu" | "buildMenu" | "profileMenu"]?: Readable<Map<string, AdditionalMenuItem>>;
} = {};

export function getAdditionalMenuItemStore(
    location: "top" | "appsMenu" | "buildMenu" | "profileMenu"
): Readable<Map<string, AdditionalMenuItem>> {
    return (derivedStores[location] ??= derived(additionalMenuItemStores, ($items) => {
        const filteredItems = new Map<string, AdditionalMenuItem>();
        for (const [key, value] of $items.entries()) {
            if (value.location === location) {
                filteredItems.set(key, value);
            }
        }
        return filteredItems;
    }));
}

export function registerAdditionalMenuItem(button: AddButtonActionBarEvent) {
    const location = button.location;
    additionalMenuItemStores.update((items) => {
        let imgSrc: string | undefined = undefined;
        if (button.imageSrc) {
            imgSrc = new URL(button.imageSrc, gameManager.currentStartedRoom.mapUrl).toString();
        }
        items.set(button.id, {
            location: location ?? "top",
            id: button.id,
            label: button.label ? button.label : undefined,
            tooltipTitle: button.toolTip,
            imageSrc: imgSrc,
            state: "normal",
            isGradient: button.isGradient,
            bgColor: button.bgColor,
            textColor: button.textColor,
        });
        return items;
    });
}

export function unregisterAdditionalMenuItem(button: RemoveButtonActionBarEvent) {
    additionalMenuItemStores.update((items) => {
        items.delete(button.id);
        return items;
    });
}
