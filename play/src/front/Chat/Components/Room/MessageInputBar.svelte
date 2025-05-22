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
    import { onDestroy, onMount } from "svelte";
    import { v4 as uuid } from "uuid";
    import type { EmojiClickEvent } from "emoji-picker-element/shared";
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
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
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import LazyEmote from "../../../Components/EmoteMenu/LazyEmote.svelte";
    import { draftMessageService } from "../../Services/DraftMessageService";
    import { MatrixChatRoom } from "../../Connection/Matrix/MatrixChatRoom";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import MessageInput from "./MessageInput.svelte";
    import MessageFileInput from "./Message/MessageFileInput.svelte";
    import ApplicationFormWrapper from "./Application/ApplicationFormWrapper.svelte";
    import { IconMoodSmile, IconPaperclip, IconSend, IconX } from "@wa-icons";

    export let room: ChatRoom;
    export let disabled = false;

    let message = "";
    let messageInput: HTMLDivElement;
    let messageBarRef: HTMLDivElement;
    let stopTypingTimeOutID: undefined | ReturnType<typeof setTimeout>;
    let files: { id: string; file: File }[] = [];
    let filesPreview: { id: string; size: number; name: string; type: string; url: FileReader["result"] }[] = [];
    const TYPINT_TIMEOUT = 10000;

    let applicationComponentOpened = false;
    let fileAttachmentComponentOpened = false;
    let fileAttachementEnabled = false;
    let applicationProperty: ApplicationProperty | undefined = undefined;
    const isProximityChatRoom = room instanceof ProximityChatRoom;
    let replyMessageId: string | null = null;
    const draftId = `${room.id}-${localUserStore.getChatId() ?? "0"}`;

    const selectedChatChatMessageToReplyUnsubscriber = selectedChatMessageToReply.subscribe((chatMessage) => {
        if (chatMessage !== null) {
            messageInput.focus();
            replyMessageId = chatMessage.id;
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
    }

    function sendMessage(messageToSend: string) {
        if (applicationProperty && applicationProperty.link.length !== 0) {
            room?.sendMessage(applicationProperty.link);
        }
        // close application part
        applicationProperty = undefined;
        applicationComponentOpened = false;

        // send files
        if (files && files.length > 0) {
            if (!(room instanceof ProximityChatRoom)) {
                const fileList: FileList = files.reduce((fileListAcc, currentFile) => {
                    fileListAcc.items.add(currentFile.file);
                    return fileListAcc;
                }, new DataTransfer()).files;

                room.sendFiles(fileList).catch((error) => console.error(error));
                files = [];
                filesPreview = [];
            }
        }

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
        replyMessageId = null;
    }

    function onInputHandler() {
        if (message == "" || message == undefined) {
            if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);
            room.stopTyping().catch((error) => console.error(error));
        }
    }

    onMount(async () => {
        fileAttachementEnabled = gameManager.getCurrentGameScene().room.isChatUploadEnabled;
        const draft = await draftMessageService.loadDraft(draftId);
        if (draft) {
            message = draft.message ?? "";
            if (draft.replyingToMessageId) {
                if (room instanceof MatrixChatRoom) {
                    let loadReplyMessage = await room.getMessageById(draft.replyingToMessageId);
                    selectedChatMessageToReply.set(loadReplyMessage ?? null);
                }
            }
        }
    });

    onDestroy(() => {
        draftMessageService.saveDraft({
            id: draftId,
            roomId: room.id,
            userId: localUserStore.getChatId(),
            message,
            replyingToMessageId: replyMessageId ?? null,
        });
        if (setTimeOutProperty) clearTimeout(setTimeOutProperty);
        closeEmojiPicker?.();
        closeEmojiPicker = undefined;
        selectedChatChatMessageToReplyUnsubscriber();
    });

    let closeEmojiPicker: (() => void) | undefined = undefined;

    function openCloseEmojiPicker() {
        if (closeEmojiPicker) {
            closeEmojiPicker();
            closeEmojiPicker = undefined;
        } else {
            closeEmojiPicker = showFloatingUi(
                messageBarRef,
                LazyEmote,
                {
                    onEmojiClick: (event: EmojiClickEvent) => {
                        message += event.detail.unicode ?? "";
                    },
                    onClose: () => {
                        closeEmojiPicker?.();
                        closeEmojiPicker = undefined;
                    },
                },
                {
                    placement: "top-end",
                },
                12,
                true
            );
        }
    }

    export function handleFiles(event: CustomEvent<FileList>) {
        const newFiles = [...event.detail].map((file) => ({ id: uuid(), file }));
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

    function openFileAttachmentComponent() {
        fileAttachmentComponentOpened = true;
        applicationComponentOpened = false;
        applicationProperty = undefined;
    }
    function closeFileAttachmentComponent() {
        fileAttachmentComponentOpened = false;
        applicationComponentOpened = false;
        applicationProperty = undefined;
    }
    // This function open the application part to propose to the user to add a new application or close application part
    function toggleApplicationComponent() {
        applicationComponentOpened = !applicationComponentOpened;
        applicationProperty = undefined;
    }
    // This function open form to send a link to the user
    let setTimeOutProperty: ReturnType<typeof setTimeout>;
    function openLinkForm(appName: string) {
        applicationProperty = undefined;
        // Use setTimeout to force the component to be updated
        if (setTimeOutProperty) clearTimeout(setTimeOutProperty);
        setTimeOutProperty = setTimeout(() => {
            applicationProperty = getPropertyFromType(appName);
        }, 0);
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
        applicationProperty = applicationPropertyEvent.detail;
    }

    $: quotedMessageContent = $selectedChatMessageToReply?.content;
</script>

{#if files.length > 0 && !(room instanceof ProximityChatRoom)}
    <div class="w-full p-1">
        <div class="flex flex-row gap-2 w-full overflow-visible no-scroll-bar rounded-lg p-2 bg-contrast/80">
            {#each filesPreview as preview (preview.id)}
                <div
                    class="relative content-center {preview.type.includes('image')
                        ? 'w-20'
                        : 'w-28'} h-20 rounded-md backdrop-opacity-10 bg-white p-0.5"
                >
                    <button
                        class="border-2 border-white border-solid absolute flex items-center justify-center rounded-full bg-secondary hover:bg-secondary-600 p-0.5 -start-2 -top-2"
                        on:click={() => deleteFile(preview.id)}
                    >
                        <IconX font-size="12" />
                    </button>
                    {#if preview.type.includes("image") && typeof preview.url === "string"}
                        <img class="w-full h-full object-cover rounded-[10px]" src={preview.url} alt={preview.name} />
                    {:else}
                        <div
                            title={preview.name}
                            class="flex flex-col items-start overflow-hidden text-ellipsis justify-between p-0.5 bg-contrast/90 h-full w-full text-xs rounded-[10px] "
                        >
                            <span class="line-clamp-2 indent-3 text-xs">
                                {preview.name}
                            </span>
                            <div class="rounded-[6px] bg-white/10 p-0.5 text-xxs m-0.5">
                                {formatBytes(preview.size)}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}
{#if applicationComponentOpened}
    <div class="w-full bg-contrast/50 rounded-t-2xl">
        <div class="flex flex-wrap w-full justify-between items-center p-2 gap-2">
            <button
                data-testid="fileAttachmentButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openFileAttachmentComponent()}
                class:bg-secondary-800={fileAttachmentComponentOpened}
                disabled={!fileAttachementEnabled || isProximityChatRoom}
            >
                <IconPaperclip font-size={32} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.fileAttachment.title()}</h2>
                <p class="text-xs p-0 m-0 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {fileAttachementEnabled && !isProximityChatRoom
                        ? $LL.chat.fileAttachment.description()
                        : $LL.chat.fileAttachment.featureComingSoon()}
                </p>
            </button>
        </div>

        <div class="flex flex-wrap w-full justify-between items-center p-2 gap-2">
            <button
                data-testid="youtubeApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("youtube")}
                class:bg-secondary-800={applicationProperty?.name === "youtube"}
                disabled={!connectionManager.youtubeToolActivated}
            >
                <img draggable="false" class="w-8" src={youtubeSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.youtube.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.youtubeToolActivated
                        ? $LL.chat.form.application.youtube.description()
                        : $LL.mapEditor.properties.youtubeProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="klaxoonApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("klaxoon")}
                class:bg-secondary-800={applicationProperty?.name === "klaxoon"}
                disabled={!connectionManager.klaxoonToolActivated}
            >
                <img draggable="false" class="w-8" src={klaxoonSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.klaxoon.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.klaxoonToolActivated
                        ? $LL.chat.form.application.klaxoon.description()
                        : $LL.mapEditor.properties.klaxoonProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleSheetsApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("googleSheets")}
                class:bg-secondary-800={applicationProperty?.name === "googleSheets"}
                disabled={!connectionManager.googleSheetsToolActivated}
            >
                <img draggable="false" class="w-8" src={googleSheetsSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleSheets.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.googleSheetsToolActivated
                        ? $LL.chat.form.application.googleSheets.description()
                        : $LL.mapEditor.properties.googleSheetsProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleDocsApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("googleDocs")}
                class:bg-secondary-800={applicationProperty?.name === "googleDocs"}
                disabled={!connectionManager.googleDocsToolActivated}
            >
                <img draggable="false" class="w-8" src={googleDocsSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleDocs.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.googleDocsToolActivated
                        ? $LL.chat.form.application.googleDocs.description()
                        : $LL.mapEditor.properties.googleDocsProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleSlidesApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("googleSlides")}
                class:bg-secondary-800={applicationProperty?.name === "googleSlides"}
                disabled={!connectionManager.googleSlidesToolActivated}
            >
                <img draggable="false" class="w-8" src={googleSlidesSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleSlides.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.googleSheetsToolActivated
                        ? $LL.chat.form.application.googleSlides.description()
                        : $LL.mapEditor.properties.googleSlidesProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="googleDriveApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("googleDrive")}
                class:bg-secondary-800={applicationProperty?.name === "googleDrive"}
                disabled={!connectionManager.googleSheetsToolActivated}
            >
                <img draggable="false" class="w-8" src={googleDriveSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleDrive.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.googleDriveToolActivated
                        ? $LL.chat.form.application.googleDrive.description()
                        : $LL.mapEditor.properties.googleDriveProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="eraserApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("eraser")}
                class:bg-secondary-800={applicationProperty?.name === "eraser"}
                disabled={!connectionManager.eraserToolActivated}
            >
                <img draggable="false" class="w-8" src={eraserSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.eraser.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.eraserToolActivated
                        ? $LL.chat.form.application.eraser.description()
                        : $LL.mapEditor.properties.eraserProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="excalidrawApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("excalidraw")}
                class:bg-secondary-800={applicationProperty?.name === "excalidraw"}
                disabled={!connectionManager.excalidrawToolActivated}
            >
                <img draggable="false" class="w-8" src={excalidrawSvg} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.excalidraw.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.excalidrawToolActivated
                        ? $LL.chat.form.application.excalidraw.description()
                        : $LL.mapEditor.properties.excalidrawProperties.disabled()}
                </p>
            </button>

            <button
                data-testid="cardsApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                on:click={() => openLinkForm("cards")}
                class:bg-secondary-800={applicationProperty?.name === "cards"}
                disabled={!connectionManager.cardsToolActivated}
            >
                <img draggable="false" class="w-8" src={cardsPng} alt="info icon" />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.cards.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {connectionManager.cardsToolActivated
                        ? $LL.chat.form.application.cards.description()
                        : $LL.mapEditor.properties.cardsProperties.disabled()}
                </p>
            </button>
        </div>

        <div class="flex flex-wrap w-full justify-between items-center p-2 gap-2">
            {#each connectionManager.applications as app, index (`my-own-app-${index}`)}
                <button
                    data-testid="{app.name}ApplicationButton"
                    class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                    class:bg-secondary-800={applicationProperty?.name === app.name}
                    on:click={() => openLinkForm(app.name)}
                >
                    <img draggable="false" class="w-8" src={app.image} alt="info icon" />
                    <h2 class="text-sm p-0 m-0">{app.name}</h2>
                    <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                        {app.description}
                    </p>
                </button>
            {/each}
        </div>
    </div>
{/if}
{#if applicationProperty}
    <div
        class="flex w-full flex-none items-center border border-solid border-b-0 border-x-0 border-t-1 border-white/10 bg-contrast/50"
    >
        <ApplicationFormWrapper
            property={applicationProperty}
            on:close={() => (applicationProperty = undefined)}
            on:update={onUpdatApplicationProperty}
        />
    </div>
{/if}
{#if fileAttachmentComponentOpened}
    <MessageFileInput {room} on:fileUploaded={() => closeFileAttachmentComponent()} />
{/if}
<div
    class="flex w-full flex-none items-center border border-solid border-b-0 border-x-0 border-t-1 border-white/10 bg-contrast/50 relative"
    bind:this={messageBarRef}
>
    {#if $selectedChatMessageToReply !== null}
        <div class="flex p-2 items-start absolute top-0 -translate-y-full w-full">
            <div class="flex flex-row gap-2 items-center justify-between bg-contrast rounded w-full backdrop-blur">
                <div class="flex flex-col p-2 rounded w-full">
                    <span class="flex flex-row justify-between">
                        <span class="text-sm text-gray-400">
                            {$LL.chat.replyTo()}
                        </span>
                        <button class="p-2 m-0" on:click={unselectChatMessageToReply}>
                            <!--<IconCircleX />-->
                            <IconX font-size={18} />
                        </button>
                    </span>
                    <div class="flex row w-full border-l border-l-white/10 ml-1 border-solid border-0">
                        <p
                            class=" text-xs text-white/30 rounded-md p-2 m-0 truncate w-full text-ellipsis"
                            style:overflow-wrap="anywhere"
                        >
                            {$quotedMessageContent?.body}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    {/if}
    <MessageInput
        onKeyDown={sendMessageOrEscapeLine}
        onInput={onInputHandler}
        on:pasteFiles={handleFiles}
        {focusin}
        {focusout}
        bind:message
        bind:messageInput
        disabled={disabled && !isProximityChatRoom}
        inputClass="message-input flex-grow !m-0 px-5 py-2.5 max-h-36 overflow-auto  h-full rounded-xl wa-searchbar block text-white placeholder:text-base border-light-purple border !bg-transparent resize-none border-none outline-none shadow-none focus:ring-0"
        dataText={$LL.chat.enter()}
        dataTestid="messageInput"
    />
    <button
        data-testid="addApplicationButton"
        class="p-0 m-0 h-11 w-11 flex items-center justify-center hover:bg-white/10 rounded-none"
        class:bg-secondary-800={applicationComponentOpened}
        on:click={toggleApplicationComponent}
    >
        <IconX
            font-size={18}
            class={applicationComponentOpened ? "rotate-0" : "rotate-45"}
            style="transition: all .2s ease-out;"
        />
    </button>
    <button
        class="p-0 m-0 h-11 w-11 flex items-center justify-center hover:bg-white/10 rounded-none"
        on:click={openCloseEmojiPicker}
    >
        <IconMoodSmile font-size={18} />
    </button>
    {#if message.trim().length !== 0 || files.length !== 0 || (applicationProperty && applicationProperty.link.length !== 0)}
        <button
            data-testid="sendMessageButton"
            class="disabled:opacity-30 disabled:!cursor-none disabled:text-white py-0 px-3 m-0 bg-secondary h-full rounded-none"
            disabled={message.trim().length === 0 &&
                files.length === 0 &&
                (!applicationProperty || applicationProperty.link.length === 0)}
            on:click={() => sendMessage(message)}
        >
            <IconSend />
        </button>
    {/if}
</div>

<style>
    .no-scroll-bar {
        max-width: calc(100% + 15px);
    }
    .no-scroll-bar::-webkit-scrollbar {
        display: none;
    }
    .no-scroll-bar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
