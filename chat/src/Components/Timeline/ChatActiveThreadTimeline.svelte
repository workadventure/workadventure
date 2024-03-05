<script lang="ts">
    import { Trash2Icon } from "svelte-feather-icons";
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import { Unsubscriber, writable } from "svelte/store";
    import { EmojiButton } from "@joeattardi/emoji-button";
    import {
        GoogleWorkSpaceException,
        GoogleWorkSpaceService,
        KlaxoonService,
        YoutubeService,
        KlaxoonException,
        KlaxoonEvent,
        EraserService,
        EraserException,
        ChatMessageTypes,
    } from "@workadventure/shared-utils";
    import {
        chatMessagesStore,
        chatInputFocusStore,
        chatPeerConnectionInProgress,
        writingStatusMessageStore,
        _newChatMessageWritingStatusSubject,
        lastTimelineMessageRead,
    } from "../../Stores/ChatStore";
    import { LL, locale } from "../../i18n/i18n-svelte";
    import { activeThreadStore } from "../../Stores/ActiveThreadStore";
    import { mucRoomsStore } from "../../Stores/MucRoomsStore";
    import { HtmlUtils } from "../../Utils/HtmlUtils";
    import { defaultWoka } from "../../Xmpp/AbstractRoom";
    import { chatConnectionManager } from "../../Connection/ChatConnectionManager";
    import ApplicationPicker from "../Content/ApplicationPicker.svelte";
    import { iframeListener } from "../../IframeListener";
    import UserWriting from "./UserWriting.svelte";

    const dispatch = createEventDispatcher();
    const defaultMucRoom = mucRoomsStore.getDefaultRoom();

    let writingTimer: ReturnType<typeof setTimeout> | undefined;

    export let settingsView = false;

    let htmlMessageText = "";
    let input: HTMLElement;

    interface Application {
        name: string;
        icon: string;
        example: string;
        description: string;
        image?: string;
        link?: string;
        error?: string;
    }
    const applications = writable<Set<Application>>(new Set());
    const applicationsSelected = writable<Set<Application>>(new Set());

    function onFocus() {
        chatInputFocusStore.set(true);
    }
    function onBlur() {
        chatInputFocusStore.set(false);
    }
    function saveMessage() {
        if (htmlMessageText) {
            const message = htmlMessageText.replace(/<div>|<br>/g, "\n").replace(/(<([^>]+)>)/gi, "");
            chatMessagesStore.addPersonalMessage(message);
            htmlMessageText = "";
            setTimeout(() => {
                input.innerHTML = "";
            }, 0);
        }
        if ($applicationsSelected.size > 0) {
            for (const app of $applicationsSelected) {
                if (app.link != undefined && app.link != "") {
                    chatMessagesStore.addPersonalMessage(app.link);
                }
                applicationsSelected.update((apps) => {
                    apps.delete(app);
                    return apps;
                });
            }
        }
    }

    function backToThreadList() {
        activeThreadStore.reset();
        dispatch("unactiveThreadTimeLine");
    }

    function writing() {
        if (
            htmlMessageText != undefined &&
            htmlMessageText !== "" &&
            htmlMessageText !== "<br>" &&
            htmlMessageText !== "<div><br></div><div><br></div>"
        ) {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userWriting);
            if (writingTimer) {
                clearTimeout(writingTimer);
            }
            writingTimer = setTimeout(() => {
                _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userStopWriting);
                writingTimer = undefined;
            }, 5000);
        } else {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userStopWriting);
            if (writingTimer) {
                clearTimeout(writingTimer);
                writingTimer = undefined;
            }
        }
        if (htmlMessageText === "<br>" || htmlMessageText === "<div><br></div><div><br></div>") {
            htmlMessageText = "";
        }
    }

    function handlerKeyDown(keyDownEvent: KeyboardEvent) {
        if (keyDownEvent.key === "Enter" && !keyDownEvent.shiftKey) {
            saveMessage();
            htmlMessageText = "";
            writing();
            return false;
        }
        return true;
    }

    let subscribers = new Array<Unsubscriber>();

    let emojiContainer: HTMLElement;
    let picker: EmojiButton;

    let elements: NodeListOf<Element>;
    const aListner = (event: Event) => {
        event.stopPropagation();
        event.preventDefault();

        // Open link in new tab
        const target = event.target as HTMLAnchorElement;
        iframeListener.openTab(target.href);
    };

    onMount(() => {
        subscribers.push(
            chatMessagesStore.subscribe(() => {
                setTimeout(() => {
                    lastTimelineMessageRead.set(new Date());
                }, 50);
                setTimeout(() => {
                    const messageList = document.getElementById("timeLine-messageList");
                    if (messageList) {
                        document.scrollingElement?.scrollTo(0, messageList.scrollHeight);
                    }

                    // for each all messages in chatMessagesStore
                    elements = document.querySelectorAll(`div.wa-message-body a`);
                    elements.forEach((element) => {
                        // clear previous event listner
                        element.removeEventListener("click", aListner);
                        element.addEventListener("click", aListner);
                    });
                }, 100);
            })
        );

        picker = new EmojiButton({
            styleProperties: {
                "--font": "Roboto Condensed",
                "--background-color": "rgb(42, 66, 101)",
                "--text-color": "#FF0000",
                "--secondary-text-color": "#FF0000",
                "--category-button-color": "#FF0000",
                "--category-button-active-color": "rgb(65, 86, 246)",
            },
            position: "bottom",
            emojisPerRow: 5,
            autoFocusSearch: false,
            style: "native",
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
        picker.on("hidden", () => {});

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

    function needHideHeader(authorName: string, date: Date, i: number) {
        let previousMsg = $chatMessagesStore[i - 1];
        if (!previousMsg) {
            return false;
        }
        const minutesBetween = (date.getTime() - previousMsg.date.getTime()) / 60000;
        return previousMsg.authorName === authorName && minutesBetween < 2;
    }

    let applicationMenuIsOpenned = false;
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
                    console.log("KlaxoonService.openKlaxoonActivityPicker => event", event);
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
                    app.link = KlaxoonService.getKlaxoonEmbedUrl(
                        new URL(app.link),
                        chatConnectionManager.klaxoonToolClientId
                    );
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
                } catch (err) {
                    if (err instanceof GoogleWorkSpaceException.YoutubeException) {
                        app.error = $LL.form.application.youtube.error();
                    } else {
                        app.error = $LL.form.application.weblink.error();
                    }
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
        console.log("handlerKeyDownAppInput => htmlMessageText", htmlMessageText);
        if (keyPressEvent.key === "Enter" && !keyPressEvent.shiftKey) {
            // blur element from keyPressEvent
            (keyPressEvent.target as HTMLInputElement).blur();
            keyPressEvent.preventDefault();
        }
    }

    onDestroy(() => {
        subscribers.forEach((subscriber) => subscriber());

        // Unsubscribe element event listner click
        elements.forEach((element) => {
            element.removeEventListener("click", aListner);
        });
    });

    /* eslint-disable svelte/no-at-html-tags */
</script>

<!-- thread -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    id="activeTimeline"
    class="flex flex-col h-full min-h-full over w-full"
    on:click={() => (applicationMenuIsOpenned = false)}
>
    <div
        class="wa-thread-head fixed w-full border-x-0 border-b border-t-0 border-solid border-white/30 backdrop-blur z-20 bg-contrast/80"
    >
        <div class="title relative py-2">
            <div class="absolute left-3 top-3">
                <button class="exit p-2 hover:bg-white/20 rounded cursor-pointer" on:click={backToThreadList}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-chevron-left"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M15 6l-6 6l6 6" />
                    </svg>
                </button>
            </div>
            <div class="text-center p-2 pt-3">
                <div class="flex justify-center">
                    <div>{$LL.timeLine.title()}</div>
                    {#if $chatPeerConnectionInProgress}
                        <div class="block relative ml-7 mt-1">
                            <span class="w-4 h-4 bg-pop-green block rounded-full absolute right-0 top-0 animate-ping" />
                            <span class="w-3 h-3 bg-pop-green block rounded-full absolute right-0.5 top-0.5" />
                        </div>
                    {/if}
                </div>
                <div class="flex justify-center items-center text-xs text-white/50 grow">
                    {$LL.timeLine.description()}
                </div>
            </div>
            <div id="settings" class="w-14 self-stretch flex justify-center align-middle">
                <!--
            <button class="text-lighter-purple m-0">
                {#if $settingsViewStore}
                    <MessageCircleIcon />
                {:else}
                    <SettingsIcon />
                {/if}
            </button>
            -->
            </div>
        </div>
        <div class="absolute right-4 top-3">
            <div class="wa-message-bg">
                <button class="p-2 hover:bg-white/20 cursor-pointer rounded">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler icon-tabler-dots"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                        <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                        <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                    </svg>
                </button>
                <!--<button class="wa-action btn btn-sm btn-light btn-border" type="button" on:click|stopPropagation={reInitialize}>
                    <RefreshCwIcon size="13" class="mr-2" />
                    {$LL.reinit()}
                </button>-->
            </div>
        </div>
    </div>

    <!-- MESSAGE LIST-->
    <div
        id="timeLine-messageList"
        class="flex flex-col flex-auto px-5 pt-32 pb-16 justify-end h-auto min-h-screen relative z-10"
    >
        {#each $chatMessagesStore as message, i (message.id)}
            {#if message.type === ChatMessageTypes.text || message.type === ChatMessageTypes.me}
                <div
                    id="message_{message.id}"
                    class={needHideHeader(message.author?.name ?? message.authorName ?? "", message.date, i)
                        ? "mt-0.5"
                        : "mt-2"}
                >
                    <div
                        class={`flex ${
                            message.type === ChatMessageTypes.me ? "justify-end text-right" : "justify-start"
                        }`}
                    >
                        {#if !needHideHeader(message.author?.name ?? message.authorName ?? "", message.date, i)}
                            <div
                                class="relative wa-avatar aspect-ratio h-10 w-10 rounded overflow-hidden false cursor-default {message.type ===
                                ChatMessageTypes.me
                                    ? 'opacity-0'
                                    : 'mt-6'} wa-avatar-mini mr-2"
                                style={`background-color: ${message.author?.color ?? "#56eaff"}`}
                            >
                                <div class="wa-container cursor-default">
                                    <img
                                        class="cursor-default w-full mt-2"
                                        style="image-rendering: pixelated;"
                                        src={`${message.author?.woka ? message.author?.woka : defaultWoka}`}
                                        alt="Avatar"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        {:else}
                            <div class="aspect-ratio w-12 h-12 mr-2" />
                        {/if}
                        <div class="w-3/4">
                            <div class="inline-block">
                                {#if !needHideHeader(message.author?.name ?? message.authorName ?? "", message.date, i)}
                                    <div class="flex text-xxs px-4 py-1">
                                        <span class="bold text-white/50 text-left grow">
                                            {#if message.type === ChatMessageTypes.me}
                                                {$LL.me()}
                                            {:else if message.author}
                                                {message.author?.name.match(/\[\d*]/)
                                                    ? message.author?.name.substring(
                                                          0,
                                                          message.author?.name.search(/\[\d*]/)
                                                      )
                                                    : message.author?.name}
                                                {#if message.author?.name.match(/\[\d*]/)}
                                                    <span class="font-light text-xs text-gray">
                                                        #{message.author?.name
                                                            .match(/\[\d*]/)
                                                            ?.join()
                                                            ?.replace("[", "")
                                                            ?.replace("]", "")}
                                                    </span>
                                                {/if}
                                            {:else}
                                                {message.authorName}
                                            {/if}
                                        </span>
                                        <span class="text-white/50 text-right">
                                            {message.date.toLocaleTimeString($locale, {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                {/if}
                                {#if message.text}
                                    <div
                                        class="wa-message-body break-all rounded-lg px-4 py-2 inline-block leading-6 min-w-[7rem] max-h-80 overflow-hidden relative before:absolute before:content-[''] before:z-10 before:top-64 before:left-0 before:h-16 before:w-full before:bg-gradient-to-t after:content-['Read_more...'] after:absolute after:left-0 after:top-[18.5rem] after:w-full after:h-10 after:cursor-pointer after:text-center after:underline after:z-20 after:text-xs after:mt-6px after:border after:border-l-0 after:border-b-0 after:border-t after:border-solid after:border-white/20 {message.type ===
                                        ChatMessageTypes.me
                                            ? 'bg-secondary from-secondary text-left before:from-secondary before:via-secondary'
                                            : 'bg-contrast before:from-contrast before:via-contrast'}"
                                    >
                                        {#each message.text as text (text)}
                                            <div class="text-ellipsis overflow-y-auto break-words whitespace-pre-line">
                                                {#await HtmlUtils.urlify(text)}
                                                    <p>...waiting</p>
                                                {:then html}
                                                    {@html html}
                                                {/await}
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            {#if message.targets && message.targets.length > 0}
                {#if message.type === ChatMessageTypes.userIncoming}
                    {#each message.targets as target (target.jid)}
                        <div class="event text-center mt-2" style="white-space: nowrap;">
                            <span
                                class="w-fit tag mx-2 px-3 py-1 border border-solid border-white/20 rounded-full text-xs"
                                ><b
                                    >{target.name && target.name.match(/\[\d*]/)
                                        ? target.name.substring(0, target.name.search(/\[\d*]/))
                                        : target.name
                                        ? target.name
                                        : "Unknown"}
                                    {#if target.name.match(/\[\d*]/)}
                                        <span class="font-light text-xs text-gray">
                                            #{target.name
                                                ? target.name
                                                      .match(/\[\d*]/)
                                                      ?.join()
                                                      ?.replace("[", "")
                                                      ?.replace("]", "")
                                                : "Unknown"}
                                        </span>
                                    {/if}</b
                                >{$LL.timeLine.incoming()}
                                <span class="text-xss opacity-50">
                                    - {message.date.toLocaleTimeString($locale, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </span>
                        </div>
                    {/each}
                {/if}
                {#if message.type === ChatMessageTypes.userOutcoming}
                    {#each message.targets as target (target.jid)}
                        <div class="event text-center mt-2" style="white-space: nowrap;">
                            <span
                                class="w-fit tag mx-2 px-3 py-1 border border-solid border-white/20 rounded-full text-xs"
                                ><b
                                    >{target.name && target.name.match(/\[\d*]/)
                                        ? target.name.substring(0, target.name.search(/\[\d*]/))
                                        : target.name
                                        ? target.name
                                        : "Unknown"}
                                    {#if target.name.match(/\[\d*]/)}
                                        <span class="font-light text-xs text-gray">
                                            #{target.name
                                                ? target.name
                                                      .match(/\[\d*]/)
                                                      ?.join()
                                                      ?.replace("[", "")
                                                      ?.replace("]", "")
                                                : "Unknown"}
                                        </span>
                                    {/if}</b
                                >{$LL.timeLine.outcoming()}
                                <span class="text-xss opacity-50">
                                    - {message.date.toLocaleTimeString($locale, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </span>
                        </div>
                    {/each}
                {/if}
            {/if}
        {/each}

        {#if defaultMucRoom}
            {#each [...$writingStatusMessageStore] as user (user.jid)}
                <UserWriting {defaultMucRoom} userJid={user.jid} userName={user.name} />
            {/each}
        {/if}
    </div>
    <!--MESSAGE FORM-->
    <div class="wa-message-form fixed bottom-0 w-full z-20">
        <div class="emote-menu-container">
            <div class="emote-menu" id="emote-picker" bind:this={emojiContainer} />
        </div>

        {#if applicationMenuIsOpenned}
            <ApplicationPicker
                applications={$applications}
                on:addNewApp={(event) => addNewApp(event.detail)}
                _class="mb-9 left-6"
            />
        {/if}

        <form on:submit|preventDefault={saveMessage} class="flex flex-col">
            {#each [...$applicationsSelected] as app (app.name)}
                <div
                    class="flex flex-column items-center justify-center mx-12 mb-2 p-3 flex flex-wrap rounded-xl text-xxs bottom-12"
                    style="backdrop-filter: blur(30px);border: solid 1px rgb(27 27 41);"
                >
                    <div class="flex flex-row justify-between items-center m-1 w-full">
                        <label for="app" class="m-0">
                            <img src={app.icon} alt={app.name} width="20px" />
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
                        <img class="m-4" src={app.image} alt={app.name} width="100px" />
                    {/if}
                    {#if app.error}
                        <p class="text-pop-red text-xs px-2 mt-2 my-0">{app.error}</p>
                    {/if}
                </div>
            {/each}

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
                        bind:this={input}
                        contenteditable="true"
                        bind:innerHTML={htmlMessageText}
                        data-placeholder={$LL.enterText()}
                        on:keydown={handlerKeyDown}
                        on:input={writing}
                        on:focus={onFocus}
                        on:blur={onBlur}
                        class="bg-contrast rounded border border-solid border-white/20 px-4 py-2 focus:outline-secondary"
                    />
                </div>
                <div class="actions">
                    <div class="flex items-center space-x-1">
                        <button
                            id="send"
                            type="submit"
                            class="can-send bg-transparent p-0 m-0 inline-flex justify-center items-center text-light-blue px-3 mx-1 py-1.5 rounded hover:bg-secondary cursor-pointer"
                            on:click|stopPropagation={saveMessage}
                        >
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
                                <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>
</div>

<style lang="scss">
</style>
