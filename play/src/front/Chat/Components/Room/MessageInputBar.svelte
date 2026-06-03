<script module lang="ts">
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
    import { readable } from "svelte/store";
    import { v4 as uuid } from "uuid";
    import type { EmojiClickEvent } from "emoji-picker-element/shared";
    import { defaultNativeIntegrationAppName } from "@workadventure/shared-utils";
    import { hasChatRoomPollCreation, type ChatConversation } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { chatInputFocusStore } from "../../../Stores/ChatStore";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import LL from "../../../../i18n/i18n-svelte";
    import { ProximityChatRoom } from "../../Connection/Proximity/ProximityChatRoom";
    import { DEFAULT_PROXIMITY_SPACE_NAME } from "../../Connection/Proximity/ProximityChatRoomManager";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { draftMessageService } from "../../Services/DraftMessageService";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import PollCreateDialog from "../PollCreateDialog.svelte";
    import LazyEmote from "../../../Components/EmoteMenu/LazyEmote.svelte";
    import youtubeSvg from "../../../Components/images/applications/icon_youtube.svg";
    import klaxoonSvg from "../../../Components/images/applications/icon_klaxoon.svg";
    import googleDriveSvg from "../../../Components/images/applications/icon_google_drive.svg";
    import googleDocsSvg from "../../../Components/images/applications/icon_google_docs.svg";
    import googleSheetsSvg from "../../../Components/images/applications/icon_google_sheets.svg";
    import googleSlidesSvg from "../../../Components/images/applications/icon_google_slides.svg";
    import eraserSvg from "../../../Components/images/applications/icon_eraser.svg";
    import excalidrawSvg from "../../../Components/images/applications/icon_excalidraw.svg";
    import cardsPng from "../../../Components/images/applications/icon_cards.svg";
    import tldrawJpeg from "../../../Components/images/applications/icon_tldraw.jpeg";
    import { shouldDisableMessageInput, shouldDisableSendButton } from "./MessageInputBarDisabling";
    import ApplicationFormWrapper from "./Application/ApplicationFormWrapper.svelte";
    import MessageFileInput from "./Message/MessageFileInput.svelte";
    import MessageInput from "./MessageInput.svelte";
    import { IconList, IconMoodSmile, IconPaperclip, IconSend, IconX } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        room: ChatConversation;
        disabled: boolean;
    }

    let { room: roomProp, disabled = false }: Props = $props();

    // Room is keyed in the parent component, so it will be re-created when the room changes.
    const room = (() => roomProp)();

    let message = $state("");
    let messageInput: HTMLDivElement | undefined = $state();
    let messageBarRef: HTMLDivElement;
    let stopTypingTimeOutID: undefined | ReturnType<typeof setTimeout>;
    let files: { id: string; file: File }[] = $state([]);
    let filesPreview: { id: string; size: number; name: string; type: string; url: FileReader["result"] }[] = $state(
        [],
    );
    const TYPINT_TIMEOUT = 10000;
    const inactiveProximityState = readable(false);

    let applicationComponentOpened = $state(false);
    let fileAttachmentComponentOpened = $state(false);
    let fileAttachementEnabled = $state(false);
    let applicationProperty: ApplicationProperty | undefined = $state(undefined);
    let isProximityChatRoom = $derived(room instanceof ProximityChatRoom);
    let isDefaultProximityRoom = $derived(
        room instanceof ProximityChatRoom && room.spaceName === DEFAULT_PROXIMITY_SPACE_NAME,
    );
    let proximityChatDisabled = $derived(
        room instanceof ProximityChatRoom ? room.isChatDisabled : inactiveProximityState,
    );
    let proximityRoomJoined = $derived(room instanceof ProximityChatRoom ? room.isJoined : inactiveProximityState);
    const cannotCreatePoll = readable(false);

    function getPollCreationCapability(currentRoom: ChatConversation) {
        return hasChatRoomPollCreation(currentRoom) ? currentRoom.pollCreation : undefined;
    }

    let pollCreation = $derived(getPollCreationCapability(room));
    let canCreatePoll = $derived(pollCreation?.canCreate ?? cannotCreatePoll);
    let messageInputDisabled = $derived(
        shouldDisableMessageInput({
            disabled,
            isProximityChatRoom,
            isDefaultProximityRoom,
            isProximityChatDisabled: $proximityChatDisabled,
            isProximityRoomJoined: $proximityRoomJoined,
        }),
    );
    let replyMessageId: string | null = null;
    let draftId = $derived(`${room.id}-${localUserStore.getChatId() ?? "0"}`);

    const applicationManager = gameManager.getCurrentGameScene().applicationManager;

    const selectedChatChatMessageToReplyUnsubscriber = selectedChatMessageToReply.subscribe((chatMessage) => {
        if (chatMessage !== null) {
            messageInput?.focus();
            replyMessageId = chatMessage.id;
        }
    });

    function sendMessageOrEscapeLine(keyDownEvent: KeyboardEvent) {
        if (stopTypingTimeOutID) clearTimeout(stopTypingTimeOutID);

        const isEmptyMessage = message.replace(/<br>/g, "").trim() == "" || message == undefined;
        if (keyDownEvent.key === "Enter" || isEmptyMessage) {
            room.stopTyping().catch((error) => console.error(error));
        } else {
            room.startTyping()
                .then(() => {
                    stopTypingTimeOutID = setTimeout(() => {
                        room.stopTyping().catch((error) => console.error(error));
                        stopTypingTimeOutID = undefined;
                    }, TYPINT_TIMEOUT);
                })
                .catch((error) => console.error(error));
        }

        if (keyDownEvent.key === "Enter" && keyDownEvent.shiftKey) {
            return;
        }
        if (keyDownEvent.key === "Enter" && !keyDownEvent.shiftKey) {
            keyDownEvent.preventDefault();
        }

        if (keyDownEvent.key === "Enter" && !isEmptyMessage) {
            // message contains HTML tags. Actually, the only tags we allow are for the new line, ie. <br> tags.
            // We can turn those back into carriage returns.
            const messageToSend = message.replace(/<br>/g, "\n");
            sendMessage(messageToSend).catch((error) => console.error(error));
        }
    }

    async function sendMessage(messageToSend: string) {
        if (applicationProperty && applicationProperty.link.length !== 0) {
            room?.sendMessage(applicationProperty.link);
        }
        // close application part
        applicationProperty = undefined;
        applicationComponentOpened = false;

        // send files
        if (files && files.length > 0) {
            if (!(room instanceof ProximityChatRoom)) {
                const idsToSend = files.map((f) => f.id);
                const fileList: FileList = files.reduce((fileListAcc, currentFile) => {
                    fileListAcc.items.add(currentFile.file);
                    return fileListAcc;
                }, new DataTransfer()).files;

                try {
                    await room.sendFiles(fileList);
                    files = files.filter((f) => !idsToSend.includes(f.id));
                    filesPreview = filesPreview.filter((p) => !idsToSend.includes(p.id));
                } catch (error) {
                    console.error(error);
                    warningMessageStore.addWarningMessage($LL.chat.failedToSendAttachments(), {
                        closable: true,
                    });
                }
            }
        }

        // send message
        if (messageToSend.trim().length !== 0) {
            room?.sendMessage(messageToSend);
            if (messageInput) {
                messageInput.innerText = "";
            }
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
        // We remove the <br> tags and the whitespace to check if the message is empty
        const messageToSend = message.replace(/<br>/g, "").trim();
        if (messageToSend == "" || messageToSend == undefined) {
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
                const loadReplyMessage = await room.getMessageById?.(draft.replyingToMessageId);
                selectedChatMessageToReply.set(loadReplyMessage ?? null);
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
        if (stopTypingTimeOutID) {
            clearTimeout(stopTypingTimeOutID);
            stopTypingTimeOutID = undefined;
        }
        room.stopTyping().catch((error) => console.error(error));
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
                true,
            );
        }
    }

    export function handleFiles(filesToAdd: FileList) {
        const newFiles = [...filesToAdd].map((file) => ({ id: uuid(), file }));
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

    function openPollCreationModal() {
        if (!pollCreation || !$canCreatePoll) {
            return;
        }

        applicationComponentOpened = false;
        applicationProperty = undefined;
        fileAttachmentComponentOpened = false;
        modals.open(PollCreateDialog, { pollCreation });
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
                name = defaultNativeIntegrationAppName.YOUTUBE;
                placeholder = "https://www.youtube.com/watch?v=Y9ubBWf5w20";
                title = $LL.chat.form.application.youtube.title();
                description = $LL.chat.form.application.youtube.description();
                img = youtubeSvg;
                break;
            }
            case "klaxoon": {
                name = defaultNativeIntegrationAppName.KLAXOON;
                placeholder = "https://app.klaxoon.com/";
                title = $LL.chat.form.application.klaxoon.title();
                description = $LL.chat.form.application.klaxoon.description();
                img = klaxoonSvg;
                break;
            }
            case "googleDrive": {
                name = defaultNativeIntegrationAppName.GOOGLE_DRIVE;
                placeholder = "https://drive.google.com/file/d/1DjNjZVbVeQO9EvgONLzCtl6wG-kxSr9Z/preview";
                title = $LL.chat.form.application.googleDrive.title();
                description = $LL.chat.form.application.googleDrive.description();
                img = googleDriveSvg;
                break;
            }
            case "googleDocs": {
                name = defaultNativeIntegrationAppName.GOOGLE_DOCS;
                placeholder = "https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit";
                title = $LL.chat.form.application.googleDocs.title();
                description = $LL.chat.form.application.googleDocs.description();
                img = googleDocsSvg;
                break;
            }
            case "googleSheets": {
                name = defaultNativeIntegrationAppName.GOOGLE_SHEETS;
                placeholder =
                    "https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit";
                title = $LL.chat.form.application.googleSheets.title();
                description = $LL.chat.form.application.googleSheets.description();
                img = googleSheetsSvg;
                break;
            }
            case "googleSlides": {
                name = defaultNativeIntegrationAppName.GOOGLE_SLIDES;
                placeholder =
                    "https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit";
                title = $LL.chat.form.application.googleSlides.title();
                description = $LL.chat.form.application.googleSlides.description();
                img = googleSlidesSvg;
                break;
            }
            case "eraser": {
                name = defaultNativeIntegrationAppName.ERASER;
                placeholder = "https://app.eraser.io/workspace/ExSd8Z4wPsaqMMgTN4VU";
                title = $LL.chat.form.application.eraser.title();
                description = $LL.chat.form.application.eraser.description();
                img = eraserSvg;
                break;
            }
            case "excalidraw": {
                name = defaultNativeIntegrationAppName.EXCALIDRAW;
                placeholder = "https://excalidraw.workadventu.re/";
                title = $LL.chat.form.application.excalidraw.title();
                description = $LL.chat.form.application.excalidraw.description();
                img = excalidrawSvg;
                break;
            }
            case "cards": {
                name = defaultNativeIntegrationAppName.CARDS;
                placeholder = "https://member.workadventu.re?tenant=<your cards tenant>&learning=<Your cards learning>";
                title = $LL.chat.form.application.cards.title();
                description = $LL.chat.form.application.cards.description();
                img = cardsPng;
                break;
            }
            case "tldraw": {
                name = defaultNativeIntegrationAppName.TLDRAW;
                placeholder = "https://tldraw.com/";
                title = $LL.chat.form.application.tldraw.title();
                description = $LL.chat.form.application.tldraw.description();
                img = tldrawJpeg;
                break;
            }
            default: {
                const app = applicationManager.applications.find((app) => app.name === subtype);
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

    function onUpdatApplicationProperty(nextApplicationProperty: ApplicationProperty) {
        applicationProperty = nextApplicationProperty;
    }

    let applicationPropertyInProcessing = $state(false);
    function onProcessingApplicationProperty() {
        applicationPropertyInProcessing = true;
    }

    function onProcessedApplicationProperty() {
        applicationPropertyInProcessing = false;
    }

    let quotedMessageContent = $derived($selectedChatMessageToReply?.content);
</script>

{#if files.length > 0 && !(room instanceof ProximityChatRoom)}
    <div class="w-full min-w-0 p-1">
        <div
            class="flex flex-row flex-nowrap gap-2 w-full min-w-[200px] overflow-x-auto no-scroll-bar rounded-lg p-2 bg-contrast/80"
        >
            {#each filesPreview as preview (preview.id)}
                <div
                    class="relative shrink-0 content-center {preview.type.includes('image')
                        ? 'w-20'
                        : 'w-28'} h-20 rounded-md backdrop-opacity-10 bg-white p-0.5"
                >
                    <button
                        class="border-2 border-white border-solid absolute flex items-center justify-center rounded-full bg-secondary hover:bg-secondary-600 p-0.5 -start-2 -top-2"
                        onclick={() => deleteFile(preview.id)}
                    >
                        <IconX font-size="12" />
                    </button>
                    {#if preview.type.includes("image") && typeof preview.url === "string"}
                        <img
                            draggable="false"
                            class="w-full h-full object-cover rounded-[10px]"
                            src={preview.url}
                            alt={preview.name}
                        />
                    {:else}
                        <div
                            title={preview.name}
                            class="flex flex-col items-start overflow-hidden text-ellipsis justify-between p-0.5 bg-contrast/90 h-full w-full text-xs rounded-[10px]"
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
                onclick={() => openFileAttachmentComponent()}
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

            <button
                data-testid="createPollButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={openPollCreationModal}
                disabled={!pollCreation || !$canCreatePoll}
            >
                <IconList font-size={32} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.poll.title()}</h2>
                <p class="text-xs p-0 m-0 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {pollCreation && $canCreatePoll ? $LL.chat.poll.create.description() : $LL.chat.disabled()}
                </p>
            </button>
        </div>

        <div class="flex flex-wrap w-full justify-between items-center p-2 gap-2">
            <button
                data-testid="youtubeApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("youtube")}
                class:bg-secondary-800={applicationProperty?.name === "youtube"}
                disabled={!applicationManager.youtubeToolActivated}
            >
                <img draggable="false" class="w-8" src={youtubeSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.youtube.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.youtubeToolActivated
                        ? $LL.chat.form.application.youtube.description()
                        : $LL.mapEditor.properties.youtube.disabled()}
                </p>
            </button>

            <button
                data-testid="klaxoonApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("klaxoon")}
                class:bg-secondary-800={applicationProperty?.name === "klaxoon"}
                disabled={!applicationManager.klaxoonToolActivated}
            >
                <img draggable="false" class="w-8" src={klaxoonSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.klaxoon.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.klaxoonToolActivated
                        ? $LL.chat.form.application.klaxoon.description()
                        : $LL.mapEditor.properties.klaxoon.disabled()}
                </p>
            </button>

            <button
                data-testid="googleSheetsApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("googleSheets")}
                class:bg-secondary-800={applicationProperty?.name === "googleSheets"}
                disabled={!applicationManager.googleSheetsToolActivated}
            >
                <img draggable="false" class="w-8" src={googleSheetsSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleSheets.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.googleSheetsToolActivated
                        ? $LL.chat.form.application.googleSheets.description()
                        : $LL.mapEditor.properties.googleSheets.disabled()}
                </p>
            </button>

            <button
                data-testid="googleDocsApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("googleDocs")}
                class:bg-secondary-800={applicationProperty?.name === "googleDocs"}
                disabled={!applicationManager.googleDocsToolActivated}
            >
                <img draggable="false" class="w-8" src={googleDocsSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleDocs.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.googleDocsToolActivated
                        ? $LL.chat.form.application.googleDocs.description()
                        : $LL.mapEditor.properties.googleDocs.disabled()}
                </p>
            </button>

            <button
                data-testid="googleSlidesApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("googleSlides")}
                class:bg-secondary-800={applicationProperty?.name === "googleSlides"}
                disabled={!applicationManager.googleSlidesToolActivated}
            >
                <img draggable="false" class="w-8" src={googleSlidesSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleSlides.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.googleSlidesToolActivated
                        ? $LL.chat.form.application.googleSlides.description()
                        : $LL.mapEditor.properties.googleSlides.disabled()}
                </p>
            </button>

            <button
                data-testid="googleDriveApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("googleDrive")}
                class:bg-secondary-800={applicationProperty?.name === "googleDrive"}
                disabled={!applicationManager.googleDriveToolActivated}
            >
                <img draggable="false" class="w-8" src={googleDriveSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.googleDrive.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.googleDriveToolActivated
                        ? $LL.chat.form.application.googleDrive.description()
                        : $LL.mapEditor.properties.googleDrive.disabled()}
                </p>
            </button>

            <button
                data-testid="eraserApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("eraser")}
                class:bg-secondary-800={applicationProperty?.name === "eraser"}
                disabled={!applicationManager.eraserToolActivated}
            >
                <img draggable="false" class="w-8" src={eraserSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.eraser.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.eraserToolActivated
                        ? $LL.chat.form.application.eraser.description()
                        : $LL.mapEditor.properties.eraser.disabled()}
                </p>
            </button>

            <button
                data-testid="excalidrawApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("excalidraw")}
                class:bg-secondary-800={applicationProperty?.name === "excalidraw"}
                disabled={!applicationManager.excalidrawToolActivated}
            >
                <img draggable="false" class="w-8" src={excalidrawSvg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.excalidraw.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.excalidrawToolActivated
                        ? $LL.chat.form.application.excalidraw.description()
                        : $LL.mapEditor.properties.excalidraw.disabled()}
                </p>
            </button>

            <button
                data-testid="cardsApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("cards")}
                class:bg-secondary-800={applicationProperty?.name === "cards"}
                disabled={!applicationManager.cardsToolActivated}
            >
                <img draggable="false" class="w-8" src={cardsPng} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.cards.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.cardsToolActivated
                        ? $LL.chat.form.application.cards.description()
                        : $LL.mapEditor.properties.cards.disabled()}
                </p>
            </button>

            <button
                data-testid="tldrawApplicationButton"
                class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                onclick={() => openLinkForm("tldraw")}
                class:bg-secondary-800={applicationProperty?.name === "tldraw"}
                disabled={!applicationManager.tldrawToolActivated}
            >
                <img draggable="false" class="w-8" src={tldrawJpeg} alt={$LL.chat.a11y.applicationIcon()} />
                <h2 class="text-sm p-0 m-0">{$LL.chat.form.application.tldraw.title()}</h2>
                <p class="text-xs p-0 m-0 h-12 w-full overflow-hidden overflow-ellipsis text-gray-400">
                    {applicationManager.tldrawToolActivated
                        ? $LL.chat.form.application.tldraw.description()
                        : $LL.mapEditor.properties.tldraw.disabled()}
                </p>
            </button>
        </div>

        <div class="flex flex-wrap w-full justify-between items-center p-2 gap-2">
            {#each applicationManager.applications as app, index (`my-own-app-${index}`)}
                <button
                    data-testid="{app.name}ApplicationButton"
                    class="p-2 m-0 flex flex-col w-36 items-center justify-center hover:bg-white/10 rounded-2xl gap-2 disabled:opacity-50"
                    class:bg-secondary-800={applicationProperty?.name === app.name}
                    onclick={() => openLinkForm(app.name)}
                >
                    <img draggable="false" class="w-8" src={app.image} alt={$LL.chat.a11y.applicationIcon()} />
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
            close={() => (applicationProperty = undefined)}
            update={onUpdatApplicationProperty}
            processing={onProcessingApplicationProperty}
            processed={onProcessedApplicationProperty}
        />
    </div>
{/if}
{#if fileAttachmentComponentOpened}
    <MessageFileInput
        {room}
        filesSelected={(files) => {
            handleFiles(files);
            closeFileAttachmentComponent();
        }}
        fileUploaded={() => closeFileAttachmentComponent()}
    />
{/if}
<div
    class="flex w-full flex-none items-center border border-solid border-b-0 border-x-0 border-t-1 border-white/10 bg-contrast/50 relative"
    bind:this={messageBarRef}
>
    {#if $selectedChatMessageToReply !== null}
        <div class="flex p-2 items-start absolute top-0 -translate-y-full w-full">
            <div class="flex flex-row gap-2 items-center justify-between bg-contrast rounded-lg w-full backdrop-blur">
                <div class="flex flex-col p-2 rounded-lg w-full">
                    <span class="flex flex-row justify-between">
                        <span class="text-sm text-gray-400">
                            {$LL.chat.replyTo()}
                        </span>
                        <button class="p-2 m-0" onclick={unselectChatMessageToReply}>
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
        onkeydown={sendMessageOrEscapeLine}
        oninput={onInputHandler}
        pasteFiles={handleFiles}
        {focusin}
        {focusout}
        bind:message
        bind:messageInput
        disabled={messageInputDisabled}
        inputClass="message-input flex-grow !m-0 px-4 py-2.5 max-h-36 overflow-auto h-full rounded-lg wa-searchbar block text-sm text-white placeholder:text-white/50 placeholder:text-sm border border-white/10 !bg-white/5 resize-none outline-none shadow-none focus:ring-0 focus:border-white/20"
        dataText={$LL.chat.enter()}
        dataTestid="messageInput"
    />
    <button
        data-testid="addApplicationButton"
        class="p-0 m-0 h-11 w-11 flex items-center justify-center hover:bg-white/10 rounded-md shrink-0"
        class:bg-secondary-800={applicationComponentOpened}
        onclick={toggleApplicationComponent}
    >
        <IconX
            font-size={18}
            class={applicationComponentOpened ? "rotate-0" : "rotate-45"}
            style="transition: all .2s ease-out;"
        />
    </button>
    <button
        class="p-0 m-0 h-11 w-11 flex items-center justify-center hover:bg-white/10 rounded-md shrink-0"
        onclick={openCloseEmojiPicker}
    >
        <IconMoodSmile font-size={18} />
    </button>
    {#if message.trim().length !== 0 || files.length !== 0 || (applicationProperty && applicationProperty.link.length !== 0)}
        <button
            data-testid="sendMessageButton"
            class="disabled:opacity-30 disabled:!cursor-none disabled:text-white py-0 px-3 m-0 bg-secondary h-full rounded-md"
            disabled={shouldDisableSendButton({
                applicationPropertyInProcessing,
                isMessageInputDisabled: messageInputDisabled,
            })}
            onclick={() => sendMessage(message).catch((error) => console.error(error))}
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
