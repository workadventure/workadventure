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
        ExcalidrawService,
        ExcalidrawException,
    } from "@workadventure/shared-utils";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import youtubeSvg from "../../images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../images/applications/icon_klaxoon.svg";
    import googleDocsSvg from "../../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../images/applications/icon_google_slides.svg";
    import eraserSvg from "../../images/applications/icon_eraser.svg";
    import excalidrawSvg from "../../images/applications/icon_excalidraw.svg";
    import pickerSvg from "../../images/applications/picker.svg";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import { GOOGLE_DRIVE_PICKER_APP_ID, GOOGLE_DRIVE_PICKER_CLIENT_ID } from "../../../Enum/EnvironmentVariable";
    import Tooltip from "../../Util/Tooltip.svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import { InputTagOption } from "../../Input/InputTagOption";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: OpenWebsitePropertyData;
    export let triggerOnActionChoosen: boolean = property.trigger === "onaction";
    export let triggerOptionActivated = true;
    export let icon = "resources/icons/icon_link.png";
    export let isArea = false;

    type Option = {
        value: string;
        label: string;
        created: boolean | undefined;
    };

    let optionAdvancedActivated = shouldDisplayAdvancedOption();
    let embeddable = true;
    let embeddableLoading = false;
    let error = "";
    let warning = "";
    let oldNewTabValue = property.newTab;
    let linkElement: HTMLInputElement;
    let policy: Option[] | undefined = undefined;
    let policyOption: InputTagOption[] = [
        { value: "accelerometer", label: "accelerometer", created: undefined },
        { value: "ambient-light-sensor", label: "ambient-light-sensor", created: undefined },
        { value: "autoplay", label: "autoplay", created: undefined },
        { value: "battery", label: "battery", created: undefined },
        { value: "browsing-topics", label: "browsing-topics", created: undefined },
        { value: "camera", label: "camera", created: undefined },
        { value: "document-domain", label: "document-domain", created: undefined },
        { value: "encrypted-media", label: "encrypted-media", created: undefined },
        { value: "execution-while-not-rendered", label: "execution-while-not-rendered", created: undefined },
        { value: "execution-while-out-of-viewport", label: "execution-while-out-of-viewport", created: undefined },
        { value: "fullscreen", label: "fullscreen", created: undefined },
        { value: "gamepad", label: "gamepad", created: undefined },
        { value: "geolocation", label: "geolocation", created: undefined },
        { value: "gyroscope", label: "gyroscope", created: undefined },
        { value: "hid", label: "hid", created: undefined },
        { value: "identity-credentials-get", label: "identity-credentials-get", created: undefined },
        { value: "idle-detection", label: "idle-detection", created: undefined },
        { value: "local-fonts ", label: "local-fonts", created: undefined },
        { value: "magnetometer", label: "magnetometer", created: undefined },
        { value: "microphone", label: "microphone", created: undefined },
        { value: "midi", label: "midi", created: undefined },
        { value: "otp-credentials", label: "otp-credentials", created: undefined },
        { value: "payment", label: "payment", created: undefined },
        { value: "picture-in-picture", label: "picture-in-picture", created: undefined },
        { value: "publickey-credentials-get", label: "publickey-credentials-get", created: undefined },
        { value: "screen-wake-lock", label: "screen-wake-lock", created: undefined },
        { value: "serial", label: "serial", created: undefined },
        { value: "speaker-selection", label: "speaker-selection", created: undefined },
        { value: "storage-access", label: "storage-access", created: undefined },
        { value: "usb", label: "usb", created: undefined },
        { value: "web-share", label: "web-share", created: undefined },
        { value: "window-management", label: "window-management", created: undefined },
        { value: "xr-spatial-tracking", label: "xr-spatial-tracking", created: undefined },
    ];

    const dispatch = createEventDispatcher();

    function shouldDisplayAdvancedOption(): boolean {
        return !!(property.policy || property.allowAPI || !property.closable || property.width || property.newTab);
    }

    onMount(() => {
        // if the link is not set, try to open the picker
        if (property.link == undefined || property.link === "") {
            openPicker();
        }

        // check if the link is embeddable
        checkWebsiteProperty().catch((e) => {
            console.error("Error checking embeddable website", e);
        });

        // Format policy for input tag policy
        policy = property.policy
            ?.split(";")
            .reduce(
                (options: Option[], value) =>
                    value != ""
                        ? [...options, { value: value.trim(), label: value.trim(), created: undefined }]
                        : options,
                []
            ) as Option[];

        if (property.forceNewTab == true) {
            property.newTab = true;
        }
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
                        connectionManager.klaxoonToolClientId
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
        warning = "";
        try {
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
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            if (property.application == "googleDocs") {
                try {
                    const link = GoogleWorkSpaceService.getGoogleDocsEmbedUrl(new URL(property.link));
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
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            if (property.application == "googleSheets") {
                try {
                    const link = GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(new URL(property.link));
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
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            if (property.application == "googleSlides") {
                try {
                    const link = GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(new URL(property.link));
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
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            if (property.application == "klaxoon") {
                try {
                    const link = KlaxoonService.getKlaxoonEmbedUrl(
                        new URL(property.link),
                        connectionManager.klaxoonToolClientId
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
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            if (property.application == "eraser") {
                try {
                    EraserService.validateLink(new URL(property.link));
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
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            if (property.application == "excalidraw") {
                try {
                    ExcalidrawService.validateLink(new URL(property.link), connectionManager.excalidrawToolDomains);
                    embeddable = true;
                    optionAdvancedActivated = false;
                    property.newTab = oldNewTabValue;
                } catch (e) {
                    embeddable = false;
                    error =
                        e instanceof ExcalidrawException.ExcalidrawException
                            ? $LL.mapEditor.properties.excalidrawProperties.error()
                            : $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
                    console.info("Error to check embeddable website", e);
                    property.link = null;
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            if (property.regexUrl) {
                try {
                    const regexUrl = new URL(property.regexUrl);
                    const regex = new RegExp(property.regexUrl.replace("?", "[?]"), "g");
                    if (property.link.indexOf(regexUrl.host) != -1) {
                        // if property has "targetEmbedableLink" transform the link to embedable link with regex
                        if (property.targetEmbedableUrl) {
                            const matches = regex.exec(property.link);
                            if (matches) {
                                property.link = property.targetEmbedableUrl.replace(/\$[0-9]+/g, (match) => {
                                    const index = parseInt(match.substring(1));
                                    return matches[index] ?? "";
                                });
                            }
                        }
                    } else if (property.targetEmbedableUrl) {
                        const url = new URL(property.link);
                        if (property.targetEmbedableUrl?.indexOf(url.host) == -1) {
                            // If the link exists but is not the same of embedable link target, their is an error
                            error = `${$LL.mapEditor.properties.linkProperties.errorEmbeddableLink()} (${
                                property.regexUrl
                            })`;
                            property.link = null;
                            throw new Error(error);
                        }
                    } else {
                        throw new Error(error);
                    }
                    if (property.forceNewTab == true) {
                        embeddable = false;
                        optionAdvancedActivated = false;
                        property.newTab = true;
                    } else {
                        embeddable = true;
                    }
                } catch (e) {
                    console.info("Error to check embeddable website", e);
                    embeddable = false;
                    error = error ?? $LL.mapEditor.properties.linkProperties.errorInvalidUrl();
                    property.link = null;
                    throw e;
                } finally {
                    embeddableLoading = false;
                    onValueChange();
                }
            }

            // allow to check if the link is embeddable
            checkEmbeddableLink();
        } catch (e) {
            console.info("Error checking embeddable website", e);
        }
    }

    function checkEmbeddableLink(): void {
        if (property.forceNewTab) return;
        if (property.link == undefined || !linkElement.checkValidity()) {
            embeddableLoading = false;
            warning = warning ? warning : $LL.mapEditor.properties.linkProperties.errorInvalidUrl();
            return;
        }

        gameManager
            .getCurrentGameScene()
            .connection?.queryEmbeddableWebsite(property.link)
            .then((answer) => {
                if (answer) {
                    if (answer.message) {
                        warning = answer.message;
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
                    warning = e.message;
                } else {
                    warning = $LL.mapEditor.properties.linkProperties.errorEmbeddableLink();
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
            !connectionManager.klaxoonToolClientId ||
            property.type !== "openWebsite" ||
            property.application !== "klaxoon"
        ) {
            console.info("openKlaxoonActivityPicker: app is not a klaxoon app");
            return;
        }
        KlaxoonService.openKlaxoonActivityPicker(connectionManager.klaxoonToolClientId, (payload: KlaxoonEvent) => {
            property.link = KlaxoonService.getKlaxoonEmbedUrl(
                new URL(payload.url),
                connectionManager.klaxoonToolClientId
            );
            property.poster = payload.imageUrl ?? undefined;
            property.buttonLabel = payload.title ?? undefined;
            // check if the link is embeddable
            checkWebsiteProperty().catch((e) => {
                console.error("Error checking embeddable website", e);
            });
        });
    }

    function openPicker() {
        // if klaxoon, open Activity Picker
        if (property.application === "klaxoon" && (property.link == undefined || property.link === "")) {
            openKlaxoonActivityPicker();
        }

        // create function to handle link seclected
        const handlerLinkSelected = (link: string): void => {
            property.link = link;
            checkWebsiteProperty().catch((e) => {
                console.error("Error checking embeddable website", e);
            });
        };

        // create function to handle error
        const handlerLinkError = (error: string): void => {
            console.error("Error Google Picker", error);
        };

        // if google, open Google Picker
        if (GOOGLE_DRIVE_PICKER_CLIENT_ID && GOOGLE_DRIVE_PICKER_APP_ID) {
            // property application is "googleDocs", open picker with google docs view id
            if (property.application == "googleDocs") {
                GoogleWorkSpaceService.initGooglePicker(
                    GOOGLE_DRIVE_PICKER_CLIENT_ID,
                    GOOGLE_DRIVE_PICKER_APP_ID,
                    window.google.picker.ViewId.DOCUMENTS
                )
                    .then(handlerLinkSelected)
                    .catch(handlerLinkError);
            }

            // property application is "googleSheets", open picker with google sheets view id
            if (property.application == "googleSheets") {
                GoogleWorkSpaceService.initGooglePicker(
                    GOOGLE_DRIVE_PICKER_CLIENT_ID,
                    GOOGLE_DRIVE_PICKER_APP_ID,
                    window.google.picker.ViewId.SPREADSHEETS
                )
                    .then(handlerLinkSelected)
                    .catch(handlerLinkError);
            }

            // property application is "googleSlides", open picker with google slides view id
            if (property.application == "googleSlides") {
                GoogleWorkSpaceService.initGooglePicker(
                    GOOGLE_DRIVE_PICKER_CLIENT_ID,
                    GOOGLE_DRIVE_PICKER_APP_ID,
                    window.google.picker.ViewId.PRESENTATIONS
                )
                    .then(handlerLinkSelected)
                    .catch(handlerLinkError);
            }

            // property application is "googleDrive", open picker with google drive view id
            if (property.application == "googleDrive") {
                GoogleWorkSpaceService.initGooglePicker(
                    GOOGLE_DRIVE_PICKER_CLIENT_ID,
                    GOOGLE_DRIVE_PICKER_APP_ID,
                    window.google.picker.ViewId.DOCS
                )
                    .then(handlerLinkSelected)
                    .catch(handlerLinkError);
            }
        }
    }

    function handlePolicyChange() {
        if (policy == undefined) {
            policy = [];
        }
        property.policy = policy?.reduce((policyStr, policy) => `${policyStr}${policy.value};`, "");
        onValueChange();
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
        {:else if property.application === "excalidraw"}
            <img
                class="tw-w-6 tw-mr-1"
                src={excalidrawSvg}
                alt={$LL.mapEditor.properties.eraserProperties.description()}
            />
            {$LL.mapEditor.properties.eraserProperties.label()}
        {:else if property.application === "website"}
            <img class="tw-w-6 tw-mr-1" src={icon} alt={$LL.mapEditor.properties.linkProperties.description()} />
            {$LL.mapEditor.properties.linkProperties.label()}
        {:else}
            <img class="tw-w-6 tw-mr-1" src={property.icon} alt={property.label} />
            {property.label}
        {/if}
    </span>
    <span slot="content">
        {#if property.poster}
            <div class="tw-text-center">
                <img class="tw-w-20 tw-mr-1" src={property.poster} alt="" />
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
            <div class="tw-flex tw-flex-row">
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
                {#if property.application === "googleDocs" || property.application === "googleSheets" || property.application === "googleSlides" || property.application === "klaxoon" || property.application === "googleDrive"}
                    <div class="tw-flex tw-flex-row tw-items-center tw-justify-center">
                        <img
                            class="tw-w-6 tw-ml-4 tw-items-center tw-cursor-pointer"
                            src={pickerSvg}
                            alt={$LL.mapEditor.properties.linkProperties.openPickerSelector()}
                            on:keydown
                            on:keyup
                            on:keypress
                            on:click|preventDefault|stopPropagation={openPicker}
                        />
                        <Tooltip
                            text={$LL.mapEditor.properties.linkProperties.openPickerSelector()}
                            leftPosition="true"
                        />
                    </div>
                {/if}
            </div>
            {#if error !== ""}
                <span class="err tw-text-danger-900 tw-text-xs tw-italic tw-mt-1">{error}</span>
            {/if}
            {#if warning !== ""}
                <span class="err tw-text-warning-900 tw-text-xs tw-italic tw-mt-1">{warning}</span>
            {/if}
            {#if !embeddable && error === ""}
                <span class="err tw-text-warning-900 tw-text-xs tw-italic tw-mt-1"
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
            {#if triggerOptionActivated}
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
                        disabled={property.forceNewTab}
                    />
                </div>
            {/if}
            {#if property.forceNewTab == true}
                <div class="tw-mb-3">
                    <span class="err tw-text-warning-900 tw-text-xs tw-italic">
                        <AlertTriangleIcon size="12" />
                        {$LL.mapEditor.properties.linkProperties.forcedInNewTab()}
                    </span>
                </div>
            {/if}
            {#if !embeddable && !property.newTab}
                <div class="tw-mb-3">
                    <span class="err tw-text-warning-900 tw-text-xs tw-italic"
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
                        min="1"
                        max="75"
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
                {#if policy != undefined}
                    <div class="value-input tw-flex tw-flex-col">
                        <InputTags
                            label={$LL.mapEditor.properties.linkProperties.policy()}
                            options={policyOption}
                            bind:value={policy}
                            handleChange={handlePolicyChange}
                        />
                    </div>
                {/if}
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
