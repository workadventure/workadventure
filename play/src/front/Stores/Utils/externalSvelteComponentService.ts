import { ComponentType } from "svelte";
import { writable } from "svelte/store";
import { ExtensionModule, ExternalSvelteComponentServiceInterface } from "../../ExternalModule/ExtensionModule";

const externalComponentsByZone = {
    actionBar: writable(new Map<string, { componentType: ComponentType; extensionModule: ExtensionModule }>()),
    availabilityStatus: writable(new Map<string, { componentType: ComponentType; extensionModule: ExtensionModule }>()),
    popup: writable(new Map<string, { componentType: ComponentType; extensionModule: ExtensionModule }>()),
};

export type ExternalComponentZones = keyof typeof externalComponentsByZone;

class ExternalSvelteComponentService implements ExternalSvelteComponentServiceInterface {
    public getComponentsByZone(zone: ExternalComponentZones) {
        return externalComponentsByZone[zone];
    }

    public addComponentToZone(
        zone: ExternalComponentZones,
        key: string,
        extensionModule: ExtensionModule,
        componentType: ComponentType
    ) {
        externalComponentsByZone[zone].update((map) => {
            map.set(key, { componentType, extensionModule });
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
