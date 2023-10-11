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
    import { createEventDispatcher, onMount } from "svelte";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import { UserData } from "@workadventure/messages";
    import { ChatState } from "stanza/Constants";
    import { get, writable } from "svelte/store";
    import {
        EraserException,
        EraserService,
        GoogleWorkSpaceException,
        GoogleWorkSpaceService,
        KlaxoonEvent,
        KlaxoonException,
        KlaxoonService,
        YoutubeService,
    } from "@workadventure/shared-utils";
    import { MucRoom } from "../Xmpp/MucRoom";
    import { defaultWoka, User } from "../Xmpp/AbstractRoom";
    import { LL, locale } from "../i18n/i18n-svelte";
    import {
        selectedMessageToReply,
        filesUploadStore,
        hasErrorUploadingFile,
        hasInProgressUploadingFile,
        mentionsUserStore,
        enableChatUpload,
    } from "../Stores/ChatStore";
    import { userStore } from "../Stores/LocalUserStore";
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { FileExt, fileMessageManager, UploadedFile, uploadingState } from "../Services/FileMessageManager";
    import crown from "../../public/static/svg/icone-premium-crown.svg";
    import { iframeListener } from "../IframeListener";
    import { chatConnectionManager } from "../Connection/ChatConnectionManager";
    import File from "./Content/File.svelte";
    import ApplicationPicker from "./Content/ApplicationPicker.svelte";

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
    let applicationMenuIsOpenned = false;

    interface Application {
        name: string;
        icon: string;
        example: string;
        description: string;
        image?: string;
        link?: string;
        error?: string;
    }
    const applicationsSelected = writable<Set<Application>>(new Set());
    const applications = writable<Set<Application>>(new Set());

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
        if (fileMessageManager.files.length > 0 || (htmlMessageText && htmlMessageText.replace(/\s/g, "").length > 0)) {
            mucRoom.updateComposingState(ChatState.Paused);
            const message = htmlMessageText
                .replace(/<div>/g, "\n")
                .replace(/(<([^>]+)>)/gi, "")
                .replace(/&nbsp;/g, " ")
                .trim();

            if ($selectedMessageToReply) {
                sendReplyMessage(message);
            } else {
                mucRoom.sendMessage(message);
            }
            newMessageText = "";
            htmlMessageText = "";
            dispatch("scrollDown");
            setTimeout(() => {
                textarea.innerHTML = "";
                dispatch("formHeight", messageForm.clientHeight);
            }, 0);
        }

        if ($applicationsSelected.size > 0) {
            for (const app of $applicationsSelected) {
                if (app.link != undefined) {
                    mucRoom.sendMessage(app.link);
                }
                applicationsSelected.update((apps) => {
                    apps.delete(app);
                    return apps;
                });
            }
        }

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

    function toggleApplicationMenu() {
        applicationMenuIsOpenned = !applicationMenuIsOpenned;
    }

    function addNewApp(app: Application) {
        applicationsSelected.update((apps) => {
            apps.add(app);
            return apps;
        });
        if (app.name === "Klaxoon") {
            if (!chatConnectionManager.klaxoonToolClientId) return;
            KlaxoonService.openKlaxoonActivityPicker(
                chatConnectionManager.klaxoonToolClientId,
                (event: KlaxoonEvent) => {
                    // Remove previous app
                    applicationsSelected.update((apps) => {
                        apps.delete(app);
                        return apps;
                    });
                    // Update app with Klaxoon's Activity Picker
                    app.link = KlaxoonService.getKlaxoonEmbedUrl(
                        new URL(event.url),
                        chatConnectionManager.klaxoonToolClientId
                    );
                    if (event.imageUrl) app.image = event.imageUrl;
                    // Add new app
                    applicationsSelected.update((apps) => {
                        apps.add(app);
                        return apps;
                    });
                }
            );
        }
        applicationMenuIsOpenned = false;
    }

    function deleteApplication(app: Application) {
        applicationsSelected.update((apps) => {
            apps.delete(app);
            return apps;
        });
    }

    async function checkWebsiteProperty(app: Application): Promise<void> {
        app.error = undefined;
        if (app.link == undefined) return;
        switch (app.name) {
            case "Klaxoon":
                try {
                    app.link = KlaxoonService.getKlaxoonEmbedUrl(new URL(app.link));
                } catch (err) {
                    if (err instanceof KlaxoonException.KlaxoonException) {
                        app.error = $LL.form.application.klaxoon.error();
                    } else {
                        app.error = $LL.form.application.weblink.error();
                    }
                    app.link = undefined;
                }
                break;
            case "Youtube":
                try {
                    const oldLink = app.link;
                    const newLink = await YoutubeService.getYoutubeEmbedUrl(new URL(app.link));
                    if (app.link === oldLink) {
                        app.link = newLink;
                    }
                } catch (e) {
                    console.info($LL.form.application.youtube.error(), e);
                    app.error = $LL.form.application.youtube.error();
                    app.link = undefined;
                }
                break;
            case "Google Docs":
                try {
                    app.link = GoogleWorkSpaceService.getGoogleDocsEmbedUrl(new URL(app.link));
                } catch (err) {
                    if (err instanceof GoogleWorkSpaceException.GoogleDocsException) {
                        app.error = $LL.form.application.googleDocs.error();
                    } else {
                        app.error = $LL.form.application.weblink.error();
                    }
                    app.link = undefined;
                }
                break;
            case "Google Sheets":
                try {
                    app.link = GoogleWorkSpaceService.getGoogleSheetsEmbedUrl(new URL(app.link));
                } catch (err) {
                    console.error(err);
                    if (err instanceof GoogleWorkSpaceException.GoogleSheetsException) {
                        app.error = $LL.form.application.googleSheets.error();
                    } else {
                        app.error = $LL.form.application.weblink.error();
                    }
                    app.link = undefined;
                }
                break;
            case "Google Slides":
                try {
                    app.link = GoogleWorkSpaceService.getGoogleSlidesEmbedUrl(new URL(app.link));
                } catch (err) {
                    if (err instanceof GoogleWorkSpaceException.GoogleSlidesException) {
                        app.error = $LL.form.application.googleSlides.error();
                    } else {
                        app.error = $LL.form.application.weblink.error();
                    }
                    app.link = undefined;
                }
                break;
            case "Eraser":
                try {
                    EraserService.validateEraserLink(new URL(app.link));
                } catch (err) {
                    if (err instanceof EraserException.EraserLinkException) {
                        app.error = $LL.form.application.eraser.error();
                    } else {
                        app.error = $LL.form.application.weblink.error();
                    }
                    app.link = undefined;
                }
                break;
            default:
                throw new Error("Application not found");
        }
        applicationsSelected.update((apps) => {
            apps.add(app);
            return apps;
        });
    }

    function handlerKeyDownAppInput(keyPressEvent: KeyboardEvent) {
        if (keyPressEvent.key === "Enter" && !keyPressEvent.shiftKey) {
            // blur element from keyPressEvent
            (keyPressEvent.target as HTMLInputElement).blur();
            keyPressEvent.preventDefault();
        }
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

        if (chatConnectionManager.klaxoonToolIsActivated) {
            applications.update((apps) => {
                apps.add({
                    name: "Klaxoon",
                    icon: "./static/images/applications/klaxoon.svg",
                    example: "https://klaxoon.com/fr",
                    description: $LL.form.application.klaxoon.description(),
                });
                return apps;
            });
        }
        if (chatConnectionManager.youtubeToolIsActivated) {
            applications.update((apps) => {
                apps.add({
                    name: "Youtube",
                    icon: "./static/images/applications/youtube.svg",
                    example: "https://www.youtube.com/watch?v=Y9ubBWf5w20",
                    description: $LL.form.application.youtube.description(),
                });
                return apps;
            });
        }
        if (chatConnectionManager.googleDocsToolIsActivated) {
            applications.update((apps) => {
                apps.add({
                    name: "Google Docs",
                    icon: "./static/images/applications/google-docs.svg",
                    example: "https://docs.google.com/document/d/1iFHmKL4HJ6WzvQI-6FlyeuCy1gzX8bWQ83dNlcTzigk/edit",
                    description: $LL.form.application.googleDocs.description(),
                });
                return apps;
            });
        }
        if (chatConnectionManager.googleSheetsToolIsActivated) {
            applications.update((apps) => {
                apps.add({
                    name: "Google Sheets",
                    icon: "./static/images/applications/google-sheets.svg",
                    example: "https://docs.google.com/spreadsheets/d/1SBIn3IBG30eeq944OhT4VI_tSg-b1CbB0TV0ejK70RA/edit",
                    description: $LL.form.application.googleSheets.description(),
                });
                return apps;
            });
        }
        if (chatConnectionManager.googleSlidesToolIsActivated) {
            applications.update((apps) => {
                apps.add({
                    name: "Google Slides",
                    icon: "./static/images/applications/google-slides.svg",
                    example: "https://docs.google.com/presentation/d/1fU4fOnRiDIvOoVXbksrF2Eb0L8BYavs7YSsBmR_We3g/edit",
                    description: $LL.form.application.googleSlides.description(),
                });
                return apps;
            });
        }
        if (chatConnectionManager.eraserToolIsActivated) {
            applications.update((apps) => {
                apps.add({
                    name: "Eraser",
                    icon: "./static/images/applications/eraser.svg",
                    example: "https://app.eraser.io/workspace/ExSd8Z4wPsaqMMgTN4VU",
                    description: $LL.form.application.eraser.description(),
                });
                return apps;
            });
        }
    });

    /* eslint-disable svelte/require-each-key */
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
                        {#each $selectedMessageToReply.links as link (link.url)}
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
            {#each usersSearching as user (user.jid)}
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

    {#each [...$applicationsSelected] as app (app.name)}
        <div
            class="tw-flex tw-flex-column tw-items-center tw-justify-center tw-mx-12 tw-mb-2 tw-p-3 tw-flex tw-flex-wrap tw-rounded-xl tw-text-xxs tw-bottom-12"
            style="backdrop-filter: blur(30px);border: solid 1px rgb(27 27 41);"
        >
            <div class="tw-flex tw-flex-row tw-justify-between tw-items-center tw-m-1 tw-w-full">
                <label for="app" class="tw-m-0">
                    <img src={app.icon} alt={`App ${app.name} started in the chat`} width="20px" />
                    {app.description}
                </label>
                <button
                    on:click|preventDefault|stopPropagation={() => {
                        deleteApplication(app);
                    }}
                    class="delete tw-pr-0 tw-mr-0"
                >
                    <Trash2Icon size="14" />
                </button>
            </div>
            <input
                id="app"
                type="text"
                placeholder={app.example}
                class="tw-bg-transparent tw-text-light-blue tw-w-full tw-py-1 tw-px-2 tw-mb-0 tw-text-sm tw-border-white"
                bind:value={app.link}
                on:keypress={handlerKeyDownAppInput}
                on:blur={() => checkWebsiteProperty(app)}
            />
            {#if app.image}
                <img class="tw-m-4" src={app.image} alt={`App ${app.name} preview`} width="100px" />
            {/if}
            {#if app.error}
                <p class="tw-text-pop-red tw-text-xs tw-px-2 tw-mt-2 tw-my-0">{app.error}</p>
            {/if}
        </div>
    {/each}

    {#if applicationMenuIsOpenned}
        <ApplicationPicker applications={$applications} on:addNewApp={(event) => addNewApp(event.detail)} />
    {/if}

    <form on:submit|preventDefault={sendMessage}>
        <div class="tw-w-full tw-p-2">
            {#each [...$filesUploadStore.values()] as fileUploaded}
                <div
                    class="upload-file tw-flex tw-flex-wrap tw-rounded-3xl tw-text-xxs tw-justify-between tw-items-center tw-mx-6 tw-px-3 tw-mb-1"
                    style="backdrop-filter: blur(30px);border: solid 1px rgb(27 27 41);"
                >
                    {#if fileUploaded.errorMessage !== undefined}
                        <div
                            class={`error-hover tw-flex tw-flex-wrap tw-bg-dark-blue/95 tw-rounded-3xl tw-text-xxs tw-justify-between tw-items-center tw-px-4 tw-py-2 ${
                                fileUploaded.errorCode === 423 && $me && $me.isAdmin
                                    ? "tw-text-warning"
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
                                    class="tw-text-warning tw-font-bold tw-underline tw-m-auto"
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
                    class="tw-flex tw-flex-wrap tw-bg-dark-blue/95 tw-rounded-3xl tw-py-2 tw-text-xs tw-items-center tw-px-4 tw-text-warning tw-w-full tw-mb-1 tw-cursor-pointer"
                    on:click|preventDefault|stopPropagation={() => (informationMessage = null)}
                >
                    <div class="tw-text-warning tw-mr-1.5">
                        <AlertCircleIcon size="16" />
                    </div>
                    <p class="tw-m-0">
                        {informationMessage}
                    </p>
                </div>
            {/if}

            <div class="tw-w-full tw-px-2 tw-pb-2 tw-flex tw-flex-row tw-justify-center tw-items-center">
                <div class="actions tw-px-2 tw-py-2">
                    <div class="tw-flex tw-items-center tw-space-x-1">
                        <button
                            id="application"
                            class="tw-bg-transparent tw-p-0 tw-m-0 tw-inline-flex tw-justify-center tw-items-center"
                            on:click|preventDefault|stopPropagation={toggleApplicationMenu}
                            disabled={$applications.size === 0}
                        >
                            <img
                                src={`./static/images/applications/app${applicationMenuIsOpenned ? "On" : "Off"}.png`}
                                alt="send"
                                width="17px"
                            />
                        </button>
                    </div>
                </div>
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
                <div class="actions tw-px-2 tw-py-2">
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

    input#app {
        margin-bottom: 0;
    }
</style>
