<script context="module" lang="ts">
    // Create interface for the property
    export interface ApplicationProperty {
        name: string;
        img: string;
        title: string;
        description: string;
        link: string;
        placeholder: string;
        regexUrl: string | undefined;
        targetEmbedableUrl: string | undefined;
    }
</script>

<script lang="ts">
    import { onDestroy } from "svelte";
    import { writable } from "svelte/store";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { getChatEmojiPicker } from "../../EmojiPicker";
    import LL from "../../../../i18n/i18n-svelte";
    import { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { connectionManager, defautlNativeIntegrationAppName } from "../../../Connection/ConnectionManager";

    import youtubeSvg from "../../../Components/images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../../Components/images/applications/icon_klaxoon.svg";
    import googleDriveSvg from "../../../Components/images/applications/icon_google_drive.svg";
    import googleDocsSvg from "../../../Components/images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../../Components/images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../../Components/images/applications/icon_google_slides.svg";
    import eraserSvg from "../../../Components/images/applications/icon_eraser.svg";
    import excalidrawSvg from "../../../Components/images/applications/icon_excalidraw.svg";
    import cardsPng from "../../../Components/images/applications/icon_cards.svg";
    import MessageInput from "./MessageInput.svelte";
    import MessageFileInput from "./Message/MessageFileInput.svelte";
    import ApplicationFormWraper from "./Application/ApplicationFormWraper.svelte";
    import { IconCircleX, IconMoodSmile, IconSend, IconSquarePlus } from "@wa-icons";

    export let room: ChatRoom;

    let message = "";
    let messageInput: HTMLDivElement;
    let emojiButtonRef: HTMLButtonElement;
    let stopTypingTimeOutID: undefined | ReturnType<typeof setTimeout>;
    let files: { id: string; file: File }[] = [];
    let filesPreview: { id: string; size: number; name: string; type: string; url: FileReader["result"] }[] = [];
    const TYPINT_TIMEOUT = 10000;

    let applicationComponentOpened = false;
    const applicationProperty = writable<ApplicationProperty | undefined>(undefined);

    const selectedChatChatMessageToReplyUnsubscriber = selectedChatMessageToReply.subscribe((chatMessage) => {
        if (chatMessage !== null) {
            messageInput.focus();
        }
    });

    function sendMessageOrEscapeLine(keyDownEvent: KeyboardEvent) {
        if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
        room.startTyping()
            .then(() => {
                stopTypingTimeOutID = setTimeout(() => {
                    room.stopTyping().catch((error) => console.error(error));
                    stopTypingTimeOutID = undefined;
                }, TYPINT_TIMEOUT);
            })
            .catch((error) => console.error(error));

        if (keyDownEvent.key === "Enter" || message == "" || message == undefined) {
            if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
            room.stopTyping().catch((error) => console.error(error));
        }

        if (keyDownEvent.key === "Enter" && keyDownEvent.shiftKey) {
            return;
        }
        if (keyDownEvent.key === "Enter" && !keyDownEvent.shiftKey) {
            keyDownEvent.preventDefault();
        }

        if (keyDownEvent.key === "Enter" && message.trim().length !== 0) {
            // message contains HTML tags. Actually, the only tags we allow are for the new line, ie. <br> tags.
            // We can turn those back into carriage returns.
            const messageToSend = message.replace(/<br>/g, "\n");
            sendMessage(messageToSend);
        }
        if (keyDownEvent.key === "Enter" && files && files.length > 0) {
            if (files && !(room instanceof ProximityChatRoom)) {
                const fileList: FileList = files.reduce((fileListAcc, currentFile) => {
                    fileListAcc.items.add(currentFile.file);
                    return fileListAcc;
                }, new DataTransfer()).files;

                room.sendFiles(fileList).catch((error) => console.error(error));
                files = [];
                filesPreview = [];
            }
            return;
        }
    }

    function sendMessage(messageToSend: string) {
        if ($applicationProperty != undefined && $applicationProperty.link.length !== 0) {
            room?.sendMessage($applicationProperty.link);
        }
        // close application part
        applicationProperty.set(undefined);
        applicationComponentOpened = false;

        // send message
        if (messageToSend.trim().length !== 0) {
            room?.sendMessage(messageToSend);
            messageInput.innerText = "";
            message = "";
            if (stopTypingTimeOutID) {
                clearTimeout(stopTypingTimeOutID);
            }
        }
    }

    function unselectChatMessageToReply() {
        selectedChatMessageToReply.set(null);
    }

    function onInputHandler() {
        if (message == "" || message == undefined) {
            if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
            room.stopTyping().catch((error) => console.error(error));
        }
    }

    onDestroy(() => {
        selectedChatChatMessageToReplyUnsubscriber();
        if (setTimeOutProperty) clearTimeout(setTimeOutProperty);
    });

    const emojiPicker = getChatEmojiPicker({ right: "0" });
    emojiPicker.on("emoji", ({ emoji }) => {
        message += emoji;
    });

    function openCloseEmojiPicker() {
        emojiPicker.isPickerVisible() ? emojiPicker.hidePicker() : emojiPicker.showPicker(emojiButtonRef);
    }

    export function handleFiles(event: CustomEvent<FileList>) {
        const newFiles = [...event.detail].map((file) => ({ id: window.crypto.randomUUID(), file }));
        files = [...files, ...newFiles];
        addToPreviews(newFiles);
    }

    function addToPreviews(files: { id: string; file: File }[]) {
        Array.from(files).forEach((file) => {
            const reader = new FileReader();

            reader.onload = () => {
                filesPreview = [
                    ...filesPreview,
                    {
                        id: file.id,
                        name: file.file.name,
                        type: file.file.type,
                        size: file.file.size,
                        url: reader.result,
                    },
                ];
            };
            reader.readAsDataURL(file.file);
        });
    }

    function deleteFile(id: string) {
        files = files.filter((file) => file.id !== id);
        filesPreview = filesPreview.filter((filePreview) => filePreview.id !== id);
    }

    function formatBytes(bytes: number) {
        if (bytes === 0) return "0 Bytes";
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
    }

    function focusin(event: FocusEvent) {
        event.stopImmediatePropagation();
        event.preventDefault();
        chatInputFocusStore.set(true);
    }
    function focusout(event: FocusEvent) {
        event.stopImmediatePropagation();
        event.preventDefault();
        chatInputFocusStore.set(false);
    }

    // This function open the application part to propose to the user to add a new application or close application part
    function toggleApplicationComponent() {
        applicationComponentOpened = !applicationComponentOpened;
        applicationProperty.set(undefined);
    }
    // This function open form to send a link to the user
    let setTimeOutProperty: ReturnType<typeof setTimeout>;
    function openLinkForm(appName: string) {
        applicationProperty.set(undefined);
        // Use setTimeout to force the component to be updated
        if (setTimeOutProperty) clearTimeout(setTimeOutProperty);
        setTimeOutProperty = setTimeout(() => {
            applicationProperty.set(getPropertyFromType(appName));
        }, 100);
    }

    function getPropertyFromType(subtype: string) {
        let placeholder: string;
        let title: string;
        let description: string;
        let img: string;
        let name: string;
        let regexUrl: string | undefined;
        let targetEmbedableUrl: string | undefined;
        switch (subtype) {
            case "youtube": {
                name = defautlNativeIntegrationAppName.YOUTUBE;
                placeholder = "https://www.youtube.com/watch?v=Y9ubBWf5w20";
                title = $LL.chat.form.application.youtube.title();
                description = $LL.chat.form.application.youtube.description();
                img = youtubeSvg;
                break;
            }
            case "klaxoon": {
                name = defautlNativeIntegrationAppName.KLAXOON;
                placeholder = "https://app.klaxoon.com/";
                title = $LL.chat.form.application.klaxoon.title();
                description = $LL.chat.form.application.klaxoon.description();
                img = klaxoonSvg;
                break;
            }
            case "googleDrive": {
                name = defautlNativeIntegrationAppName.GOOGLE_DRIVE;
                placeholder = "https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview";
                title = $LL.chat.form.application.googleDrive.title();
                description = $LL.chat.form.application.googleDrive.description();
                img = googleDriveSvg;
                break;
            }
            case "googleDocs": {
                name = defautlNativeIntegrationAppName.GOOGLE_DOCS;
                placeholder = "https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit";
                title = $LL.chat.form.application.googleDocs.title();
                description = $LL.chat.form.application.googleDocs.description();
                img = googleDocsSvg;
                break;
            }
            case "googleSheets": {
                name = defautlNativeIntegrationAppName.GOOGLE_SHEETS;
                placeholder =
                    "https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit";
                title = $LL.chat.form.application.googleSheets.title();
                description = $LL.chat.form.application.googleSheets.description();
                img = googleSheetsSvg;
                break;
            }
            case "googleSlides": {
                name = defautlNativeIntegrationAppName.GOOGLE_SLIDES;
                placeholder =
                    "https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit";
                title = $LL.chat.form.application.googleSlides.title();
                description = $LL.chat.form.application.googleSlides.description();
                img = googleSlidesSvg;
                break;
            }
            case "eraser": {
                name = defautlNativeIntegrationAppName.ERASER;
                placeholder = "https://app.eraser.io/workspace/ExSd8Z4wPsaqMMgTN4VU";
                title = $LL.chat.form.application.eraser.title();
                description = $LL.chat.form.application.eraser.description();
                img = eraserSvg;
                break;
            }
            case "excalidraw": {
                name = defautlNativeIntegrationAppName.EXCALIDRAW;
                placeholder = "https://excalidraw.workadventu.re/";
                title = $LL.chat.form.application.excalidraw.title();
                description = $LL.chat.form.application.excalidraw.description();
                img = excalidrawSvg;
                break;
            }
            case "cards": {
                name = defautlNativeIntegrationAppName.CARDS;
                placeholder = "https://member.workadventu.re?tenant=<your cards tenant>&learning=<Your cards learning>";
                title = $LL.chat.form.application.cards.title();
                description = $LL.chat.form.application.cards.description();
                img = cardsPng;
                break;
            }
            default: {
                const app = connectionManager.applications.find((app) => app.name === subtype);
                if (app == undefined) throw new Error(`Application ${subtype} not found`);

                name = app.name;
                placeholder = app.description ?? "";
                title = app.name;
                description = app.description ?? "";
                img = app.image ?? "";
                regexUrl = app.regexUrl;
                targetEmbedableUrl = app.targetUrl;
                break;
            }
        }
        return {
            name,
            placeholder,
            title,
            description,
            img,
            link: "",
            regexUrl,
            targetEmbedableUrl,
        };
    }

    function onUpdatApplicationProperty(applicationPropertyEvent: CustomEvent<ApplicationProperty>) {
        applicationProperty.set(applicationPropertyEvent.detail);
    }

    $: quotedMessageContent = $selectedChatMessageToReply?.content;
</script>

{#if $selectedChatMessageToReply !== null}
    <div class="tw-flex tw-py-2 tw-px-3 tw-items-center tw-gap-2 tw-bg-contrast/50 tw-absolute">
        <p
            class="tw-bg-contrast-800 tw-rounded-md tw-p-2 tw-text-sm tw-m-0 tw-truncate tw-w-full "
            style:overflow-wrap="anywhere"
        >
            {$quotedMessageContent?.body}
        </p>
        <button class="tw-p-0 tw-m-0" on:click={unselectChatMessageToReply}>
            <IconCircleX />
        </button>
    </div>
{/if}

{#if files.length > 0 && !(room instanceof ProximityChatRoom)}
    <div class="tw-w-full tw-pt-2 !tw-bg-blue-300/10 tw-rounded-xl">
        <div class="tw-flex tw-p-2  tw-gap-2 tw-w-full tw-overflow-x-scroll tw-overflow-y-hidden tw-rounded-lg ">
            {#each filesPreview as preview (preview.id)}
                <div
                    class="tw-relative tw-content-center tw-h-[15rem] tw-w-[15rem]  tw-min-h-[15rem] tw-min-w-[15rem] tw-overflow-hidden tw-rounded-xl tw-backdrop-opacity-10"
                >
                    <button class="tw-absolute tw-right-1 tw-top-1 !tw-pr-0" on:click={() => deleteFile(preview.id)}>
                        <IconCircleX class="hover:tw-cursor-pointer hover:tw-opacity-10" font-size="24" />
                    </button>
                    {#if preview.type.includes("image") && typeof preview.url === "string"}
                        <img class="tw-w-full tw-h-full" src={preview.url} alt={preview.name} />
                    {:else}
                        <div class="tw-text-center">
                            {preview.name}
                        </div>
                        <div class="tw-absolute tw-bottom-0 tw-left-0">
                            {formatBytes(preview.size)}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}
{#if applicationComponentOpened}
    <div class="tw-w-full tw-bg-contrast/50 tw-rounded-t-2xl">
        <div class="tw-flex tw-flex-wrap tw-w-full tw-justify-between tw-items-center tw-p-2 tw-gap-2">
            <button
                data-testid="youtubeApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("youtube")}
                disabled={!connectionManager.youtubeToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={youtubeSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.youtube.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.youtubeToolActivated
                        ? $LL.chat.form.application.youtube.description()
                        : $LL.mapEditor.properties.youtubeProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="klaxoonApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("klaxoon")}
                disabled={!connectionManager.klaxoonToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={klaxoonSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.klaxoon.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.klaxoonToolActivated
                        ? $LL.chat.form.application.klaxoon.description()
                        : $LL.mapEditor.properties.klaxoonProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleSheetsApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("googleSheets")}
                disabled={!connectionManager.googleSheetsToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={googleSheetsSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.googleSheets.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.googleSheetsToolActivated
                        ? $LL.chat.form.application.googleSheets.description()
                        : $LL.mapEditor.properties.googleSheetsProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleDocsApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("googleDocs")}
                disabled={!connectionManager.googleDocsToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={googleDocsSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.googleDocs.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.googleDocsToolActivated
                        ? $LL.chat.form.application.googleDocs.description()
                        : $LL.mapEditor.properties.googleDocsProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleSlidesApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("googleSlides")}
                disabled={!connectionManager.googleSlidesToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={googleSlidesSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.googleSlides.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.googleSheetsToolActivated
                        ? $LL.chat.form.application.googleSlides.description()
                        : $LL.mapEditor.properties.googleSlidesProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleDriveApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("googleDrive")}
                disabled={!connectionManager.googleSheetsToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={googleDriveSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.googleDrive.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.googleDriveToolActivated
                        ? $LL.chat.form.application.googleDrive.description()
                        : $LL.mapEditor.properties.googleDriveProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="eraserApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("eraser")}
                disabled={!connectionManager.eraserToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={eraserSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.eraser.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.eraserToolActivated
                        ? $LL.chat.form.application.eraser.description()
                        : $LL.mapEditor.properties.eraserProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="excalidrawApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("excalidraw")}
                disabled={!connectionManager.excalidrawToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={excalidrawSvg} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.excalidraw.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.excalidrawToolActivated
                        ? $LL.chat.form.application.excalidraw.description()
                        : $LL.mapEditor.properties.excalidrawProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="cardsApplicationButton"
                class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                on:click={() => openLinkForm("cards")}
                disabled={!connectionManager.cardsToolActivated}
            >
                <img draggable="false" class="tw-w-8" src={cardsPng} alt="info icon" />
                <h2 class="tw-text-sm tw-p-0 tw-m-0">{$LL.chat.form.application.cards.title()}</h2>
                <p
                    class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                >
                    {connectionManager.cardsToolActivated
                        ? $LL.chat.form.application.cards.description()
                        : $LL.mapEditor.properties.cardsProperties.disabled()}
                </p>
            </button>
        </div>

        <div class="tw-flex tw-flex-wrap tw-w-full tw-justify-between tw-items-center tw-p-2 tw-gap-2">
            {#each connectionManager.applications as app, index (`my-own-app-${index}`)}
                <button
                    data-testid="{app.name}ApplicationButton"
                    class="tw-p-2 tw-m-0 tw-flex tw-flex-col tw-w-36 tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-2xl tw-gap-2 disabled:tw-opacity-50"
                    on:click={() => openLinkForm(app.name)}
                >
                    <img draggable="false" class="tw-w-8" src={app.image} alt="info icon" />
                    <h2 class="tw-text-sm tw-p-0 tw-m-0">{app.name}</h2>
                    <p
                        class="tw-text-xs tw-p-0 tw-m-0 tw-h-12 tw-w-full tw-overflow-hidden tw-overflow-ellipsis tw-text-gray-400"
                    >
                        {app.description}
                    </p>
                </button>
            {/each}
        </div>
    </div>
{/if}
{#if $applicationProperty}
    <div
        class="tw-flex tw-w-full tw-flex-none tw-items-center tw-border tw-border-solid tw-border-b-0 tw-border-x-0 tw-border-t-1 tw-border-white/10 tw-bg-contrast/50"
    >
        <ApplicationFormWraper
            property={$applicationProperty}
            on:close={() => applicationProperty.set(undefined)}
            on:update={onUpdatApplicationProperty}
        />
    </div>
{/if}
<div
    class="tw-flex tw-w-full tw-flex-none tw-items-center tw-border tw-border-solid tw-border-b-0 tw-border-x-0 tw-border-t-1 tw-border-white/10 tw-bg-contrast/50"
>
    <MessageInput
        onKeyDown={sendMessageOrEscapeLine}
        onInput={onInputHandler}
        on:pasteFiles={handleFiles}
        {focusin}
        {focusout}
        bind:message
        bind:messageInput
        inputClass="message-input tw-flex-grow !tw-m-0 tw-px-5 tw-py-2.5 tw-max-h-36 tw-overflow-auto  tw-h-full tw-rounded-xl wa-searchbar tw-block tw-text-white placeholder:tw-text-base tw-border-light-purple tw-border !tw-bg-transparent tw-resize-none tw-border-none tw-outline-none tw-shadow-none focus:tw-ring-0"
        dataText={$LL.chat.enter()}
        dataTestid="messageInput"
    />
    <button
        data-testid="addApplicationButton"
        class="tw-p-0 tw-m-0 tw-h-11 tw-w-11 tw-flex tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-none"
        class:tw-bg-secondary-800={applicationComponentOpened}
        on:click={toggleApplicationComponent}
    >
        <IconSquarePlus font-size={18} />
    </button>
    {#if message.trim().length === 0}
        <button
            class="tw-p-0 tw-m-0 tw-h-11 tw-w-11 tw-flex tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-none"
            bind:this={emojiButtonRef}
            on:click={openCloseEmojiPicker}
        >
            <IconMoodSmile font-size={18} />
        </button>

        {#if gameManager.getCurrentGameScene().room.isChatUploadEnabled}
            <MessageFileInput {room} />
        {/if}
    {/if}
    {#if message.trim().length !== 0 || files.length !== 0 || ($applicationProperty != undefined && $applicationProperty.link.length !== 0)}
        <button
            data-testid="sendMessageButton"
            class="disabled:tw-opacity-30 disabled:!tw-cursor-none disabled:tw-text-white tw-py-0 tw-px-3 tw-m-0 tw-bg-secondary tw-h-full tw-rounded-none"
            disabled={message.trim().length === 0 &&
                files.length === 0 &&
                ($applicationProperty == undefined || $applicationProperty.link.length === 0)}
            on:click={() => sendMessage(message)}
        >
            <IconSend />
        </button>
    {/if}
</div>
