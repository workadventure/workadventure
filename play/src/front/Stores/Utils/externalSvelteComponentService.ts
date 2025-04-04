import { ComponentProps, ComponentType, SvelteComponentTyped } from "svelte";
import { writable } from "svelte/store";
import { ExternalSvelteComponentServiceInterface } from "../../ExternalModule/ExtensionModule";

const externalComponentsByZone = {
    actionBarAppsMenu: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponentTyped>; props?: ComponentProps<SvelteComponentTyped> }
        >()
    ),
    availabilityStatus: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponentTyped>; props?: ComponentProps<SvelteComponentTyped> }
        >()
    ),
    popup: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponentTyped>; props?: ComponentProps<SvelteComponentTyped> }
        >()
    ),
    // Components displayed at the top of the menu when the menu is open
    menuTop: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponentTyped>; props?: ComponentProps<SvelteComponentTyped> }
        >()
    ),
    chatBand: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponentTyped>; props?: ComponentProps<SvelteComponentTyped> }
        >()
    ),
    centeredPopup: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponentTyped>; props?: ComponentProps<SvelteComponentTyped> }
        >()
    ),
};

export type ExternalComponentZones = keyof typeof externalComponentsByZone;

class ExternalSvelteComponentService implements ExternalSvelteComponentServiceInterface {
    public getComponentsByZone(zone: ExternalComponentZones) {
        return externalComponentsByZone[zone];
    }

    public addComponentToZone<Component extends SvelteComponentTyped>(
        zone: ExternalComponentZones,
        key: string,
        componentType: ComponentType<Component>,
        props?: ComponentProps<Component>
    ) {
        externalComponentsByZone[zone].update((map) => {
            map.set(key, { componentType, props });
            return map;
        });
    }

    public removeComponentFromZone(zone: ExternalComponentZones, key: string): void {
        externalComponentsByZone[zone].update((map) => {
            map.delete(key);
            return map;
        });
    }
}

export const externalSvelteComponentService = new ExternalSvelteComponentService();
