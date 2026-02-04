import type { ComponentProps, ComponentType, SvelteComponent } from "svelte";
import { writable } from "svelte/store";
import type { ExternalSvelteComponentServiceInterface } from "../../ExternalModule/ExtensionModule";

const externalComponentsByZone = {
    actionBarAppsMenu: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    availabilityStatus: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    popup: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    // Components displayed at the top of the menu when the menu is open
    menuTop: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    chatBand: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    centeredPopup: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    calendarImage: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    todoListImage: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    calendarButton: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
    todoListButton: writable(
        new Map<
            string,
            { componentType: ComponentType<SvelteComponent>; props?: ComponentProps<SvelteComponent> }
        >()
    ),
};

export type ExternalComponentZones = keyof typeof externalComponentsByZone;

class ExternalSvelteComponentService implements ExternalSvelteComponentServiceInterface {
    public getComponentsByZone(zone: ExternalComponentZones) {
        return externalComponentsByZone[zone];
    }

    public addComponentToZone<Component extends SvelteComponent>(
        zone: ExternalComponentZones,
        key: string,
        componentType: ComponentType<Component>,
        props?: ComponentProps<Component>
    ) {
        externalComponentsByZone[zone].update((map) => {
            map.set(key, { 
                componentType: componentType as unknown as ComponentType<SvelteComponent>, 
                props: props as unknown as ComponentProps<SvelteComponent> 
            });
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
