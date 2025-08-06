<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { OpenWebsitePropertyData } from "@workadventure/map-editor";
    import {
        CardsException,
        CardsService,
        EraserException,
        EraserService,
        ExcalidrawException,
        ExcalidrawService,
        GoogleWorkSpaceException,
        GoogleWorkSpaceService,
        KlaxoonEvent,
        KlaxoonException,
        KlaxoonService,
        YoutubeService,
    } from "@workadventure/shared-utils";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import youtubeSvg from "../../images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../images/applications/icon_klaxoon.svg";
    import googleDocsSvg from "../../images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../images/applications/icon_google_slides.svg";
    import googleDriveSvg from "../../images/applications/icon_google_drive.svg";
    import eraserSvg from "../../images/applications/icon_eraser.svg";
    import excalidrawSvg from "../../images/applications/icon_excalidraw.svg";
    import cardPng from "../../images/applications/icon_cards.svg";
    import pickerSvg from "../../images/applications/picker.svg";
    import { connectionManager } from "../../../Connection/ConnectionManager";
    import { GOOGLE_DRIVE_PICKER_APP_ID, GOOGLE_DRIVE_PICKER_CLIENT_ID } from "../../../Enum/EnvironmentVariable";
    import Tooltip from "../../Util/Tooltip.svelte";
    import InputTags from "../../Input/InputTags.svelte";
    import { InputTagOption } from "../../Input/InputTagOption";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import Input from "../../Input/Input.svelte";
    import Select from "../../Input/Select.svelte";
    import RangeSlider from "../../Input/RangeSlider.svelte";
    import InputCheckbox from "../../Input/InputCheckbox.svelte";
    import {
        ON_ACTION_TRIGGER_BUTTON,
        ON_ACTION_TRIGGER_ENTER,
        ON_ICON_TRIGGER_BUTTON,
    } from "../../../WebRtc/LayoutManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";
    import { IconAlertTriangle } from "@wa-icons";

    export let property: OpenWebsitePropertyData;
    export let triggerOnActionChoosen: boolean = property.trigger === ON_ACTION_TRIGGER_BUTTON;
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
    let isLinkValid = true;
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

    const dispatch = createEventDispatcher<{
        change: string | null | undefined;
        close: undefined;
    }>();

    function shouldDisplayAdvancedOption(): boolean {
        return !!(property.policy || property.allowAPI || !property.closable || property.width || property.newTab);
    }

    // The parameter that determines if the link has already been checked, like if it's embeddable or not.
    // If the link cannot be embedded, we suggest that the user open a new tab automatically.
    let firstCheckLink = false;

    onMount(() => {
        // if the link is not set, try to open the picker
        if (property.link == undefined || property.link === "") {
            firstCheckLink = true; // It will use to set new tab automatically if the link is not embeddable
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
        triggerOnActionChoosen = property.trigger === ON_ACTION_TRIGGER_BUTTON;
        dispatch("change");
    }

    function onNewTabValueChange() {
        if (property.newTab) {
            if (property.trigger === ON_ICON_TRIGGER_BUTTON) {
                property.trigger = ON_ACTION_TRIGGER_ENTER;
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
                } else if (property.application == "cards") {
                    property.link = CardsService.getCardsLink(new URL(property.link), localUserStore.getAuthToken());
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
                } else if (property.application == "cards") {
                    property.link = CardsService.getCardsLink(new URL(property.link), localUserStore.getAuthToken());
                }
            }
        }
        dispatch("change");
    }

    function onValueChange() {
        dispatch("change", property.link);
    }

    async function checkWebsiteProperty(protocolChecked = false): Promise<void> {
        if (property.link == undefined || property.link == "") return;
        // if the link is not a website, we don't need to check if it is embeddable
        embeddableLoading = true;
        error = "";
        warning = "";
        console.info("checkWebsiteProperty", property.application, property.link);
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

            if (property.application == "cards") {
                try {
                    CardsService.validateLink(new URL(property.link));
                    embeddable = true;
                    optionAdvancedActivated = false;
                    property.newTab = oldNewTabValue;
                } catch (e) {
                    embeddable = false;
                    error =
                        e instanceof CardsException.CardsLinkException
                            ? $LL.mapEditor.properties.cardsProperties.error()
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

            if (property.application == "website") {
                if (!protocolChecked) {
                    // if the link is not a website, we don't need to check if it is embeddable

                    if (
                        property.link != undefined &&
                        property.link != "" &&
                        !property.link.startsWith("http://") &&
                        !property.link.startsWith("https://")
                    ) {
                        property.link = "https://" + property.link;
                        embeddableLoading = false;
                        warning = "";
                        onValueChange();
                        setTimeout(() => {
                            checkWebsiteProperty(true).catch((e) => {
                                console.error("Error checking embeddable website", e);
                            });
                        }, 10);
                        return;
                    }
                }
            }

            // allow to check if the link is embeddable
            checkEmbeddableLink();
        } catch (e) {
            console.info("Error checking embeddable website", e);
            embeddableLoading = false;
        }
    }

    function checkEmbeddableLink(): void {
        if (property.forceNewTab) return;
        if (property.link == undefined || !isLinkValid) {
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
                        if (firstCheckLink) property.newTab = true;
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

    function openKlaxoonActivityPicker() {
        if (
            !connectionManager.klaxoonToolClientId ||
            property.type !== "openWebsite" ||
            property.application !== "klaxoon"
        ) {
            console.info("openKlaxoonActivityPicker: app is not a klaxoon app");
            return;
        }
        windowKlaxoonActivityPicker = KlaxoonService.openKlaxoonActivityPicker(
            connectionManager.klaxoonToolClientId,
            (payload: KlaxoonEvent) => {
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
            }
        );
    }

    function openPicker() {
        closePicker();
        // if klaxoon, open Activity Picker
        if (property.application === "klaxoon") {
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

            analyticsClient.openPicker(property.application);
        }
    }

    let windowKlaxoonActivityPicker: Window | null = null;
    function closePicker() {
        if (windowKlaxoonActivityPicker != undefined) windowKlaxoonActivityPicker.close();
    }

    function openApplicationWithoutPicker() {
        if (property.application === "cards") {
            window.open("https://app.cards-microlearning.com/", "_blank");
        }
        if (property.application === "eraser") {
            window.open("https://app.eraser.io/dashboard/all", "_blank");
        }
        if (property.application === "excalidraw") {
            window.open("https://excalidraw.com/", "_blank");
        }

        analyticsClient.openApplicationWithoutPicker(property.application);
    }

    function handlePolicyChange() {
        if (policy == undefined) {
            policy = [];
        }
        property.policy = policy?.reduce((policyStr, policy) => `${policyStr}${policy.value};`, "");
        onValueChange();
    }

    onDestroy(() => {
        closePicker();
    });
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
    on:keypress={onKeyPressed}
>
    <span slot="header" class="flex justify-center items-center">
        {#if property.application === "youtube"}
            <img class="w-6 me-1" src={youtubeSvg} alt={$LL.mapEditor.properties.youtubeProperties.description()} />
            {$LL.mapEditor.properties.youtubeProperties.label()}
        {:else if property.application === "klaxoon"}
            <img class="w-6 me-1" src={klaxoonSvg} alt={$LL.mapEditor.properties.klaxoonProperties.description()} />
            {$LL.mapEditor.properties.klaxoonProperties.label()}
        {:else if property.application === "googleDocs"}
            <img
                class="w-6 me-1"
                src={googleDocsSvg}
                alt={$LL.mapEditor.properties.googleDocsProperties.description()}
            />
            {$LL.mapEditor.properties.googleDocsProperties.label()}
        {:else if property.application === "googleSheets"}
            <img
                class="w-6 me-1"
                src={googleSheetsSvg}
                alt={$LL.mapEditor.properties.googleSheetsProperties.description()}
            />
            {$LL.mapEditor.properties.googleSheetsProperties.label()}
        {:else if property.application === "googleSlides"}
            <img
                class="w-6 me-1"
                src={googleSlidesSvg}
                alt={$LL.mapEditor.properties.googleSlidesProperties.description()}
            />
            {$LL.mapEditor.properties.googleSlidesProperties.label()}
        {:else if property.application === "googleDrive"}
            <img
                class="w-6 me-1"
                src={googleDriveSvg}
                alt={$LL.mapEditor.properties.googleDriveProperties.description()}
            />
            {$LL.mapEditor.properties.googleDriveProperties.label()}
        {:else if property.application === "eraser"}
            <img class="w-6 me-1" src={eraserSvg} alt={$LL.mapEditor.properties.eraserProperties.description()} />
            {$LL.mapEditor.properties.eraserProperties.label()}
        {:else if property.application === "excalidraw"}
            <img
                class="w-6 me-1"
                src={excalidrawSvg}
                alt={$LL.mapEditor.properties.excalidrawProperties.description()}
            />
            {$LL.mapEditor.properties.excalidrawProperties.label()}
        {:else if property.application === "cards"}
            <img class="w-6 me-1" src={cardPng} alt={$LL.mapEditor.properties.cardsProperties.description()} />
            {$LL.mapEditor.properties.cardsProperties.label()}
        {:else if property.application === "website"}
            <img class="w-6 me-1" src={icon} alt={$LL.mapEditor.properties.linkProperties.description()} />
            {$LL.mapEditor.properties.linkProperties.label()}
        {:else}
            <img class="w-6 me-1" src={property.icon} alt={property.label} />
            {property.label}
        {/if}
    </span>
    <span slot="content">
        {#if property.poster}
            <div class="text-center">
                <img class="w-20 me-1" src={property.poster} alt="" />
            </div>
        {/if}

        {#if isArea}
            <Select
                id="trigger"
                label={$LL.mapEditor.properties.linkProperties.trigger()}
                bind:value={property.trigger}
                onChange={onTriggerValueChange}
            >
                <option value={ON_ACTION_TRIGGER_ENTER}
                    >{$LL.mapEditor.properties.linkProperties.triggerShowImmediately()}</option
                >
                {#if !property.newTab}
                    <option value={ON_ICON_TRIGGER_BUTTON}
                        >{$LL.mapEditor.properties.linkProperties.triggerOnClick()}</option
                    >
                {/if}
                <option value={ON_ACTION_TRIGGER_BUTTON}
                    >{$LL.mapEditor.properties.linkProperties.triggerOnAction()}</option
                >
            </Select>
        {/if}

        <div class="flex flex-col">
            <label for="tabLink" class="px-3 pb-[0.375rem] grow font-light"
                >{$LL.mapEditor.properties.linkProperties.linkLabel()}</label
            >
            <div class="flex flex-row">
                <Input
                    id="tabLink"
                    type="url"
                    placeholder={property.placeholder ?? $LL.mapEditor.properties.linkProperties.linkPlaceholder()}
                    onKeyPress={onKeyPressed}
                    bind:value={property.link}
                    onChange={onValueChange}
                    onBlur={() => checkWebsiteProperty()}
                    disabled={embeddableLoading}
                />

                {#if property.application === "googleDocs" || property.application === "googleSheets" || property.application === "googleSlides" || property.application === "klaxoon" || property.application === "googleDrive"}
                    <div class="flex flex-row items-center justify-center">
                        <img
                            class="w-6 ms-4 items-center cursor-pointer"
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
                {:else if property.application === "cards" || property.application === "eraser" || property.application === "excalidraw"}
                    <div class="flex flex-row items-center justify-center">
                        <img
                            class="w-6 ms-4 items-center cursor-pointer"
                            src={pickerSvg}
                            alt={`${$LL.mapEditor.properties.linkProperties.openApplication()} ${property.application}`}
                            on:keydown
                            on:keyup
                            on:keypress
                            on:click|preventDefault|stopPropagation={openApplicationWithoutPicker}
                        />
                        <Tooltip
                            text={`${$LL.mapEditor.properties.linkProperties.openApplication()} ${
                                property.application
                            }`}
                            leftPosition="true"
                        />
                    </div>
                {/if}
            </div>
            {#if error !== ""}
                <span class="err text-danger-900 text-xs italic mt-1">{error}</span>
            {/if}
            {#if warning !== ""}
                <span class="err text-warning-900 text-xs italic mt-1">{warning}</span>
            {/if}
            {#if !embeddable && property.newTab == false && error === ""}
                <span class="err text-warning-900 text-xs italic mt-1"
                    ><IconAlertTriangle font-size="12" />
                    {$LL.mapEditor.properties.linkProperties.messageNotEmbeddableLink()}.
                    <a
                        href="https://workadventu.re/map-building/troubleshooting.md#content-issues-embedding-a-website"
                        target="_blank">{$LL.mapEditor.properties.linkProperties.findOutMoreHere()}</a
                    >.</span
                >
            {/if}
        </div>
        {#if !property.hideButtonLabel}
            <div class=" flex flex-col">
                <Input
                    label={$LL.mapEditor.entityEditor.buttonLabel()}
                    id="linkButton"
                    type="text"
                    bind:value={property.buttonLabel}
                    onChange={onValueChange}
                />
            </div>
        {/if}

        <InputSwitch
            id="advancedOption"
            label={$LL.mapEditor.properties.advancedOptions()}
            bind:value={optionAdvancedActivated}
        />

        <div class:active={optionAdvancedActivated} class="advanced-option">
            {#if (isArea && triggerOptionActivated && triggerOnActionChoosen) || !isArea}
                <Input
                    id="triggerMessage"
                    type="text"
                    placeholder={$LL.trigger.object()}
                    label={$LL.mapEditor.properties.linkProperties.triggerMessage()}
                    bind:value={property.triggerMessage}
                    onChange={onValueChange}
                />
            {/if}

            <InputSwitch
                id="newTab"
                label={$LL.mapEditor.properties.linkProperties.newTabLabel()}
                bind:value={property.newTab}
                onChange={() => {
                    // The "newTab" property won't be changed automatically by the service.
                    firstCheckLink = false;
                    oldNewTabValue = property.newTab;
                    onNewTabValueChange();
                }}
                disabled={property.forceNewTab}
            />

            {#if property.forceNewTab == true}
                <div class="mb-3 ">
                    <span class="err text-warning-900 text-xs italic">
                        <IconAlertTriangle font-size="12" />
                        {$LL.mapEditor.properties.linkProperties.forcedInNewTab()}
                    </span>
                </div>
            {/if}
            {#if !embeddable && !property.newTab}
                <div class="mb-3">
                    <span class="err text-warning-900 text-xs italic"
                        ><IconAlertTriangle font-size="12" />
                        {$LL.mapEditor.properties.linkProperties.warningEmbeddableLink()}.
                        <a
                            href="https://workadventu.re/map-building/troubleshooting.md#content-issues-embedding-a-website"
                            target="_blank">{$LL.mapEditor.properties.linkProperties.findOutMoreHere()}</a
                        >.</span
                    >àà
                </div>
            {/if}
            {#if !property.newTab}
                <div class="mt-3 mb-3">
                    <RangeSlider
                        id="websiteWidth"
                        min={15}
                        label={$LL.mapEditor.properties.linkProperties.width()}
                        max={85}
                        bind:value={property.width}
                        onChange={onValueChange}
                        variant="secondary"
                        buttonShape="square"
                    />
                </div>

                <InputCheckbox
                    id="closable"
                    label={$LL.mapEditor.properties.linkProperties.closable()}
                    bind:value={property.closable}
                    onChange={onValueChange}
                />

                <InputCheckbox
                    id="allowAPI"
                    label={$LL.mapEditor.properties.linkProperties.allowAPI()}
                    bind:value={property.allowAPI}
                    onChange={onValueChange}
                />

                {#if policy != undefined}
                    <div class="value-input flex flex-col">
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
    .advanced-option {
        display: none;

        &.active {
            display: block;
        }
    }
</style>
