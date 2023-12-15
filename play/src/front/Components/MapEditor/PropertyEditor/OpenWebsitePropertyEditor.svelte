<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { OpenWebsitePropertyData } from "@workadventure/map-editor";
    import { AlertTriangleIcon } from "svelte-feather-icons";
    import {
        GoogleWorkSpaceException,
        GoogleWorkSpaceService,
        KlaxoonEvent,
        KlaxoonException,
        KlaxoonService,
        YoutubeService,
        EraserService,
        EraserException,
    } from "@workadventure/shared-utils";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import youtubeSvg from "../../images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../images/applications/icon_klaxoon.svg";
    import googleDocsSvg from "../../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../images/applications/icon_google_slides.svg";
    import eraserSvg from "../../images/applications/icon_eraser.svg";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: OpenWebsitePropertyData;
    export let triggerOnActionChoosen: boolean = property.trigger === "onaction";
    export let icon = "resources/icons/icon_link.png";
    export let isArea = false;
    let optionAdvancedActivated = shouldDisplayAdvancedOption();
    let embeddable = true;
    let embeddableLoading = false;
    let error = "";
    let oldNewTabValue = property.newTab;
    let linkElement: HTMLInputElement;

    const dispatch = createEventDispatcher();

    function shouldDisplayAdvancedOption(): boolean {
        return !!(property.policy || property.allowAPI || !property.closable || property.width || property.newTab);
    }

    onMount(() => {
        // if klaxoon, open Activity Picker
        if (property.application === "klaxoon" && (property.link == undefined || property.link === "")) {
            openKlaxoonActivityPicker();
        }
        checkWebsiteProperty().catch((e) => {
            console.error("Error checking embeddable website", e);
        });
    });

    function onTriggerValueChange() {
        triggerOnActionChoosen = property.trigger === "onaction";
        dispatch("change");
    }

    function onNewTabValueChange() {
        if (property.newTab) {
            if (property.trigger === "onicon") {
                property.trigger = undefined;
            }
            // remove embed link
            if (property.link) {
                if (property.application == "googleDocs") {
                    property.link = GoogleWorkSpaceService.getGoogleWorkSpaceBasicUrl(new URL(property.link));
                } else if (property.application == "googleSheets") {
                    property.link = GoogleWorkSpaceService.getGoogleWorkSpaceBasicUrl(new URL(property.link));
                } else if (property.application == "googleSlides") {
                    property.link = GoogleWorkSpaceService.getGoogleWorkSpaceBasicUrl(new URL(property.link));
                } else if (property.application == "klaxoon") {
                    property.link = KlaxoonService.getKlaxoonBasicUrl(new URL(property.link));
                }
            }
        } else {
            // remove embed link
            if (property.link) {
                if (property.application == "googleDocs") {
                    property.link = GoogleWorkSpaceService.getGoogleDocsEmbedUrl(new URL(property.link));
                } else if (property.application == "googleSheets") {
                    property.link = GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(new URL(property.link));
                } else if (property.application == "googleSlides") {
                    property.link = GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(new URL(property.link));
                } else if (property.application == "klaxoon") {
                    property.link = KlaxoonService.getKlaxoonEmbedUrl(
                        new URL(property.link),
                        connectionManager.currentRoom?.klaxoonToolClientId
                    );
                }
            }
        }
        dispatch("change");
    }

    function onValueChange() {
        dispatch("change", property.link);
    }

    async function checkWebsiteProperty(): Promise<void> {
        if (property.link == undefined) return;
        // if the link is not a website, we don't need to check if it is embeddable
        embeddableLoading = true;
        error = "";
        if (property.application == "youtube") {
            try {
                const link = await YoutubeService.getYoutubeEmbedUrl(new URL(property.link));
                embeddable = true;
                optionAdvancedActivated = false;
                property.buttonLabel =
                    YoutubeService.getTitleFromYoutubeUrl(new URL(property.link)) ??
                    $LL.mapEditor.properties.youtubeProperties.label();
                property.link = link;
                property.newTab = oldNewTabValue;
            } catch (e: unknown) {
                embeddable = false;
                error = $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                console.info("Error to check embeddable website", e);
                property.link = null;
            }

            embeddableLoading = false;
            onValueChange();
        }

        if (property.application == "googleDocs") {
            try {
                const link = GoogleWorkSpaceService.getGoogleDocsEmbedUrl(new URL(property.link as string));
                embeddable = true;
                optionAdvancedActivated = false;
                property.link = link;
                property.newTab = oldNewTabValue;
            } catch (e) {
                embeddable = false;
                error =
                    e instanceof GoogleWorkSpaceException.GoogleDocsException
                        ? $LL.mapEditor.properties.googleDocsProperties.error()
                        : $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                console.info("Error to check embeddable website", e);
                property.link = null;
            }
            embeddableLoading = false;
            onValueChange();
        }

        if (property.application == "googleSheets") {
            try {
                const link = GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(new URL(property.link as string));
                embeddable = true;
                optionAdvancedActivated = false;
                property.link = link;
                property.newTab = oldNewTabValue;
            } catch (e) {
                embeddable = false;
                error =
                    e instanceof GoogleWorkSpaceException.GoogleSheetsException
                        ? $LL.mapEditor.properties.googleSheetsProperties.error()
                        : $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                console.info("Error to check embeddable website", e);
                property.link = null;
            }
            embeddableLoading = false;
            onValueChange();
        }

        if (property.application == "googleSlides") {
            try {
                const link = GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(new URL(property.link as string));
                embeddable = true;
                optionAdvancedActivated = false;
                property.link = link;
                property.newTab = oldNewTabValue;
            } catch (e) {
                embeddable = false;
                error =
                    e instanceof GoogleWorkSpaceException.GoogleSlidesException
                        ? $LL.mapEditor.properties.googleSlidesProperties.error()
                        : $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                console.info("Error to check embeddable website", e);
                property.link = null;
            }
            embeddableLoading = false;
            onValueChange();
        }

        if (property.application == "klaxoon") {
            try {
                const link = KlaxoonService.getKlaxoonEmbedUrl(
                    new URL(property.link as string),
                    connectionManager.currentRoom?.klaxoonToolClientId
                );
                embeddable = true;
                optionAdvancedActivated = false;
                property.link = link;
                property.newTab = oldNewTabValue;
            } catch (e) {
                embeddable = false;
                error =
                    e instanceof KlaxoonException.KlaxoonException
                        ? $LL.mapEditor.properties.klaxoonProperties.error()
                        : $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                console.info("Error to check embeddable website", e);
                property.link = null;
            }
            embeddableLoading = false;
            onValueChange();
        }

        if (property.application == "eraser") {
            try {
                EraserService.validateEraserLink(new URL(property.link as string));
                embeddable = true;
                optionAdvancedActivated = false;
                property.newTab = oldNewTabValue;
            } catch (e) {
                embeddable = false;
                error =
                    e instanceof EraserException.EraserLinkException
                        ? $LL.mapEditor.properties.eraserProperties.error()
                        : $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                console.info("Error to check embeddable website", e);
                property.link = null;
            }
            embeddableLoading = false;
            onValueChange();
        }

        // allow to check if the link is embeddable
        checkEmbeddableLink();
    }

    function checkEmbeddableLink(): void {
        if (property.link == undefined || !linkElement.checkValidity()) {
            embeddableLoading = false;
            error = error ? error : $LL.mapEditor.properties.linkProperties.errorInvalidUrl();
            return;
        }

        gameManager
            .getCurrentGameScene()
            .connection?.queryEmbeddableWebsite(property.link)
            .then((answer) => {
                if (answer) {
                    if (answer.message) {
                        error = answer.message;
                    }
                    if (!answer.state) {
                        throw new Error(answer.message);
                    }
                    embeddable = answer.embeddable;
                    property.newTab = oldNewTabValue;
                    if (answer.embeddable) {
                        if (!oldNewTabValue) {
                            //optionAdvancedActivated = false;
                        }
                    } else {
                        //optionAdvancedActivated = true;
                        property.newTab = true;
                        embeddable = false;
                    }
                    optionAdvancedActivated = shouldDisplayAdvancedOption();
                }
            })
            .catch((e: unknown) => {
                embeddable = true;
                if (e instanceof Error) {
                    error = e.message;
                } else {
                    error = $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                }
                console.info("Error checking embeddable website", e);
            })
            .finally(() => {
                embeddableLoading = false;
                onValueChange();
            });
    }

    function onKeyPressed() {
        dispatch("change", property.link);
    }

    function onClickInputHandler() {
        // If klaxxon application, open the activity picker
        if (property.application !== "klaxoon") return;
        openKlaxoonActivityPicker();
    }

    function openKlaxoonActivityPicker() {
        if (
            !connectionManager.currentRoom?.klaxoonToolClientId ||
            property.type !== "openWebsite" ||
            property.application !== "klaxoon"
        ) {
            console.info("openKlaxoonActivityPicker: app is not a klaxoon app");
            return;
        }
        KlaxoonService.openKlaxoonActivityPicker(
            connectionManager.currentRoom?.klaxoonToolClientId,
            (payload: KlaxoonEvent) => {
                property.link = KlaxoonService.getKlaxoonEmbedUrl(
                    new URL(payload.url),
                    connectionManager.currentRoom?.klaxoonToolClientId
                );
                property.poster = payload.imageUrl ?? undefined;
                property.buttonLabel = payload.title ?? undefined;
                // check if the link is embeddable
                checkWebsiteProperty().catch((e) => {
                    console.error("Error checking embeddable website", e);
                });
            }
        );
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
    on:keypress={onKeyPressed}
>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        {#if property.application === "youtube"}
            <img
                class="tw-w-6 tw-mr-1"
                src={youtubeSvg}
                alt={$LL.mapEditor.properties.youtubeProperties.description()}
            />
            {$LL.mapEditor.properties.youtubeProperties.label()}
        {:else if property.application === "klaxoon"}
            <img
                class="tw-w-6 tw-mr-1"
                src={klaxoonSvg}
                alt={$LL.mapEditor.properties.klaxoonProperties.description()}
            />
            {$LL.mapEditor.properties.klaxoonProperties.label()}
        {:else if property.application === "googleDocs"}
            <img
                class="tw-w-6 tw-mr-1"
                src={googleDocsSvg}
                alt={$LL.mapEditor.properties.googleDocsProperties.description()}
            />
            {$LL.mapEditor.properties.googleDocsProperties.label()}
        {:else if property.application === "googleSheets"}
            <img
                class="tw-w-6 tw-mr-1"
                src={googleSheetsSvg}
                alt={$LL.mapEditor.properties.googleSheetsProperties.description()}
            />
            {$LL.mapEditor.properties.googleSheetsProperties.label()}
        {:else if property.application === "googleSlides"}
            <img
                class="tw-w-6 tw-mr-1"
                src={googleSlidesSvg}
                alt={$LL.mapEditor.properties.googleSlidesProperties.description()}
            />
            {$LL.mapEditor.properties.googleSlidesProperties.label()}
        {:else if property.application === "eraser"}
            <img class="tw-w-6 tw-mr-1" src={eraserSvg} alt={$LL.mapEditor.properties.eraserProperties.description()} />
            {$LL.mapEditor.properties.eraserProperties.label()}
        {:else}
            <img class="tw-w-6 tw-mr-1" src={icon} alt={$LL.mapEditor.properties.linkProperties.description()} />
            {$LL.mapEditor.properties.linkProperties.label()}
        {/if}
    </span>
    <span slot="content">
        {#if property.poster}
            <div class="tw-text-center">
                <img class="tw-w-20  tw-mr-1" src={property.poster} alt="" />
            </div>
        {/if}
        {#if isArea}
            <div>
                <label class="tw-m-0" for="trigger">{$LL.mapEditor.properties.linkProperties.trigger()}</label>
                <select
                    id="trigger"
                    class="tw-w-full tw-m-0"
                    bind:value={property.trigger}
                    on:change={onTriggerValueChange}
                >
                    <option value={undefined}>{$LL.mapEditor.properties.linkProperties.triggerShowImmediately()}</option
                    >
                    {#if !property.newTab}
                        <option value="onicon">{$LL.mapEditor.properties.linkProperties.triggerOnClick()}</option>
                    {/if}
                    <option value="onaction">{$LL.mapEditor.properties.linkProperties.triggerOnAction()}</option>
                </select>
            </div>
        {/if}
        <div class="value-input tw-flex tw-flex-col">
            <label for="tabLink">{$LL.mapEditor.properties.linkProperties.linkLabel()}</label>
            <input
                id="tabLink"
                type="url"
                bind:this={linkElement}
                placeholder={property.placeholder ?? $LL.mapEditor.properties.linkProperties.linkPlaceholder()}
                bind:value={property.link}
                on:keypress={onKeyPressed}
                on:change={onValueChange}
                on:blur={checkWebsiteProperty}
                on:click={onClickInputHandler}
                disabled={embeddableLoading}
            />
            {#if error !== ""}
                <span class="err tw-text-pop-red tw-text-xs tw-italic tw-mt-1">{error}</span>
            {/if}
            {#if !embeddable && error === ""}
                <span class="err tw-text-warning tw-text-xs tw-italic tw-mt-1"
                    ><AlertTriangleIcon size="12" />
                    {$LL.mapEditor.properties.linkProperties.messageNotEmbeddableLink()}.
                    <a
                        href="https://workadventu.re/map-building/troubleshooting.md#content-issues-embedding-a-website"
                        target="_blank">{$LL.mapEditor.properties.linkProperties.findOutMoreHere()}</a
                    >.</span
                >
            {/if}
        </div>
        {#if !property.hideButtonLabel}
            <div class="value-input tw-flex tw-flex-col">
                <label for="linkButton">{$LL.mapEditor.entityEditor.buttonLabel()}</label>
                <input id="linkButton" type="text" bind:value={property.buttonLabel} on:change={onValueChange} />
            </div>
        {/if}
        <div class="value-switch">
            <label for="advancedOption">{$LL.mapEditor.properties.advancedOptions()}</label>
            <input id="advancedOption" type="checkbox" class="input-switch" bind:checked={optionAdvancedActivated} />
        </div>
        <div class:active={optionAdvancedActivated} class="advanced-option tw-px-2">
            {#if triggerOnActionChoosen}
                <div class="value-input tw-flex tw-flex-col">
                    <label for="triggerMessage">{$LL.mapEditor.properties.linkProperties.triggerMessage()}</label>
                    <input
                        id="triggerMessage"
                        type="text"
                        bind:value={property.triggerMessage}
                        on:change={onValueChange}
                    />
                </div>
            {/if}
            <div class="value-switch">
                <label for="newTab">{$LL.mapEditor.properties.linkProperties.newTabLabel()}</label>
                <input
                    id="newTab"
                    type="checkbox"
                    class="input-switch"
                    bind:checked={property.newTab}
                    on:change={onNewTabValueChange}
                />
            </div>
            {#if !embeddable && !property.newTab}
                <div class="tw-mb-3">
                    <span class="err tw-text-orange tw-text-xs tw-italic"
                        ><AlertTriangleIcon size="12" />
                        {$LL.mapEditor.properties.linkProperties.warningEmbeddableLink()}.
                        <a
                            href="https://workadventu.re/map-building/troubleshooting.md#content-issues-embedding-a-website"
                            target="_blank">{$LL.mapEditor.properties.linkProperties.findOutMoreHere()}</a
                        >.</span
                    >
                </div>
            {/if}
            {#if !property.newTab}
                <div class="">
                    <label for="websiteWidth"
                        >{$LL.mapEditor.properties.linkProperties.width()}: {property.width ?? 50}%</label
                    >
                    <input
                        id="websiteWidth"
                        type="range"
                        min="0"
                        max="100"
                        placeholder="50"
                        bind:value={property.width}
                        on:change={onValueChange}
                    />
                </div>
                <div class="value-switch">
                    <label for="closable">{$LL.mapEditor.properties.linkProperties.closable()}</label>
                    <input
                        id="closable"
                        type="checkbox"
                        class="input-switch"
                        bind:checked={property.closable}
                        on:change={onValueChange}
                    />
                </div>
                <div class="value-switch">
                    <label for="allowAPI">{$LL.mapEditor.properties.linkProperties.allowAPI()}</label>
                    <input
                        id="allowAPI"
                        type="checkbox"
                        class="input-switch"
                        bind:checked={property.allowAPI}
                        on:change={onValueChange}
                    />
                </div>
                <div class="value-input tw-flex tw-flex-col">
                    <label for="policy">{$LL.mapEditor.properties.linkProperties.policy()}</label>
                    <input
                        id="policy"
                        type="text"
                        placeholder={$LL.mapEditor.properties.linkProperties.policyPlaceholder()}
                        bind:value={property.policy}
                        on:change={onValueChange}
                    />
                </div>
            {/if}
        </div>
    </span>
</PropertyEditorBase>

<style lang="scss">
    .value-input {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
    .advanced-option {
        display: none;
        &.active {
            display: block;
        }
    }
</style>
