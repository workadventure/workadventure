<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import type { KlaxoonEvent } from "@workadventure/shared-utils";
    import {
        ApplicationService,
        defautlNativeIntegrationAppName,
        GoogleWorkSpaceService,
        KlaxoonService,
        MediaLinkManager,
    } from "@workadventure/shared-utils";
    import CloseButton from "../../../../Components/MapEditor/PropertyEditor/CloseButton.svelte";
    import { connectionManager } from "../../../../Connection/ConnectionManager";
    import { GOOGLE_DRIVE_PICKER_APP_ID, GOOGLE_DRIVE_PICKER_CLIENT_ID } from "../../../../Enum/EnvironmentVariable";
    import LL from "../../../../../i18n/i18n-svelte";
    import type { ApplicationProperty } from "../MessageInputBar.svelte";

    const dispatch = createEventDispatcher<{
        update: ApplicationProperty;
        // Currently resolving oEmbed link
        processing: void;
        // Resolved oEmbed link
        processed: void;
        close: void;
        input: string;
    }>();

    export let property: ApplicationProperty;

    let errorLink: string | undefined;
    let htmlElementInput: HTMLInputElement;
    let timeOutToFocusElement: ReturnType<typeof setTimeout>;
    let timeOutToHtmlInpuElement: ReturnType<typeof setTimeout>;

    async function initialiseLinkFactory() {
        errorLink = undefined;
        let link = property.link;

        try {
            switch (property.name) {
                case defautlNativeIntegrationAppName.KLAXOON:
                    if (connectionManager.klaxoonToolClientId == undefined) return;
                    KlaxoonService.openKlaxoonActivityPicker(
                        connectionManager.klaxoonToolClientId,
                        (payload: KlaxoonEvent) => {
                            link = KlaxoonService.getKlaxoonEmbedUrl(
                                new URL(payload.url),
                                connectionManager.klaxoonToolClientId
                            );
                            dispatch("update", { ...property, link });
                        }
                    );
                    break;
                case defautlNativeIntegrationAppName.GOOGLE_DRIVE:
                    if (GOOGLE_DRIVE_PICKER_CLIENT_ID == undefined || GOOGLE_DRIVE_PICKER_APP_ID == undefined) return;
                    link = await GoogleWorkSpaceService.initGooglePicker(
                        GOOGLE_DRIVE_PICKER_CLIENT_ID,
                        GOOGLE_DRIVE_PICKER_APP_ID
                    );
                    break;
                case defautlNativeIntegrationAppName.GOOGLE_DOCS:
                    if (GOOGLE_DRIVE_PICKER_CLIENT_ID == undefined || GOOGLE_DRIVE_PICKER_APP_ID == undefined) return;
                    link = await GoogleWorkSpaceService.initGooglePicker(
                        GOOGLE_DRIVE_PICKER_CLIENT_ID,
                        GOOGLE_DRIVE_PICKER_APP_ID,
                        window.google.picker.ViewId.DOCS
                    );
                    break;
                case defautlNativeIntegrationAppName.GOOGLE_SHEETS:
                    if (GOOGLE_DRIVE_PICKER_CLIENT_ID == undefined || GOOGLE_DRIVE_PICKER_APP_ID == undefined) return;
                    link = await GoogleWorkSpaceService.initGooglePicker(
                        GOOGLE_DRIVE_PICKER_CLIENT_ID,
                        GOOGLE_DRIVE_PICKER_APP_ID,
                        window.google.picker.ViewId.SPREADSHEETS
                    );
                    break;
                case defautlNativeIntegrationAppName.GOOGLE_SLIDES:
                    if (GOOGLE_DRIVE_PICKER_CLIENT_ID == undefined || GOOGLE_DRIVE_PICKER_APP_ID == undefined) return;
                    link = await GoogleWorkSpaceService.initGooglePicker(
                        GOOGLE_DRIVE_PICKER_CLIENT_ID,
                        GOOGLE_DRIVE_PICKER_APP_ID,
                        window.google.picker.ViewId.PRESENTATIONS
                    );
                    break;
            }
        } catch (error) {
            console.error(error);
            link = "";
        } finally {
            dispatch("update", { ...property, link });
        }
    }

    async function unFocus() {
        dispatch("processing");
        errorLink = undefined;
        let link = htmlElementInput.value.trim();
        try {
            let mediaLink = new MediaLinkManager(htmlElementInput.value.trim());
            mediaLink.linkMatchWithApplicationIdOrName(property.name);
            link = await mediaLink.getEmbedLink({
                klaxoonId: connectionManager.klaxoonToolClientId,
                excalidrawDomains: connectionManager.excalidrawToolDomains,
            });
            if (property.regexUrl) {
                link = ApplicationService.validateLink(
                    new URL(link),
                    property.regexUrl,
                    $LL.mapEditor.properties.openWebsite.errorEmbeddableLink(),
                    property.targetEmbedableUrl
                );
            }
        } catch (error) {
            console.error("Error while analyzing a link:", error);
            link = "";
            errorLink = getErrorFromPropertyName() ?? errorLink ?? (error as Error).message;
        } finally {
            dispatch("processed");
            dispatch("update", { ...property, link });
        }
    }

    function getErrorFromPropertyName() {
        switch (property.name) {
            case defautlNativeIntegrationAppName.YOUTUBE:
                return $LL.mapEditor.properties.youtube.error();
            case defautlNativeIntegrationAppName.KLAXOON:
                return $LL.mapEditor.properties.klaxoon.error();
            case defautlNativeIntegrationAppName.GOOGLE_DRIVE:
                return $LL.mapEditor.properties.googleDrive.error();
            case defautlNativeIntegrationAppName.GOOGLE_DOCS:
                return $LL.mapEditor.properties.googleDocs.error();
            case defautlNativeIntegrationAppName.GOOGLE_SHEETS:
                return $LL.mapEditor.properties.googleSheets.error();
            case defautlNativeIntegrationAppName.GOOGLE_SLIDES:
                return $LL.mapEditor.properties.googleSlides.error();
            case defautlNativeIntegrationAppName.ERASER:
                return $LL.mapEditor.properties.eraser.error();
            case defautlNativeIntegrationAppName.EXCALIDRAW:
                return $LL.mapEditor.properties.excalidraw.error();
            case defautlNativeIntegrationAppName.CARDS:
                return $LL.mapEditor.properties.cards.error();
            case defautlNativeIntegrationAppName.TLDRAW:
                return $LL.mapEditor.properties.tldraw.error();
            default:
                return null;
        }
    }

    // Permit to broadcast update of the link after 2 seconds of inactivity and have a draft of the link
    function input() {
        errorLink = undefined;
        if (timeOutToHtmlInpuElement) clearTimeout(timeOutToHtmlInpuElement);
        timeOutToHtmlInpuElement = setTimeout(() => {
            unFocus().catch((error) => {
                console.error(error);
            });
        }, 2000);
    }

    onMount(() => {
        initialiseLinkFactory().catch((error) => {
            console.error(error);
        });
        if (timeOutToFocusElement) clearTimeout(timeOutToFocusElement);
        timeOutToFocusElement = setTimeout(() => {
            htmlElementInput.focus();
        }, 100);
    });

    onDestroy(() => {
        if (timeOutToFocusElement) clearTimeout(timeOutToFocusElement);
        if (timeOutToHtmlInpuElement) clearTimeout(timeOutToHtmlInpuElement);
    });
</script>

<div class="flex flex-col w-full justify-center items-center py-4 px-6 gap-2">
    <div class="flex flex-row w-full justify-between items-center gap-2">
        <img draggable="false" class="w-8" src={property.img} alt="info icon" />
        <h2 class="text-sm p-0 m-0">{property.title}</h2>
        <CloseButton
            on:click={() => {
                dispatch("close");
            }}
        />
    </div>
    <p class="text-xs text-center p-0 m-0 h-8 w-full whitespace-nowrap overflow-hidden overflow-ellipsis text-gray-400">
        {property.description}
    </p>

    <input
        data-testid="applicationInputLink"
        type="text"
        class="border rounded w-full !m-0 text-black"
        value={property.link}
        bind:this={htmlElementInput}
        on:input={() => {
            dispatch("input", property.link);
        }}
        on:focusout={unFocus}
        on:keydown={(event) => {
            if (event.key === "Enter") {
                unFocus().catch((error) => {
                    console.error(error);
                });
            }
        }}
        on:input={input}
        placeholder={property.placeholder}
    />

    {#if errorLink}
        <p data-testid="applicationLinkError" class="text-xs text-red-500 p-0 m-0 h-fit w-full">
            {errorLink}
        </p>
    {/if}
</div>
