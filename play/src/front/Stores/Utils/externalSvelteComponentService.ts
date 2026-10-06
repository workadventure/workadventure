import { writable } from "svelte/store";
import type { ExternalSvelteComponentServiceInterface } from "../../ExternalModule/ExtensionModule";
import type { WorkAdventureComponent, WorkAdventureComponentProps } from "../../../types/component";

type ExternalComponentEntry = { componentType: WorkAdventureComponent; props?: WorkAdventureComponentProps };

const externalComponentsByZone = {
    actionBarAppsMenu: writable(new Map<string, ExternalComponentEntry>()),
    availabilityStatus: writable(new Map<string, ExternalComponentEntry>()),
    popup: writable(new Map<string, ExternalComponentEntry>()),
    // Components displayed at the top of the menu when the menu is open
    menuTop: writable(new Map<string, ExternalComponentEntry>()),
    chatBand: writable(new Map<string, ExternalComponentEntry>()),
    centeredPopup: writable(new Map<string, ExternalComponentEntry>()),
    calendarImage: writable(new Map<string, ExternalComponentEntry>()),
    todoListImage: writable(new Map<string, ExternalComponentEntry>()),
    calendarButton: writable(new Map<string, ExternalComponentEntry>()),
    todoListButton: writable(new Map<string, ExternalComponentEntry>()),
};

export type ExternalComponentZones = keyof typeof externalComponentsByZone;

class ExternalSvelteComponentService implements ExternalSvelteComponentServiceInterface {
    public getComponentsByZone(zone: ExternalComponentZones) {
        return externalComponentsByZone[zone];
    }

    public addComponentToZone(
        zone: ExternalComponentZones,
        key: string,
        componentType: WorkAdventureComponent,
        props?: WorkAdventureComponentProps,
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
