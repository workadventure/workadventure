<script lang="ts">
    import { fly } from "svelte/transition";
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
    import { ChatStates, MucRoom, User } from "../Xmpp/MucRoom";
    import LL, { locale } from "../i18n/i18n-svelte";
    import { createEventDispatcher, onMount } from "svelte";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import {
        selectedMessageToReply,
        filesUploadStore,
        hasErrorUploadingFile,
        hasInProgressUploadingFile,
        mentionsUserStore,
    } from "../Stores/ChatStore";
    import { UserData } from "../Messages/JsonMessages/ChatData";
    import { userStore } from "../Stores/LocalUserStore";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { FileExt, fileMessageManager, UploadedFile, uploadingState } from "../Services/FileMessageManager";
    import File from "./Content/File.svelte";
    import crown from "../../public/static/svg/icone-premium-crown.svg";
    import { iframeListener } from "../IframeListener";
    import { ADMIN_API_URL, ENABLE_CHAT_UPLOAD } from "../Enum/EnvironmentVariable";

    export let mucRoom: MucRoom;

    const dispatch = createEventDispatcher();

    let emojiContainer: HTMLElement;
    let picker: EmojiButton;
    let textarea: HTMLTextAreaElement;

    let emojiOpened = false;
    let newMessageText = "";
    let usersSearching: User[] = [];

    const maxCharMessage = 10_000;
    $: isMessageTooLong = newMessageText.length > maxCharMessage;

    export const defaultColor = "#626262";
    // Negative lookbehind doesn't work on Safari browser
    // const regexUserTag = /(?<![\w@])@([\w@]+(?:[.!][\w@]+)*)+$/gm;
    const regexUserTag = /@([\w@]+(?:[.!][\w@]+)*)+$/gm;

    $: presenseStore = mucRoomsStore.getDefaultRoom()?.getPresenceStore() ?? mucRoom.getPresenceStore();

    function onFocus() {}
    function onBlur() {}

    function adjustHeight() {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
    }

    function sendMessage() {
        if ($hasInProgressUploadingFile) {
            return;
        }
        if (isMessageTooLong) {
            //return;
        }
        if ($hasErrorUploadingFile) {
            showErrorMessages();
            return;
        }
        if (
            fileMessageManager.files.length === 0 &&
            (!newMessageText || newMessageText.replace(/\s/g, "").length === 0)
        )
            return;
        if ($selectedMessageToReply) {
            sendReplyMessage();
            return false;
        }
        mucRoom.updateComposingState(ChatStates.PAUSED);
        mucRoom.sendMessage(newMessageText);
        newMessageText = "";
        dispatch("scrollDown");
        return false;
    }

    function isMe(name: string) {
        return name === mucRoom.getPlayerName();
    }

    function findUserInDefault(name: string): User | UserData | undefined {
        if (isMe(name)) {
            return $userStore;
        }
        const userData = [...$presenseStore].map(([, user]) => user).find((user) => user.name === name);
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

    function sendReplyMessage() {
        if (!$selectedMessageToReply || !newMessageText || newMessageText.replace(/\s/g, "").length === 0) return;
        mucRoom.updateComposingState(ChatStates.PAUSED);
        mucRoom.sendMessage(newMessageText, $selectedMessageToReply);
        selectedMessageToReply.set(null);
        newMessageText = "";
        dispatch("scrollDown");
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
        if (newMessageText === "") {
            mucRoom.updateComposingState(ChatStates.PAUSED);
        } else {
            mucRoom.updateComposingState(ChatStates.COMPOSING);
        }

        const values = newMessageText.match(regexUserTag);
        if (values != undefined) {
            const userNameSearching = (values.pop() as string).substring(1);
            usersSearching = [...$presenseStore]
                .map(([, user]) => user)
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

    function onKeyDown(key: KeyboardEvent): boolean {
        if ((key.key === "Enter" && key.shiftKey) || ["Backspace", "Delete"].includes(key.key)) {
            setTimeout(() => adjustHeight(), 10);
        }
        if (key.key === "Enter" && !key.shiftKey) {
            sendMessage();
            setTimeout(() => (newMessageText = ""), 10);
            return false;
        }
        return true;
    }

    function onKeyPress(): boolean {
        adjustHeight();
        mucRoom.updateComposingState(ChatStates.COMPOSING);
        return true;
    }

    function onKeyUp() {
        adjustHeight();
    }

    function addUserTag(user: User) {
        const values = newMessageText.match(regexUserTag) as string[];
        newMessageText = newMessageText.replace(values.pop() as string, `@${user.name} `);
        $mentionsUserStore.add(user);
        usersSearching = [];
        textarea.focus();
    }

    onMount(() => {
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
            style: "twemoji",
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
            newMessageText += emoji;
        });
        picker.on("hidden", () => {
            emojiOpened = false;
        });
    });
</script>

<div class="wa-message-form">
    {#if $selectedMessageToReply}
        <div
            class="replyMessage"
            on:click={() => selectedMessageToReply.set(null)}
            transition:fly={{
                x: isMe($selectedMessageToReply.name) ? 10 : -10,
                delay: 100,
                duration: 200,
            }}
        >
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
                    {#if $selectedMessageToReply && $selectedMessageToReply.files && $selectedMessageToReply.files.length > 0}
                        {#each $selectedMessageToReply.files as file}
                            <!-- File message -->
                            <File {file} />
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
                    <img src={user.woka} alt={`Woka svg of user: ${user.name}`} />
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
                                fileUploaded.errorCode === 423 && mucRoom.getMe()?.isAdmin
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
                            {#if fileUploaded.errorCode === 423 && mucRoom.getMe()?.isAdmin}
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
            <div class="tw-flex tw-items-end tw-relative">
                <div class="tw-relative tw-w-full">
                    {#if isMessageTooLong}
                        <div
                            class="tw-text-pop-red tw-text-xxxs tw-absolute tw-right-4 tw-font-bold"
                            style="bottom: -9px;"
                        >
                            {newMessageText.length}/{maxCharMessage}
                        </div>
                    {/if}
                    <textarea
                        type="text"
                        bind:this={textarea}
                        bind:value={newMessageText}
                        placeholder={$LL.enterText()}
                        on:input={analyseText}
                        on:focus={onFocus}
                        on:blur={onBlur}
                        on:keydown={onKeyDown}
                        on:keyup={onKeyUp}
                        on:keypress={onKeyPress}
                        rows="1"
                        style="margin-bottom: 0;"
                        class="tw-w-full"
                    />
                </div>

                <button
                    class={`tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 ${
                        emojiOpened ? "tw-text-light-blue" : ""
                    }`}
                    on:click|preventDefault|stopPropagation={openEmoji}
                >
                    <SmileIcon size="17" />
                </button>
                {#if ENABLE_CHAT_UPLOAD || ADMIN_API_URL}
                    <input type="file" id="file" name="file" class="tw-hidden" on:input={handleInputFile} multiple />
                    <label
                        for="file"
                        class="tw-px-1 tw-py-1 tw-mx-0.5 tw-my-1 tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-cursor-pointer"
                        ><PaperclipIcon size="17" /></label
                    >
                {/if}
                <button
                    id="send"
                    type="submit"
                    class={`${
                        !$hasErrorUploadingFile && !$hasInProgressUploadingFile && !isMessageTooLong
                            ? "can-send"
                            : "cant-send"
                    } tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 tw-text-light-blue`}
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
        width: fit-content;
        min-width: auto;

        .wa-dropdown-item.user-tag {
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
