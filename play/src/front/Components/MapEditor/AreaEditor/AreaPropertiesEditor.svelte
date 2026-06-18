<script lang="ts">
    import { onDestroy } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import type {
        AreaDataProperties,
        AreaDataPropertiesKeys,
        AreaDataProperty,
        OpenWebsitePropertyData,
        PlayAudioPropertyData,
    } from "@workadventure/map-editor";
    import { PersonalAreaAccessClaimMode, SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import type { KlaxoonEvent } from "@workadventure/shared-utils";
    import { KlaxoonService } from "@workadventure/shared-utils";
    import type { ApplicationDefinitionInterface } from "@workadventure/messages";
    import { v4 as uuid } from "uuid";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { mapEditorSelectedAreaPreviewStore } from "../../../Stores/MapEditorStore";
    import { FEATURE_FLAG_BROADCAST_AREAS, MATRIX_PUBLIC_URI, PUSHER_URL } from "../../../Enum/EnvironmentVariable";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import JitsiRoomPropertyEditor from "../PropertyEditor/JitsiRoomPropertyEditor.svelte";
    import PlayAudioPropertyEditor from "../PropertyEditor/PlayAudioPropertyEditor.svelte";
    import OpenWebsitePropertyEditor from "../PropertyEditor/OpenWebsitePropertyEditor.svelte";
    import OpenFilePropertyEditor from "../PropertyEditor/OpenFilePropertyEditor.svelte";
    import FocusablePropertyEditor from "../PropertyEditor/FocusablePropertyEditor.svelte";
    import SilentPropertyEditor from "../PropertyEditor/SilentPropertyEditor.svelte";
    import SpeakerMegaphonePropertyEditor from "../PropertyEditor/SpeakerMegaphonePropertyEditor.svelte";
    import ListenerMegaphonePropertyEditor from "../PropertyEditor/ListenerMegaphonePropertyEditor.svelte";
    import StartPropertyEditor from "../PropertyEditor/StartPropertyEditor.svelte";
    import ExitPropertyEditor from "../PropertyEditor/ExitPropertyEditor.svelte";
    import AddPropertyButtonWrapper from "../PropertyEditor/AddPropertyButtonWrapper.svelte";
    import PersonalAreaPropertyEditor from "../PropertyEditor/PersonalAreaPropertyEditor.svelte";
    import RightsPropertyEditor from "../PropertyEditor/RightsPropertyEditor.svelte";
    import { IconChevronDown, IconChevronRight, IconInfoCircle } from "../../Icons";
    import { extensionModuleStore } from "../../../Stores/GameSceneStore";
    import type { ExtensionModule, ExtensionModuleAreaProperty } from "../../../ExternalModule/ExtensionModule";
    import MatrixRoomPropertyEditor from "../PropertyEditor/MatrixRoomPropertyEditor.svelte";
    import TooltipPropertyButton from "../PropertyEditor/TooltipPropertyButton.svelte";
    import LivekitRoomPropertyEditor from "../PropertyEditor/LivekitRoomPropertyEditor.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import Input from "../../Input/Input.svelte";
    import TextArea from "../../Input/TextArea.svelte";
    import { ON_ACTION_TRIGGER_ENTER } from "../../../WebRtc/LayoutManager";
    import HighlightPropertyEditor from "../PropertyEditor/HighlightPropertyEditor.svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import MaxUsersInAreaPropertyEditor from "../PropertyEditor/MaxUsersInAreaPropertyEditor.svelte";
    import LockableAreaPropertyEditor from "../PropertyEditor/LockableAreaPropertyEditor.svelte";

    let properties: AreaDataProperties = $state([]);
    let areaName = $state("");
    let areaDescription = $state("");
    let areaSearchable = $state(false);
    let hasJitsiRoomProperty: boolean = $state(false);
    let hasFocusableProperty: boolean = $state(false);
    let hasHighlightProperty: boolean = $state(false);
    let hasSilentProperty: boolean = $state(false);
    let hasSpeakerMegaphoneProperty: boolean = $state(false);
    let hasListenerMegaphoneProperty: boolean = $state(false);
    let hasStartProperty: boolean = $state(false);
    let hasExitProperty: boolean = $state(false);
    let hasplayAudioProperty: boolean = $state(false);
    let showDescriptionField = $state(false);
    let hasPersonalAreaProperty: boolean = $state(false);
    let hasRightsProperty: boolean = $state(false);
    let hasMatrixRoom: boolean = $state(false);
    let hasTooltipPropertyData: boolean = $state(false);
    let hasLivekitRoomProperty: boolean = $state(false);
    let hasMaxUsersInAreaProperty: boolean = $state(false);
    let hasLockableAreaProperty: boolean = $state(false);

    const applicationManager = gameManager.getCurrentGameScene().applicationManager;

    const ROOM_AREA_PUSHER_URL = new URL("roomArea", PUSHER_URL).toString();

    let selectedAreaPreviewUnsubscriber = mapEditorSelectedAreaPreviewStore.subscribe((currentAreaPreview) => {
        if (currentAreaPreview) {
            properties = structuredClone(currentAreaPreview.getProperties());
            areaName = currentAreaPreview.getAreaData().name;
            const descriptionProperty = $mapEditorSelectedAreaPreviewStore
                ?.getProperties()
                .find((property) => property.type === "areaDescriptionProperties");
            if (descriptionProperty == undefined) {
                $mapEditorSelectedAreaPreviewStore?.addProperty({
                    id: uuid(),
                    type: "areaDescriptionProperties",
                    description: areaDescription,
                    searchable: areaSearchable,
                });
            } else if (descriptionProperty.type === "areaDescriptionProperties") {
                areaDescription = descriptionProperty.description ?? "";
                areaSearchable = descriptionProperty.searchable ?? false;
            }
            refreshFlags();
        }
    });

    function getSpeakerMegaphoneAreasName(): SvelteMap<string, string> {
        const areasName = new SvelteMap<string, string>();
        const wamFile = gameManager.getCurrentGameScene().getGameMap().getWamFile();
        if (!wamFile) {
            return areasName;
        }

        wamFile
            .getGameMapAreas()
            .getAreas()
            .forEach((area) => {
                const speakerMegaphonePropertyRaw = area.properties?.find(
                    (property) => property.type === "speakerMegaphone",
                );
                if (speakerMegaphonePropertyRaw) {
                    const speakerMegaphoneProperty =
                        SpeakerMegaphonePropertyData.safeParse(speakerMegaphonePropertyRaw);
                    if (speakerMegaphoneProperty.success) {
                        areasName.set(area.id, speakerMegaphoneProperty.data.name);
                    }
                }
            });
        return areasName;
    }

    function getPropertyFromType(type: AreaDataPropertiesKeys, subtype?: string): AreaDataProperty {
        const id = uuid();
        let placeholder: string;
        let policy: string | undefined;
        switch (type) {
            case "start":
                return {
                    id,
                    type,
                    isDefault: true,
                };
            case "silent": {
                // Add highlight property if not present. Use time out to improve UX and add after the listener megaphone property
                setTimeout(() => {
                    if (!$mapEditorSelectedAreaPreviewStore?.getProperties().find((p) => p.type === "highlight")) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(getPropertyFromType("highlight"));
                    }
                }, 500);
                return {
                    id,
                    type,
                    hideButtonLabel: true,
                };
            }
            case "focusable":
                return {
                    id,
                    type,
                    zoom_margin: 0.5,
                    hideButtonLabel: true,
                };
            case "highlight":
                return {
                    id,
                    type,
                    opacity: 0.6,
                    gradientWidth: 10,
                    duration: 250,
                    color: "#000000",
                    hideButtonLabel: true,
                };
            case "jitsiRoomProperty": {
                // Add highlight property if not present. Use time out to improve UX and add after the listener megaphone property
                setTimeout(() => {
                    if (
                        !$mapEditorSelectedAreaPreviewStore
                            ?.getProperties()
                            .find((p) => p.type === "lockableAreaPropertyData")
                    ) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(
                            getPropertyFromType("lockableAreaPropertyData"),
                        );
                    }
                    if (!$mapEditorSelectedAreaPreviewStore?.getProperties().find((p) => p.type === "highlight")) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(getPropertyFromType("highlight"));
                    }
                }, 500);
                return {
                    id,
                    type,
                    closable: true,
                    jitsiRoomConfig: {},
                    hideButtonLabel: true,
                    roomName: $LL.mapEditor.properties.jitsiRoomProperty.label(),
                    trigger: ON_ACTION_TRIGGER_ENTER,
                };
            }
            case "livekitRoomProperty": {
                // Add lockableProperty, then highlight property if not present. Use time out to improve UX and add after the listener megaphone property
                setTimeout(() => {
                    if (
                        !$mapEditorSelectedAreaPreviewStore
                            ?.getProperties()
                            .find((p) => p.type === "lockableAreaPropertyData")
                    ) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(
                            getPropertyFromType("lockableAreaPropertyData"),
                        );
                    }
                    if (!$mapEditorSelectedAreaPreviewStore?.getProperties().find((p) => p.type === "highlight")) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(getPropertyFromType("highlight"));
                    }
                }, 500);
                return {
                    id,
                    type,
                    roomName: "",
                    livekitRoomConfig: {
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        disableChat: false,
                    },
                    livekitRoomAdminTag: "",
                };
            }
            case "openWebsite": {
                // TODO refactore and use the same code than EntityPropertiesEditor
                switch (subtype) {
                    case "youtube":
                        placeholder = "https://www.youtube.com/watch?v=Y9ubBWf5w20";
                        policy =
                            "fullscreen; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share;";
                        break;
                    case "klaxoon":
                        placeholder = "https://app.klaxoon.com/";
                        break;
                    case "googleDrive":
                        placeholder = "https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview";
                        break;
                    case "googleDocs":
                        placeholder =
                            "https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit";
                        break;
                    case "googleSheets":
                        placeholder =
                            "https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit";
                        break;
                    case "googleSlides":
                        placeholder =
                            "https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit";
                        break;
                    case "eraser":
                        placeholder = "https://app.eraser.io/workspace/ExSd8Z4wPsaqMMgTN4VU";
                        break;
                    case "excalidraw":
                        placeholder = "https://excalidraw.workadventu.re/";
                        break;
                    case "cards":
                        placeholder =
                            "https://member.workadventu.re/cards?tenant=<your tenant from cards>&learning=<your leaning from cards>";
                        break;
                    case "tldraw":
                        placeholder = "https://tldraw.com/";
                        break;
                    default:
                        placeholder = "https://workadventu.re";
                        break;
                }
                return {
                    id,
                    type,
                    link: "",
                    closable: true,
                    newTab: false,
                    hideButtonLabel: true,
                    application: subtype ?? "website",
                    placeholder,
                    allowAPI: false,
                    forceNewTab: false,
                    policy,
                    width: 50,
                    trigger: ON_ACTION_TRIGGER_ENTER,
                    hideUrl: false,
                };
            }
            case "playAudio":
                return {
                    id,
                    type,
                    hideButtonLabel: true,
                    audioLink: "",
                    volume: 1,
                };
            case "speakerMegaphone": {
                const areasName = getSpeakerMegaphoneAreasName();
                // Add highlight property if not present. Use time out to improve UX and add after the listener megaphone property
                setTimeout(() => {
                    if (
                        !$mapEditorSelectedAreaPreviewStore
                            ?.getProperties()
                            .find((p) => p.type === "lockableAreaPropertyData")
                    ) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(
                            getPropertyFromType("lockableAreaPropertyData"),
                        );
                    }
                    if (!$mapEditorSelectedAreaPreviewStore?.getProperties().find((p) => p.type === "highlight")) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(getPropertyFromType("highlight"));
                    }
                }, 500);
                return {
                    id,
                    type,
                    name: areasName.size > 0 ? `MySpeakerZone${areasName.size + 1}` : "MySpeakerZone1",
                    chatEnabled: false,
                    seeAttendees: false,
                };
            }
            case "listenerMegaphone": {
                const areasName = getSpeakerMegaphoneAreasName();
                // Add highlight property if not present. Use time out to improve UX and add after the listener megaphone property
                setTimeout(() => {
                    if (!$mapEditorSelectedAreaPreviewStore?.getProperties().find((p) => p.type === "highlight")) {
                        $mapEditorSelectedAreaPreviewStore?.addProperty(getPropertyFromType("highlight"));
                    }
                }, 500);
                return {
                    id,
                    type,
                    speakerZoneName: areasName.size == 1 ? [...areasName.keys()][0] : "",
                    chatEnabled: false,
                    allowTalking: false,
                };
            }
            case "exit":
                return {
                    id,
                    type,
                    url: "",
                    areaName: "",
                };
            case "restrictedRightsPropertyData":
                return {
                    id,
                    type,
                    readTags: [],
                    writeTags: [],
                };
            case "personalAreaPropertyData":
                return {
                    id,
                    type,
                    accessClaimMode: PersonalAreaAccessClaimMode.enum.dynamic,
                    allowedTags: [],
                    ownerId: null,
                };
            case "extensionModule":
                if (subtype === undefined) {
                    throw new Error("Missing subtype for extensionModule");
                }
                return {
                    id,
                    type,
                    subtype,
                    data: null,
                };
            case "matrixRoomPropertyData":
                return {
                    id,
                    type,
                    shouldOpenAutomatically: false,
                    displayName: "",
                    resourceUrl: ROOM_AREA_PUSHER_URL,
                    serverData: {
                        matrixRoomId: undefined,
                    },
                };
            case "tooltipPropertyData":
                return {
                    id,
                    type,
                    content: "",
                    duration: 2,
                };
            case "openFile":
                return {
                    id,
                    type,
                    link: "",
                    name: "",
                    closable: true,
                    newTab: false,
                    hideButtonLabel: true,
                    policy,
                    width: 50,
                    trigger: ON_ACTION_TRIGGER_ENTER,
                    hideUrl: false,
                };
            case "maxUsersInAreaPropertyData":
                return {
                    id,
                    type,
                    maxUsers: 15,
                };
            case "lockableAreaPropertyData":
                return {
                    id,
                    type,
                    // Note: lock state is stored in area property variables, not in the WAM
                    allowedTags: [],
                };
            default:
                throw new Error(`Unknown property type ${type}`);
        }
    }

    onDestroy(() => {
        selectedAreaPreviewUnsubscriber();
    });

    function onAddProperty(type: AreaDataPropertiesKeys, subtype?: string) {
        if ($mapEditorSelectedAreaPreviewStore) {
            analyticsClient.addMapEditorProperty("area", type || "unknown");
            const property = getPropertyFromType(type, subtype);
            $mapEditorSelectedAreaPreviewStore.addProperty(property);

            // if klaxoon, open Activity Picker
            if (subtype === "klaxoon") {
                openKlaxoonActivityPicker(property);
            }

            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore.getProperties();
            refreshFlags();
        }
    }

    function onAddSpecificProperty(app: ApplicationDefinitionInterface) {
        if (!$mapEditorSelectedAreaPreviewStore) return;
        analyticsClient.addMapEditorProperty("entity", app.name);
        const property: OpenWebsitePropertyData = {
            id: uuid(),
            type: "openWebsite",
            application: app.name,
            closable: true,
            buttonLabel: app.name,
            link: "",
            newTab: false,
            placeholder: app.description,
            label: app.name,
            policy: app.policy,
            icon: app.image,
            regexUrl: app.regexUrl,
            targetEmbedableUrl: app.targetUrl,
            forceNewTab: app.forceNewTab,
            allowAPI: app.allowAPI,
            hideUrl: false,
        };
        $mapEditorSelectedAreaPreviewStore.addProperty(property);

        // refresh properties
        properties = $mapEditorSelectedAreaPreviewStore.getProperties();
        refreshFlags();
    }

    function onDeleteProperty(id: string, removeAreaEntities?: boolean) {
        if ($mapEditorSelectedAreaPreviewStore) {
            analyticsClient.removeMapEditorProperty(
                "area",
                properties.find((property) => property.id === id)?.type || "unknown",
            );
            $mapEditorSelectedAreaPreviewStore.deleteProperty(id, removeAreaEntities);
            // refresh properties
            properties = $mapEditorSelectedAreaPreviewStore.getProperties();
            refreshFlags();
        }
    }

    function onUpdateName() {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.setAreaName(areaName);
        }
    }

    function onUpdateAreaDescription() {
        let properties = $mapEditorSelectedAreaPreviewStore
            ?.getProperties()
            .find((p) => p.type === "areaDescriptionProperties");
        if (!properties || (properties && properties.type !== "areaDescriptionProperties"))
            throw new Error("Wrong property type");

        properties.description = areaDescription;
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateProperty($state.snapshot(properties));
        }
    }

    function onUpdateAreaSearchable() {
        let properties = $mapEditorSelectedAreaPreviewStore
            ?.getProperties()
            .find((p) => p.type === "areaDescriptionProperties");
        if (!properties || (properties && properties.type !== "areaDescriptionProperties"))
            throw new Error("Wrong property type");

        properties.searchable = areaSearchable;
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateProperty($state.snapshot(properties));
        }
    }

    function onUpdateProperty(property: AreaDataProperty, removeAreaEntities?: boolean) {
        if ($mapEditorSelectedAreaPreviewStore) {
            $mapEditorSelectedAreaPreviewStore.updateProperty($state.snapshot(property), removeAreaEntities);
        }
    }

    function hasProperty(propertyType: AreaDataPropertiesKeys): boolean {
        return properties.find((property) => property.type === propertyType) !== undefined;
    }

    function refreshFlags(): void {
        hasJitsiRoomProperty = hasProperty("jitsiRoomProperty");
        hasFocusableProperty = hasProperty("focusable");
        hasHighlightProperty = hasProperty("highlight");
        hasSilentProperty = hasProperty("silent");
        hasSpeakerMegaphoneProperty = hasProperty("speakerMegaphone");
        hasListenerMegaphoneProperty = hasProperty("listenerMegaphone");
        hasStartProperty = hasProperty("start");
        hasExitProperty = hasProperty("exit");
        hasplayAudioProperty = hasProperty("playAudio");
        hasPersonalAreaProperty = hasProperty("personalAreaPropertyData");
        hasRightsProperty = hasProperty("restrictedRightsPropertyData");
        hasMatrixRoom = hasProperty("matrixRoomPropertyData");
        hasTooltipPropertyData = hasProperty("tooltipPropertyData");
        hasLivekitRoomProperty = hasProperty("livekitRoomProperty");
        hasMaxUsersInAreaProperty = hasProperty("maxUsersInAreaPropertyData");
        hasLockableAreaProperty = hasProperty("lockableAreaPropertyData");
    }

    function openKlaxoonActivityPicker(app: AreaDataProperty) {
        if (!applicationManager.klaxoonToolClientId || app.type !== "openWebsite" || app.application !== "klaxoon") {
            console.info("openKlaxoonActivityPicker: app is not a klaxoon app");
            return;
        }
        KlaxoonService.openKlaxoonActivityPicker(applicationManager.klaxoonToolClientId, (payload: KlaxoonEvent) => {
            app.link = KlaxoonService.getKlaxoonEmbedUrl(new URL(payload.url), applicationManager.klaxoonToolClientId);
            app.poster = payload.imageUrl ?? undefined;
            app.buttonLabel = payload.title ?? undefined;
            onUpdateProperty(app);
        });
    }

    // Fixme: this is a hack to force the map editor to update the property
    function onUpdateAudioProperty(property: PlayAudioPropertyData) {
        onUpdateProperty(property);
    }

    function toggleDescriptionField() {
        showDescriptionField = !showDescriptionField;
    }

    let extensionModulesAreaMapEditor = $extensionModuleStore.reduce(
        (acc: { [key: string]: ExtensionModuleAreaProperty }[], module: ExtensionModule) => {
            const areaProperty = module.areaMapEditor?.();
            if (areaProperty != undefined) {
                acc.push(areaProperty);
            }
            return acc;
        },
        [],
    );
</script>

{#if $mapEditorSelectedAreaPreviewStore === undefined}
    {$LL.mapEditor.areaEditor.editInstructions()}
{:else}
    <div class="overflow-x-hidden space-y-3">
        <div class="properties-buttons flex flex-row flex-wrap">
            {#if !hasPersonalAreaProperty && !hasRightsProperty}
                <AddPropertyButtonWrapper
                    property="personalAreaPropertyData"
                    onclick={() => onAddProperty("personalAreaPropertyData")}
                />
            {/if}
            {#if !hasPersonalAreaProperty && !hasRightsProperty}
                <AddPropertyButtonWrapper
                    property="restrictedRightsPropertyData"
                    onclick={() => onAddProperty("restrictedRightsPropertyData")}
                />
            {/if}
        </div>
        <div class="properties-buttons flex flex-row flex-wrap">
            {#if !hasSilentProperty}
                <AddPropertyButtonWrapper
                    property="silent"
                    onclick={() => {
                        onAddProperty("silent");
                    }}
                />
            {/if}
            {#if !hasLivekitRoomProperty}
                <AddPropertyButtonWrapper
                    property="livekitRoomProperty"
                    onclick={() => {
                        onAddProperty("livekitRoomProperty");
                    }}
                    disabled={hasSpeakerMegaphoneProperty || hasListenerMegaphoneProperty}
                />
            {/if}
            {#if FEATURE_FLAG_BROADCAST_AREAS}
                {#if !hasSpeakerMegaphoneProperty}
                    <AddPropertyButtonWrapper
                        property="speakerMegaphone"
                        onclick={() => {
                            onAddProperty("speakerMegaphone");
                        }}
                        disabled={hasListenerMegaphoneProperty || hasLivekitRoomProperty}
                    />
                {/if}
                {#if !hasListenerMegaphoneProperty}
                    <AddPropertyButtonWrapper
                        property="listenerMegaphone"
                        onclick={() => {
                            onAddProperty("listenerMegaphone");
                        }}
                        disabled={hasSpeakerMegaphoneProperty || hasLivekitRoomProperty}
                    />
                {/if}
            {/if}
            {#if !hasStartProperty}
                <AddPropertyButtonWrapper
                    property="start"
                    onclick={() => {
                        onAddProperty("start");
                    }}
                />
            {/if}
            {#if !hasExitProperty}
                <AddPropertyButtonWrapper
                    property="exit"
                    onclick={() => {
                        onAddProperty("exit");
                    }}
                />
            {/if}
            {#if !hasplayAudioProperty}
                <AddPropertyButtonWrapper
                    property="playAudio"
                    onclick={() => {
                        onAddProperty("playAudio");
                    }}
                />
            {/if}

            {#if !hasMatrixRoom && MATRIX_PUBLIC_URI}
                <AddPropertyButtonWrapper
                    property="matrixRoomPropertyData"
                    onclick={() => {
                        onAddProperty("matrixRoomPropertyData");
                        if (hasLivekitRoomProperty) {
                            const livekitRoomProperty = properties.find(
                                (property) => property.type === "livekitRoomProperty",
                            );
                            if (livekitRoomProperty) {
                                const config = livekitRoomProperty.livekitRoomConfig ?? {
                                    startWithAudioMuted: false,
                                    startWithVideoMuted: false,
                                    disableChat: false,
                                };

                                config.disableChat = true;

                                livekitRoomProperty.livekitRoomConfig = config;
                                onUpdateProperty(livekitRoomProperty);
                            }
                        }
                    }}
                />
            {/if}
            {#if !hasFocusableProperty}
                <AddPropertyButtonWrapper
                    property="focusable"
                    onclick={() => {
                        onAddProperty("focusable");
                    }}
                />
            {/if}
            {#if !hasHighlightProperty}
                <AddPropertyButtonWrapper
                    property="highlight"
                    onclick={() => {
                        onAddProperty("highlight");
                    }}
                />
            {/if}
            {#if !hasTooltipPropertyData}
                <AddPropertyButtonWrapper
                    property="tooltipPropertyData"
                    onclick={() => {
                        onAddProperty("tooltipPropertyData");
                    }}
                />
            {/if}
            {#if !hasLockableAreaProperty}
                <AddPropertyButtonWrapper
                    property="lockableAreaPropertyData"
                    onclick={() => {
                        onAddProperty("lockableAreaPropertyData");
                    }}
                />
            {/if}
            {#if !hasMaxUsersInAreaProperty}
                <AddPropertyButtonWrapper
                    property="maxUsersInAreaPropertyData"
                    onclick={() => {
                        onAddProperty("maxUsersInAreaPropertyData");
                    }}
                />
            {/if}
        </div>
        {#if extensionModulesAreaMapEditor.length > 0 || !hasJitsiRoomProperty}
            <div class="properties-buttons flex flex-row flex-wrap mt-2">
                {#each extensionModulesAreaMapEditor as extensionModuleAreaMapEditor, index (`extensionModulesAreaMapEditor-${index}`)}
                    {#each Object.entries(extensionModuleAreaMapEditor) as [subtype, areaProperty] (`extensionModuleAreaMapEditor-${subtype}`)}
                        {#if areaProperty.shouldDisplayButton(properties)}
                            <AddPropertyButtonWrapper
                                property="extensionModule"
                                subProperty={subtype}
                                onclick={() => {
                                    onAddProperty("extensionModule", subtype);
                                }}
                            />
                        {/if}
                    {/each}
                {/each}
                {#if !hasJitsiRoomProperty}
                    <AddPropertyButtonWrapper
                        property="jitsiRoomProperty"
                        onclick={() => {
                            onAddProperty("jitsiRoomProperty");
                        }}
                        disabled={hasLivekitRoomProperty || hasSpeakerMegaphoneProperty || hasListenerMegaphoneProperty}
                    />
                {/if}
            </div>
        {/if}
        <div class="properties-buttons flex flex-row flex-wrap mt-2">
            <AddPropertyButtonWrapper
                property="openWebsite"
                onclick={() => {
                    onAddProperty("openWebsite");
                }}
            />

            <AddPropertyButtonWrapper
                property="openFile"
                onclick={() => {
                    onAddProperty("openFile");
                }}
            />

            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="klaxoon"
                onclick={() => {
                    onAddProperty("openWebsite", "klaxoon");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="youtube"
                onclick={() => {
                    onAddProperty("openWebsite", "youtube");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleDrive"
                onclick={() => {
                    onAddProperty("openWebsite", "googleDrive");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleDocs"
                onclick={() => {
                    onAddProperty("openWebsite", "googleDocs");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleSheets"
                onclick={() => {
                    onAddProperty("openWebsite", "googleSheets");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="googleSlides"
                onclick={() => {
                    onAddProperty("openWebsite", "googleSlides");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="eraser"
                onclick={() => {
                    onAddProperty("openWebsite", "eraser");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="excalidraw"
                onclick={() => {
                    onAddProperty("openWebsite", "excalidraw");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="cards"
                onclick={() => {
                    onAddProperty("openWebsite", "cards");
                }}
            />
            <AddPropertyButtonWrapper
                property="openWebsite"
                subProperty="tldraw"
                onclick={() => {
                    onAddProperty("openWebsite", "tldraw");
                }}
            />
        </div>
        <div class="properties-buttons flex flex-row flex-wrap mt-2">
            {#each applicationManager.applications as app, index (`my-own-app-${index}`)}
                <AddPropertyButtonWrapper
                    property="openWebsite"
                    subProperty={app.name}
                    onclick={() => {
                        onAddSpecificProperty(app);
                    }}
                />
            {/each}
        </div>

        <Input
            id="objectName"
            label={$LL.mapEditor.areaEditor.nameLabel()}
            type="text"
            placeholder={$LL.mapEditor.areaEditor.nameLabelPlaceholder()}
            bind:value={areaName}
            onchange={onUpdateName}
        />
        <p class="help-text">
            <IconInfoCircle font-size="18" />
            {$LL.mapEditor.areaEditor.nameHelpText()}
        </p>

        <div class="area-name-container">
            {#if !showDescriptionField}
                <button class="ps-0 text-blue-500 flex flex-row items-center" onclick={toggleDescriptionField}>
                    <IconChevronRight />{$LL.mapEditor.areaEditor.addDescriptionField()}</button
                >
            {:else}
                <button class="ps-0 text-blue-500 flex flex-row items-center" onclick={toggleDescriptionField}>
                    <IconChevronDown />{$LL.mapEditor.areaEditor.addDescriptionField()}</button
                >

                <TextArea
                    id="objectDescription"
                    label={$LL.mapEditor.areaEditor.areaDescription()}
                    placeHolder={$LL.mapEditor.areaEditor.areaDescriptionPlaceholder()}
                    bind:value={areaDescription}
                    onchange={onUpdateAreaDescription}
                    onkeypress={() => {}}
                />
            {/if}
        </div>

        <InputSwitch
            id="searchable"
            label={$LL.mapEditor.areaEditor.areaSerchable()}
            bind:value={areaSearchable}
            onchange={onUpdateAreaSearchable}
        />

        <div class="properties-container p-1">
            {#each properties as property, i (property.id)}
                {#if property.type !== "areaDescriptionProperties"}
                    <div class="property-box border border-solid border-white/20 bg-white/5 rounded p-2 my-8">
                        {#if properties[i].type === "focusable"}
                            <FocusablePropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "highlight"}
                            <HighlightPropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if property.type === "silent"}
                            <SilentPropertyEditor
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                            />
                        {:else if properties[i].type === "jitsiRoomProperty"}
                            <JitsiRoomPropertyEditor
                                bind:property={properties[i]}
                                isArea={true}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if property.type === "playAudio"}
                            <PlayAudioPropertyEditor
                                property={{ ...property, hideButtonLabel: true }}
                                isArea={true}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onaudiolink={onUpdateAudioProperty}
                            />
                        {:else if properties[i].type === "openWebsite"}
                            <OpenWebsitePropertyEditor
                                bind:property={properties[i]}
                                isArea={true}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "speakerMegaphone"}
                            <SpeakerMegaphonePropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "listenerMegaphone"}
                            <ListenerMegaphonePropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "start"}
                            <StartPropertyEditor
                                bind:property={properties[i]}
                                startAreaName={areaName}
                                updateStartAreaNameCallback={(name) => {
                                    // Wait for the name to be updated in the DOM
                                    setTimeout(() => {
                                        if (name === areaName) return;
                                        areaName = name;
                                        onUpdateName();
                                    }, 100);
                                }}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "exit"}
                            <ExitPropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "restrictedRightsPropertyData"}
                            <RightsPropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "personalAreaPropertyData"}
                            <PersonalAreaPropertyEditor
                                bind:property={properties[i]}
                                onclose={(removeAreaEntities) => {
                                    onDeleteProperty(property.id, removeAreaEntities);
                                }}
                                onchange={(removeAreaEntities) => onUpdateProperty(property, removeAreaEntities)}
                            />
                        {:else if properties[i].type === "extensionModule" && extensionModulesAreaMapEditor.length > 0}
                            {#each extensionModulesAreaMapEditor as extensionModuleAreaMapEditor, index (`extensionModulesAreaMapEditor-${index}`)}
                                {#if extensionModuleAreaMapEditor[properties[i].subtype] != undefined}
                                    {@const AreaPropertyEditor =
                                        extensionModuleAreaMapEditor[properties[i].subtype].AreaPropertyEditor}
                                    <AreaPropertyEditor
                                        {extensionModuleAreaMapEditor}
                                        bind:property={properties[i]}
                                        onclose={() => {
                                            onDeleteProperty(property.id);
                                        }}
                                        onchange={() => onUpdateProperty(property)}
                                    />
                                {/if}
                            {/each}
                        {:else if properties[i].type === "matrixRoomPropertyData"}
                            <MatrixRoomPropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "tooltipPropertyData"}
                            <TooltipPropertyButton
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "openFile"}
                            <OpenFilePropertyEditor
                                bind:property={properties[i]}
                                isArea={true}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "livekitRoomProperty"}
                            <LivekitRoomPropertyEditor
                                bind:property={properties[i]}
                                {hasHighlightProperty}
                                shouldDisableDisableChatButton={hasMatrixRoom}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                                onhighlightareaonenter={() => onAddProperty("highlight")}
                            />
                        {:else if properties[i].type === "lockableAreaPropertyData"}
                            <LockableAreaPropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {:else if properties[i].type === "maxUsersInAreaPropertyData"}
                            <MaxUsersInAreaPropertyEditor
                                bind:property={properties[i]}
                                onclose={() => {
                                    onDeleteProperty(property.id);
                                }}
                                onchange={() => onUpdateProperty(property)}
                            />
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>
    </div>
{/if}

<style lang="scss">
    .properties-container {
        overflow-y: auto;
        overflow-x: hidden;
    }

    .properties-container::-webkit-scrollbar {
        display: none;
    }

    .area-name-container {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;

        * {
            margin-bottom: 0;
        }
    }

    //     .input-switch {
    //         position: relative;
    //         top: 0px;
    //         right: 0px;
    //         bottom: 0px;
    //         left: 0px;
    //         display: inline-block;
    //         height: 1rem;
    //         width: 2rem;
    //         -webkit-appearance: none;
    //         -moz-appearance: none;
    //         appearance: none;
    //         border-radius: 9999px;
    //         border-width: 1px;
    //         border-style: solid;
    //         --border-opacity: 1;
    //         border-color: rgb(77 75 103 / var(--border-opacity));
    //         --bg-opacity: 1;
    //         background-color: rgb(15 31 45 / var(--bg-opacity));
    //         background-image: none;
    //         padding: 0px;
    //         --text-opacity: 1;
    //         color: rgb(242 253 255 / var(--text-opacity));
    //         outline: 2px solid transparent;
    //         outline-offset: 2px;
    //         cursor: url(../../../../../public/static/images/cursor_pointer.png), pointer;
    //     }

    //     .input-switch::before {
    //         position: absolute;
    //         left: -3px;
    //         top: -3px;
    //         height: 1.25rem;
    //         width: 1.25rem;
    //         border-radius: 9999px;
    //         --bg-opacity: 1;
    //         background-color: rgb(146 142 187 / var(--bg-opacity));
    //         transition-property: all;
    //         transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    //         transition-duration: 150ms;
    //         --content: "";
    //         content: var(--content);
    //     }

    //     .input-switch:checked {
    //         --border-opacity: 1;
    //         border-color: rgb(146 142 187 / var(--border-opacity));
    //     }

    //     .input-switch:checked::before {
    //         left: 13px;
    //         top: -3px;
    //         --bg-opacity: 1;
    //         background-color: rgb(65 86 246 / var(--bg-opacity));
    //         content: var(--content);
    //         /*--shadow: 0 0 7px 0 rgba(4, 255, 210, 1);
    // --shadow-colored: 0 0 7px 0 var(--shadow-color);
    // box-shadow: var(--ring-offset-shadow, 0 0 #0000), var(--ring-shadow, 0 0 #0000), var(--shadow);*/
    //     }

    //     .input-switch:disabled {
    //         cursor: not-allowed;
    //         opacity: 0.4;
    //     }
</style>
