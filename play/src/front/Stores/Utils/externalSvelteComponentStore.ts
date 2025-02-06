import { ComponentType } from "svelte";
import { derived, writable, Readable } from "svelte/store";
import { ExtensionModule, ExternalSvelteComponentStore } from "../../ExternalModule/ExtensionModule";

export const externalActionBarSvelteComponent = writable<
    Map<string, { componentType: ComponentType; extensionModule: ExtensionModule }>
>(new Map());
export const externalAvailibilitySatusSvelteComponent = writable<
    Map<string, { componentType: ComponentType; extensionModule: ExtensionModule }>
>(new Map());
export const externalPopupSvelteComponent = writable<
    Map<string, { componentType: ComponentType; extensionModule: ExtensionModule }>
>(new Map());

export const externalChatSettingsSvelteComponent = writable<
    Map<string, { componentType: ComponentType; extensionModule: ExtensionModule }>
>(new Map());

export const externalSvelteComponentStore: Readable<ExternalSvelteComponentStore> = derived(
    [externalActionBarSvelteComponent, externalAvailibilitySatusSvelteComponent, externalPopupSvelteComponent],
    ([$externalActionBarSvelteComponent, $externalAvailibilitySatusSvelteComponent, $externalPopupSvelteComponent]) => {
        return {
            addActionBarComponent(key: string, extensionModule: ExtensionModule, componentType: ComponentType) {
                externalActionBarSvelteComponent.update((value) => {
                    return new Map([...value, [key, { componentType, extensionModule }]]);
                });
            },
            removeActionBarComponent(key: string) {
                externalActionBarSvelteComponent.update((value) => {
                    value.delete(key);
                    return value;
                });
            },
            addAvailibilityStatusComponent(
                key: string,
                extensionModule: ExtensionModule,
                componentType: ComponentType
            ) {
                externalAvailibilitySatusSvelteComponent.update((value) => {
                    return new Map([...value, [key, { componentType, extensionModule }]]);
                });
            },
            removeAvailibilityStatusComponent(key: string) {
                externalAvailibilitySatusSvelteComponent.update((value) => {
                    value.delete(key);
                    return value;
                });
            },
            addPopupComponent(key: string, extensionModule: ExtensionModule, componentType: ComponentType) {
                externalPopupSvelteComponent.update((value) => {
                    return new Map([...value, [key, { componentType, extensionModule }]]);
                });
            },
            removePopupComponent(key: string) {
                externalPopupSvelteComponent.update((value) => {
                    value.delete(key);
                    return value;
                });
            },
            addChatSettingsComponent(key: string, extensionModule: ExtensionModule, componentType: ComponentType) {
                externalChatSettingsSvelteComponent.update((value) => {
                    return new Map([...value, [key, { componentType, extensionModule }]]);
                });
            },
            removeChatSettingsComponent(key: string) {
                externalChatSettingsSvelteComponent.update((value) => {
                    value.delete(key);
                    return value;
                });
            },
        };
    }
);
