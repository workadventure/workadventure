<script lang="ts">
    import {
        SendIcon,
        SmileIcon,
        PaperclipIcon,
        LoaderIcon,
        Trash2Icon,
        CheckIcon,
        AlertCircleIcon,
        XCircleIcon,
        ArrowRightCircleIcon,
    } from "svelte-feather-icons";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { defaultWoka, User } from "../Xmpp/AbstractRoom";
    import LL, { locale } from "../i18n/i18n-svelte";
    import { createEventDispatcher, onMount } from "svelte";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import {
        selectedMessageToReply,
        filesUploadStore,
        hasErrorUploadingFile,
        hasInProgressUploadingFile,
        mentionsUserStore,
        enableChatUpload,
    } from "../Stores/ChatStore";
    import { UserData } from "@workadventure/messages";
    import { userStore } from "../Stores/LocalUserStore";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { FileExt, fileMessageManager, UploadedFile, uploadingState } from "../Services/FileMessageManager";
    import File from "./Content/File.svelte";
    import crown from "../../public/static/svg/icone-premium-crown.svg";
    import { iframeListener } from "../IframeListener";
    import { ChatState } from "stanza/Constants";
    import { get } from "svelte/store";

    export let mucRoom: MucRoom;

    const dispatch = createEventDispatcher();

    let emojiContainer: HTMLElement;
    let picker: EmojiButton;
    let textarea: HTMLElement;
    let messageForm: HTMLDivElement;
    let informationMessage: string | null = null;
    let emojiOpened = false;
    let newMessageText = "";
    let htmlMessageText = "";
    let usersSearching: User[] = [];

    const maxCharMessage = 10_000;
    $: isMessageTooLong = newMessageText.length > maxCharMessage;

    export const defaultColor = "#626262";
    // Negative lookbehind doesn't work on Safari browser
    // const regexUserTag = /(?<![\w@])@([\w@]+(?:[.!][\w@]+)*)+$/gm;
    const regexUserTag = /@([\w@]+(?:[.!][\w@]+)*)+$/gm;

    const presenceStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();
    const me = presenceStore.get(mucRoom.myJID);

    function onInput() {
        analyseText();
        dispatch("formHeight", messageForm.clientHeight);
        if (htmlMessageText === "<br>") {
            htmlMessageText = "";
        }
    }

    function onKeyDown(key: KeyboardEvent): boolean {
        if (key.key === "Enter" && !key.shiftKey) {
            sendMessage();
            return false;
        }
        return true;
    }

    function onKeyPress(): boolean {
        mucRoom.updateComposingState(ChatState.Composing);
        return true;
    }

    function sendMessage() {
        if ($hasInProgressUploadingFile) {
            return false;
        }
        if (isMessageTooLong) {
            return false;
        }
        if ($hasErrorUploadingFile) {
            showErrorMessages();
            return false;
        }
        if (
            fileMessageManager.files.length === 0 &&
            (!htmlMessageText || htmlMessageText.replace(/\s/g, "").length === 0)
        ) {
            return false;
        }

        mucRoom.updateComposingState(ChatState.Paused);
        const message = htmlMessageText.replace(/<div>/g, "\n").replace(/(<([^>]+)>)/gi, "");
        if ($selectedMessageToReply) {
            sendReplyMessage(message);
        } else {
            mucRoom.sendMessage(message);
        }
        newMessageText = "";
        htmlMessageText = "";
        dispatch("scrollDown");
        setTimeout(() => dispatch("formHeight", messageForm.clientHeight), 0);
        return false;
    }

    function isMe(name: string) {
        return name === mucRoom.playerName;
    }

    function findUserInDefault(name: string): User | UserData | undefined {
        if (isMe(name)) {
            return $userStore;
        }
        const userData = $presenceStore.map((user) => get(user)).find((user) => user.name === name);
        let user = undefined;
        if (userData) {
            user = userData;
        }
        return user;
    }

    function getColor(name: string) {
        const user = findUserInDefault(name);
        if (user) {
            return user.color;
        } else {
            return defaultColor;
        }
    }

    function sendReplyMessage(message: string) {
        if (!$selectedMessageToReply) return;
        mucRoom.sendMessage(message, $selectedMessageToReply);
        selectedMessageToReply.set(null);
        return false;
    }

    function openEmoji() {
        picker.showPicker(emojiContainer);
        emojiOpened = true;
    }

    function handleInputFile(event: Event) {
        const files = (<HTMLInputElement>event.target).files;
        if (!files || files.length === 0) {
            filesUploadStore.set(new Map());
            return;
        }
        fileMessageManager.sendFiles(files).catch(() => {});
        (<HTMLInputElement>event.target).value = "";
        dispatch("formHeight", messageForm.clientHeight);
    }

    function handlerDeleteUploadedFile(file: FileExt | UploadedFile) {
        if (file instanceof UploadedFile) {
            fileMessageManager.deleteFile(file).catch(() => {});
        } else {
            //TODO manage promise listener to delete file
        }
        filesUploadStore.update((list) => {
            list.delete(file.name);
            return list;
        });
        dispatch("formHeight", messageForm.clientHeight);
    }

    function resend() {
        const files = (document.getElementById("file") as HTMLInputElement).files;
        if (!files) {
            console.info("No files uploaded");
            filesUploadStore.set(new Map());
            return;
        }
        fileMessageManager.sendFiles(files).catch(() => {});
    }

    function showErrorMessages() {
        if ($hasInProgressUploadingFile || !$hasErrorUploadingFile) {
            return;
        }
        const elements = document.getElementsByClassName("error-hover") as HTMLCollectionOf<HTMLElement>;
        for (const element of elements) {
            element.style.display = "flex";
        }
    }

    function analyseText() {
        mucRoom.updateComposingState(newMessageText === "" ? ChatState.Paused : ChatState.Composing);
        const values = newMessageText.match(regexUserTag);
        if (values != undefined) {
            const userNameSearching = (values.pop() as string).substring(1);
            usersSearching = $presenceStore
                .map((user) => get(user))
                .reduce((values: User[], user) => {
                    if (user.name.toLowerCase().indexOf(userNameSearching.toLowerCase()) === -1) {
                        return values;
                    }
                    values.push(user);
                    return values;
                }, []);
        } else {
            usersSearching = [];
        }
    }

    function addUserTag(user: User) {
        const values = newMessageText.match(regexUserTag) as string[];
        newMessageText = newMessageText.replace(values.pop() as string, `@${user.name}`);
        $mentionsUserStore.add(user);
        usersSearching = [];
        textarea.focus();
    }

    onMount(() => {
        dispatch("formHeight", messageForm.clientHeight);
        picker = new EmojiButton({
            styleProperties: {
                "--font": "Press Start 2P",
                "--background-color": "#23222c",
                "--text-color": "#ffffff",
                "--secondary-text-color": "#ffffff",
                "--category-button-color": "#ffffff",
                "--category-button-active-color": "#56eaff",
            },
            position: "bottom",
            emojisPerRow: 5,
            autoFocusSearch: false,
            showPreview: false,
            i18n: {
                search: $LL.emoji.search(),
                categories: {
                    recents: $LL.emoji.categories.recents(),
                    smileys: $LL.emoji.categories.smileys(),
                    people: $LL.emoji.categories.people(),
                    animals: $LL.emoji.categories.animals(),
                    food: $LL.emoji.categories.food(),
                    activities: $LL.emoji.categories.activities(),
                    travel: $LL.emoji.categories.travel(),
                    objects: $LL.emoji.categories.objects(),
                    symbols: $LL.emoji.categories.symbols(),
                    flags: $LL.emoji.categories.flags(),
                    custom: $LL.emoji.categories.custom(),
                },
                notFound: $LL.emoji.notFound(),
            },
        });

        picker.on("emoji", ({ emoji }) => {
            htmlMessageText += emoji;
        });
        picker.on("hidden", () => {
            emojiOpened = false;
        });
    });
</script>

<div class="wa-message-form" bind:this={messageForm}>
    {#if $selectedMessageToReply}
        <div class="replyMessage" on:click={() => selectedMessageToReply.set(null)}>
            <div
                style={`border-bottom-color:${getColor($selectedMessageToReply.name)}`}
                class={`tw-mr-9 tw-flex tw-items-end tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-0.5 ${
                    isMe($selectedMessageToReply.name) ? "tw-flex-row-reverse" : "tw-flex-row"
                }`}
            >
                <span class={`tw-text-lighter-purple ${isMe($selectedMessageToReply.name) ? "tw-ml-2" : "tw-mr-2"}`}
                    >{#if isMe($selectedMessageToReply.name)}{$LL.me()}{:else}{$selectedMessageToReply.name}{/if}</span
                >
                <span class="tw-text-xxxs"
                    >{$selectedMessageToReply.time.toLocaleTimeString($locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}</span
                >
            </div>
            <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between">
                <div class="tw-w-11/12 message tw-rounded-lg tw-bg-dark tw-text-xs tw-px-3 tw-py-2 tw-text-left">
                    <p class="tw-mb-0 tw-whitespace-pre-line tw-break-words">
                        {$selectedMessageToReply.body}
                    </p>
                    {#if $selectedMessageToReply && $selectedMessageToReply.links && $selectedMessageToReply.links.length > 0}
                        {#each $selectedMessageToReply.links as link}
                            <File url={link.url} name={link.description} />
                        {/each}
                    {/if}
                </div>
                <div class="close">
                    <XCircleIcon size="17" />
                </div>
            </div>
        </div>
    {/if}

    <div class="emote-menu-container">
        <div class="emote-menu" id="emote-picker" bind:this={emojiContainer} />
    </div>

    {#if usersSearching.length > 0}
        <div class="wa-dropdown-menu">
            {#each usersSearching as user}
                <span
                    class="wa-dropdown-item user-tag"
                    on:click|stopPropagation|preventDefault={() => addUserTag(user)}
                >
                    <img src={user.woka ?? defaultWoka} alt={`Woka of user: ${user.name}`} />
                    {user.name}
                </span>
            {/each}
        </div>
    {/if}

    <form on:submit|preventDefault={sendMessage}>
        <div class="tw-w-full tw-p-2">
            {#each [...$filesUploadStore.values()] as fileUploaded}
                <div
                    class="upload-file tw-flex tw-flex-wrap tw-bg-dark-blue/95 tw-rounded-3xl tw-text-xxs tw-justify-between tw-items-center tw-px-3 tw-mb-1"
                >
                    {#if fileUploaded.errorMessage !== undefined}
                        <div
                            class={`error-hover tw-flex tw-flex-wrap tw-bg-dark-blue/95 tw-rounded-3xl tw-text-xxs tw-justify-between tw-items-center tw-px-4 tw-py-2 ${
                                fileUploaded.errorCode === 423 && $me && $me.isAdmin
                                    ? "tw-text-orange"
                                    : "tw-text-pop-red"
                            } tw-absolute tw-w-full`}
                        >
                            <p class="tw-m-0">
                                {#if fileUploaded.errorMessage === "file-too-big"}
                                    {$LL.file.tooBig({
                                        fileName: fileUploaded.name,
                                        maxFileSize: fileUploaded.maxFileSize,
                                    })}
                                {:else if fileUploaded.errorMessage === "not-logged"}
                                    {$LL.file.notLogged()}
                                {:else if fileUploaded.errorMessage === "disabled"}
                                    {$LL.disabled()}
                                {/if}
                            </p>
                            {#if fileUploaded.errorMessage === "not-logged"}
                                <div
                                    class="tw-text-light-blue tw-cursor-pointer"
                                    on:click|preventDefault|stopPropagation={() => iframeListener.sendLogin()}
                                >
                                    <ArrowRightCircleIcon size="14" />
                                </div>
                            {/if}
                            {#if fileUploaded.errorCode === 423 && $me && $me.isAdmin}
                                <button
                                    class="tw-text-orange tw-font-bold tw-underline tw-m-auto"
                                    on:click={() => iframeListener.sendRedirectPricing()}
                                >
                                    <img alt="Crown logo" src={crown} class="tw-mr-1" />
                                    {$LL.upgrade()}
                                </button>
                            {/if}
                        </div>
                    {/if}
                    <div
                        style="max-width: 92%; display: flex; flex-wrap: nowrap;"
                        class="tw-flex tw-flex-wrap tw-text-xxs tw-items-center"
                    >
                        {#if fileUploaded.uploadState === uploadingState.finish}
                            <CheckIcon size="14" class="tw-text-pop-green" />
                        {:else if fileUploaded.uploadState === uploadingState.error}
                            <div
                                class="alert-upload tw-cursor-pointer"
                                on:click|preventDefault|stopPropagation={() => resend()}
                            >
                                <AlertCircleIcon size="14" />
                            </div>
                        {:else}
                            <LoaderIcon size="14" class="tw-animate-spin" />
                        {/if}
                        <span class="tw-ml-1 tw-max-w-full tw-text-ellipsis tw-overflow-hidden tw-whitespace-nowrap">
                            {fileUploaded.name}
                        </span>
                    </div>
                    <button
                        on:click|preventDefault|stopPropagation={() => {
                            handlerDeleteUploadedFile(fileUploaded);
                        }}
                        class="delete tw-pr-0 tw-mr-0"
                    >
                        <Trash2Icon size="14" />
                    </button>
                </div>
            {/each}
            {#if informationMessage}
                <div
                    class="tw-flex tw-flex-wrap tw-bg-dark-blue/95 tw-rounded-3xl tw-py-2 tw-text-xs tw-items-center tw-px-4 tw-text-orange tw-w-full tw-mb-1 tw-cursor-pointer"
                    on:click|preventDefault|stopPropagation={() => (informationMessage = null)}
                >
                    <div class="tw-text-orange tw-mr-1.5">
                        <AlertCircleIcon size="16" />
                    </div>
                    <p class="tw-m-0">
                        {informationMessage}
                    </p>
                </div>
            {/if}
            <div class="tw-relative">
                <div
                    contenteditable="true"
                    bind:this={textarea}
                    bind:textContent={newMessageText}
                    bind:innerHTML={htmlMessageText}
                    data-placeholder={$LL.enterText()}
                    on:input={onInput}
                    on:keydown={onKeyDown}
                    on:keypress={onKeyPress}
                />
                <div class="actions tw-absolute tw-right-4">
                    <div class="tw-flex tw-items-center tw-space-x-1">
                        <button
                            class={`tw-bg-transparent tw-p-0 tw-m-0 tw-inline-flex tw-justify-center tw-items-center ${
                                emojiOpened ? "tw-text-light-blue" : ""
                            }`}
                            on:click|preventDefault|stopPropagation={openEmoji}
                        >
                            <SmileIcon size="17" />
                        </button>
                        {#if $enableChatUpload}
                            <input
                                type="file"
                                id="file"
                                name="file"
                                class="tw-hidden"
                                on:input={handleInputFile}
                                multiple
                            />
                            <label for="file" class="tw-m-0 tw-cursor-pointer"><PaperclipIcon size="17" /></label>
                        {:else}
                            <button
                                id="file"
                                class={`tw-bg-transparent tw-p-0 tw-m-0 tw-inline-flex tw-justify-center tw-items-center tw-opacity-50`}
                                on:click|preventDefault|stopPropagation={() =>
                                    (informationMessage = $LL.disabledByAdmin())}
                            >
                                <PaperclipIcon size="17" />
                            </button>
                        {/if}
                        <button
                            id="send"
                            type="submit"
                            class={`${
                                !$hasErrorUploadingFile && !$hasInProgressUploadingFile && !isMessageTooLong
                                    ? "can-send"
                                    : "cant-send"
                            } tw-bg-transparent tw-p-0 tw-m-0 tw-inline-flex tw-justify-center tw-items-center tw-text-light-blue`}
                            on:mouseover={showErrorMessages}
                            on:focus={showErrorMessages}
                            on:click={sendMessage}
                        >
                            {#if $hasErrorUploadingFile || isMessageTooLong}
                                <AlertCircleIcon size="17" class="tw-text-pop-red" />
                            {:else if $hasInProgressUploadingFile}
                                <LoaderIcon size="17" class="tw-animate-spin" />
                            {:else}
                                <SendIcon size="17" />
                            {/if}
                        </button>
                    </div>
                    {#if isMessageTooLong}
                        <div class="tw-text-pop-red tw-text-xs tw-font-bold tw-text-right tw-mt-5">
                            {maxCharMessage - newMessageText.length}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </form>
</div>

<style lang="scss">
    .replyMessage {
        padding: 0 20px;
        margin: 0;
        position: relative;

        .close {
            color: rgb(146 142 187);
            &:hover {
                color: rgb(255 71 90);
            }
        }

        &::after {
            //content: "x";
            width: 20px;
            height: 20px;
            cursor: pointer;
            color: white;
            font-size: 12px;
            position: absolute;
            top: 0;
            right: 4px;
            border: solid 1px white;
            text-align: center;
            border-radius: 99%;
        }

        .message {
            opacity: 1;
        }

        &:hover {
            cursor: pointer;
            .close {
                color: rgb(255 71 90);
            }
        }
    }

    .wa-dropdown-menu {
        margin: 0 0 0 10px;
        position: relative;
        width: 94%;
        max-height: 50vh;
        overflow-y: auto;
        overflow-x: hidden;

        .wa-dropdown-item.user-tag {
            img {
                height: 22px;
                width: 22px;
                object-fit: contain;
                margin-right: 6px;
            }
            &:active,
            &:focus {
                --tw-bg-opacity: 1;
                background-color: rgb(77 75 103 / var(--tw-bg-opacity));
            }
        }
    }

    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;
        // button {
        //     background-color: #254560;
        //     border-bottom-right-radius: 4px;
        //     border-top-right-radius: 4px;
        //     border: none;
        //     border-left: solid white 1px;
        //     font-size: 16px;
        // }

        .actions {
            top: 5px;
        }

        .alert-upload {
            --tw-text-opacity: 1;
            color: rgb(255 71 90 / var(--tw-text-opacity));
        }
        .upload-file {
            position: relative;
            display: flex;
            flex-wrap: nowrap;
            .error-hover {
                display: none;
                left: 0;
                min-height: 30px;
                bottom: 35px;
            }
            button {
                min-height: 0;
                cursor: pointer;
            }
            &:hover {
                .error-hover {
                    display: flex;
                }
            }
        }
    }
</style>
