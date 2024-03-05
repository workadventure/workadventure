<script lang="ts">
    import { PaperclipIcon, LoaderIcon, Trash2Icon, AlertCircleIcon, ArrowRightCircleIcon } from "svelte-feather-icons";
    import { createEventDispatcher, onMount } from "svelte";
    import { EmojiButton } from "@joeattardi/emoji-button";
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
    import { mucRoomsStore } from "../Stores/MucRoomsStore";
    import { FileExt, fileMessageManager, UploadedFile, uploadingState } from "../Services/FileMessageManager";
    import crown from "../../public/static/svg/icone-premium-crown.svg";
    import { iframeListener } from "../IframeListener";
    import { chatConnectionManager } from "../Connection/ChatConnectionManager";
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
                "--font": "Roboto Condensed",
                "--text-color": "#ffffff",
                "--secondary-text-color": "#ffffff",
                "--category-button-color": "#ffffff",
                "--category-button-active-color": "rgb(103, 233, 123)",
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

<div class="wa-message-form fixed bottom-0 w-full z-20" bind:this={messageForm}>
    {#if $selectedMessageToReply}
        <div class="replyMessage w-full bg-secondary relative" on:click={() => selectedMessageToReply.set(null)}>
            <div class="flex flex-wrap items-center justify-between">
                <div class="grow message text-xs px-4 py-2 text-left w-full pr-12">
                    <div class="flex items-end justify-between text-xxs">
                        <span class="text-white opacity-50">
                            {#if isMe($selectedMessageToReply.name)}{$LL.me()}{:else}{$selectedMessageToReply.name}{/if}
                            -
                            {$selectedMessageToReply.time.toLocaleTimeString($locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                    <div class="mb-0 whitespace-pre-line break-words flex">
                        <div class="mr-1 opacity-50">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-corner-down-right"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M6 6v6a3 3 0 0 0 3 3h10l-4 -4m0 8l4 -4" />
                            </svg>
                        </div>
                        <div class="truncate">
                            {$selectedMessageToReply.body}
                        </div>
                    </div>
                    {#if $selectedMessageToReply && $selectedMessageToReply.links && $selectedMessageToReply.links.length > 0}
                        {#each $selectedMessageToReply.links as link (link.url)}
                            <div class="flex pt-2">
                                <div class="px-1 aspect-square h-6 w-6 opacity-30">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        class="icon icon-tabler icon-tabler-paperclip s-58EZrIzJfOBz"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        stroke-width="1.5"
                                        stroke="#ffffff"
                                        fill="none"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none" class="s-58EZrIzJfOBz" />
                                        <path
                                            d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"
                                            class="s-58EZrIzJfOBz"
                                        />
                                    </svg>
                                </div>
                                <a
                                    href={link.url}
                                    target="_blank"
                                    class="no-underline text-white ml-3 max-w-full text-ellipsis overflow-hidden whitespace-nowrap hover:underline"
                                >
                                    {link.description}
                                </a>
                            </div>
                        {/each}
                    {/if}
                </div>
                <div
                    class="close absolute right-0 top-0 bottom-0 m-auto h-full w-9 hover:bg-white/10 text-center flex items-center justify-center"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="mt-1 icon icon-tabler icon-tabler-x s-58EZrIzJfOBz"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" class="s-58EZrIzJfOBz" /><path
                            d="M18 6l-12 12"
                            class="s-58EZrIzJfOBz"
                        />
                        <path d="M6 6l12 12" class="s-58EZrIzJfOBz" />
                    </svg>
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
            class="flex flex-column items-center justify-center mx-12 mb-2 p-3 flex flex-wrap rounded-xl text-xxs bottom-12"
            style="backdrop-filter: blur(30px);border: solid 1px rgb(27 27 41);"
        >
            <div class="flex flex-row justify-between items-center m-1 w-full">
                <label for="app" class="m-0">
                    <img src={app.icon} alt={`App ${app.name} started in the chat`} width="20px" />
                    {app.description}
                </label>
                <button
                    on:click|preventDefault|stopPropagation={() => {
                        deleteApplication(app);
                    }}
                    class="delete pr-0 mr-0"
                >
                    <Trash2Icon size="14" />
                </button>
            </div>
            <input
                id="app"
                type="text"
                placeholder={app.example}
                class="bg-transparent text-light-blue w-full py-1 px-2 mb-0 text-sm border-white"
                bind:value={app.link}
                on:keypress={handlerKeyDownAppInput}
                on:blur={() => checkWebsiteProperty(app)}
            />
            {#if app.image}
                <img class="m-4" src={app.image} alt={`App ${app.name} preview`} width="100px" />
            {/if}
            {#if app.error}
                <p class="text-pop-red text-xs px-2 mt-2 my-0">{app.error}</p>
            {/if}
        </div>
    {/each}

    {#if applicationMenuIsOpenned}
        <ApplicationPicker applications={$applications} on:addNewApp={(event) => addNewApp(event.detail)} />
    {/if}

    <form on:submit|preventDefault={sendMessage}>
        <div class="w-full  ">
            {#each [...$filesUploadStore.values()] as fileUploaded}
                <div
                    class="upload-file flex flex-wrap text-xs justify-between items-center px-4 py-2 relative bg-secondary"
                >
                    {#if fileUploaded.errorMessage !== undefined}
                        <div
                            class={`error-hover flex flex-wrap bg-dark-blue/95 rounded-3xl text-xxs justify-between items-center px-4 py-2 ${
                                fileUploaded.errorCode === 423 && $me && $me.isAdmin ? "text-warning" : "text-pop-red"
                            } absolute w-full`}
                        >
                            <p class="m-0">
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
                                    class="text-light-blue cursor-pointer"
                                    on:click|preventDefault|stopPropagation={() => iframeListener.sendLogin()}
                                >
                                    <ArrowRightCircleIcon size="14" />
                                </div>
                            {/if}
                            {#if fileUploaded.errorCode === 423 && $me && $me.isAdmin}
                                <button
                                    class="text-warning font-bold underline m-auto"
                                    on:click={() => iframeListener.sendRedirectPricing()}
                                >
                                    <img alt="Crown logo" src={crown} class="mr-1" />
                                    {$LL.upgrade()}
                                </button>
                            {/if}
                        </div>
                    {/if}
                    <div
                        style="max-width: 92%; display: flex; flex-wrap: nowrap;"
                        class="flex flex-wrap text-xxs items-center"
                    >
                        {#if fileUploaded.uploadState === uploadingState.finish}
                            <div class="px-1 aspect-square h-6 w-6 opacity-30">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-paperclip s-58EZrIzJfOBz"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="#ffffff"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" class="s-58EZrIzJfOBz" />
                                    <path
                                        d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"
                                        class="s-58EZrIzJfOBz"
                                    />
                                </svg>
                            </div>
                        {:else if fileUploaded.uploadState === uploadingState.error}
                            <div
                                class="alert-upload cursor-pointer"
                                on:click|preventDefault|stopPropagation={() => resend()}
                            >
                                <AlertCircleIcon size="14" />
                            </div>
                        {:else}
                            <LoaderIcon size="14" class="animate-spin" />
                        {/if}
                        <span class="ml-3 max-w-full text-ellipsis overflow-hidden whitespace-nowrap">
                            {fileUploaded.name}
                        </span>
                        <button
                            on:click|preventDefault|stopPropagation={() => {
                                handlerDeleteUploadedFile(fileUploaded);
                            }}
                            class="delete p-0 m-0 absolute right-0 top-0 h-full w-9 hover:bg-white/10 text-center"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="mt-1 icon icon-tabler icon-tabler-x"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M18 6l-12 12" />
                                <path d="M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            {/each}
            {#if informationMessage}
                <div
                    class="flex flex-wrap bg-dark-blue/95 rounded-3xl py-2 text-xs items-center px-4 text-warning w-full mb-1 cursor-pointer"
                    on:click|preventDefault|stopPropagation={() => (informationMessage = null)}
                >
                    <div class="text-warning mr-1.5">
                        <AlertCircleIcon size="16" />
                    </div>
                    <p class="m-0">
                        {informationMessage}
                    </p>
                </div>
            {/if}

            <div
                class="w-full px-2 py-2 flex flex-row justify-center items-center bg-contrast/80 border-x-0 border-b-0 border-t border-solid border-white/30 backdrop-blur"
            >
                <div class="actions px-2 py-2">
                    <div class="flex items-center space-x-1">
                        <button
                            id="application"
                            class="bg-transparent p-0 m-0 inline-flex justify-center items-center"
                            on:click|preventDefault|stopPropagation={toggleApplicationMenu}
                            disabled={$applications.size === 0}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-apps"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path
                                    d="M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
                                />
                                <path
                                    d="M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
                                />
                                <path
                                    d="M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"
                                />
                                <path d="M14 7l6 0" />
                                <path d="M17 4l0 6" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="relative grow">
                    <div
                        contenteditable="true"
                        bind:this={textarea}
                        bind:textContent={newMessageText}
                        bind:innerHTML={htmlMessageText}
                        data-placeholder={$LL.enterText()}
                        on:input={onInput}
                        on:keydown={onKeyDown}
                        on:keypress={onKeyPress}
                        class="bg-contrast rounded border border-solid border-white/20 px-4 py-2 focus:outline-secondary"
                    />
                    <button
                        class="bg-transparent p-0 m-0 inline-flex justify-center items-center absolute right-2 top-0 bottom-0 m-auto opacity-50 hover:opacity-100 cursor-pointer {emojiOpened
                            ? 'text-light-blue'
                            : ''}"
                        on:click|preventDefault|stopPropagation={openEmoji}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-mood-smile"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                            <path d="M9 10l.01 0" />
                            <path d="M15 10l.01 0" />
                            <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                        </svg>
                    </button>
                    {#if $enableChatUpload}
                        <input type="file" id="file" name="file" class="hidden" on:input={handleInputFile} multiple />
                        <label
                            for="file"
                            class="bg-transparent p-0 m-0 inline-flex justify-center items-center absolute right-10 top-0 bottom-0 m-auto opacity-50 hover:opacity-100 cursor-pointer"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-paperclip"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path
                                    d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"
                                />
                            </svg>
                        </label>
                    {:else}
                        <button
                            id="file"
                            class={`bg-transparent p-0 m-0 inline-flex justify-center items-center opacity-50`}
                            on:click|preventDefault|stopPropagation={() => (informationMessage = $LL.disabledByAdmin())}
                        >
                            <PaperclipIcon size="17" />
                        </button>
                    {/if}
                </div>
                <div class="actions px-2 py-2">
                    <div class="flex items-center space-x-1">
                        <button
                            id="send"
                            type="submit"
                            class={`${
                                !$hasErrorUploadingFile && !$hasInProgressUploadingFile && !isMessageTooLong
                                    ? "can-send"
                                    : "cant-send"
                            } bg-transparent p-0 m-0 inline-flex justify-center items-center text-light-blue`}
                            on:mouseover={showErrorMessages}
                            on:focus={showErrorMessages}
                            on:click={sendMessage}
                        >
                            {#if $hasErrorUploadingFile || isMessageTooLong}
                                <AlertCircleIcon size="17" class="text-pop-red" />
                            {:else if $hasInProgressUploadingFile}
                                <LoaderIcon size="17" class="animate-spin" />
                            {:else}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="icon icon-tabler icon-tabler-send"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    stroke-width="1.5"
                                    stroke="#ffffff"
                                    fill="none"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                    <path d="M10 14l11 -11" />
                                    <path
                                        d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5"
                                    />
                                </svg>
                            {/if}
                        </button>
                    </div>
                    {#if isMessageTooLong}
                        <div class="text-pop-red text-xs font-bold text-right mt-5">
                            {maxCharMessage - newMessageText.length}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </form>
</div>

<style lang="scss">
</style>
