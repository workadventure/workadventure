<script lang="ts">
    import { fly } from "svelte/transition";
    import { ArrowLeftIcon, RefreshCwIcon, SmileIcon, SendIcon, Trash2Icon } from "svelte-feather-icons";
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

    function reInitialize() {
        chatMessagesStore.reInitialize();
        settingsView = false;
    }

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

    function needHideHeader(authorName: string, date: Date, i: number) {
        let previousMsg = $chatMessagesStore[i - 1];
        if (!previousMsg) {
            return false;
        }
        const minutesBetween = (date.getTime() - previousMsg.date.getTime()) / 60000;
        return previousMsg.authorName === authorName && minutesBetween < 2;
    }

    let emojiOpened = false;
    function openEmoji() {
        picker.showPicker(emojiContainer);
        emojiOpened = true;
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
    class="tw-flex tw-flex-col tw-h-full tw-min-h-full tw-over tw-w-full"
    transition:fly={{ x: 500, duration: 400 }}
    on:click={() => (applicationMenuIsOpenned = false)}
>
    <div class="wa-thread-head">
        <div class="title">
            <div class="tw-py-1 tw-w-14 tw-self-stretch tw-flex tw-justify-center tw-align-middle">
                <button class="exit tw-text-lighter-purple tw-m-0" on:click={backToThreadList}>
                    <ArrowLeftIcon />
                </button>
            </div>
            <div class="tw-text-center tw-pt-2 tw-pb-3">
                <div class="tw-flex tw-justify-center">
                    <b>{$LL.timeLine.title()}</b>
                    {#if $chatPeerConnectionInProgress}
                        <div class="tw-block tw-relative tw-ml-7 tw-mt-1">
                            <span
                                class="tw-w-4 tw-h-4 tw-bg-pop-green tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-animate-ping"
                            />
                            <span
                                class="tw-w-3 tw-h-3 tw-bg-pop-green tw-block tw-rounded-full tw-absolute tw-right-0.5 tw-top-0.5"
                            />
                        </div>
                    {/if}
                </div>
                <div class="tw-flex tw-flex-wrap tw-gap-x-1 tw-items-center tw-text-xs tw-text-lighter-purple">
                    {$LL.timeLine.description()}
                </div>
            </div>
            <div id="settings" class="tw-py-1 tw-w-14 tw-self-stretch tw-flex tw-justify-center tw-align-middle">
                <!--
            <button class="tw-text-lighter-purple tw-m-0">
                {#if $settingsViewStore}
                    <MessageCircleIcon />
                {:else}
                    <SettingsIcon />
                {/if}
            </button>
            -->
            </div>
        </div>
        <div class="tw-flex tw-flex-col tw-flex-auto tw-w-full">
            <div
                class="wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5 tw-pb-0.5"
            >
                <button class="wa-action" type="button" on:click|stopPropagation={reInitialize}
                    ><RefreshCwIcon size="13" class="tw-mr-2" /> {$LL.reinit()}
                </button>
            </div>
        </div>
    </div>

    <!-- MESSAGE LIST-->
    <div
        id="timeLine-messageList"
        class="tw-flex tw-flex-col tw-flex-auto tw-px-5 tw-py-24 tw-justify-end tw-h-auto tw-min-h-screen"
    >
        {#each $chatMessagesStore as message, i (message.id)}
            {#if message.type === ChatMessageTypes.text || message.type === ChatMessageTypes.me}
                <div
                    id={`message_${message.id}`}
                    class={`${
                        needHideHeader(message.author?.name ?? message.authorName ?? "", message.date, i)
                            ? "tw-mt-0.5"
                            : "tw-mt-2"
                    }`}
                >
                    <div
                        class={`tw-flex ${
                            message.type === ChatMessageTypes.me ? "tw-justify-end" : "tw-justify-start"
                        }`}
                    >
                        <div
                            class={`${
                                message.type === ChatMessageTypes.me ? "tw-opacity-0" : "tw-mt-4"
                            } tw-relative wa-avatar-mini tw-mr-2`}
                            style={`background-color: ${message.author?.color ?? "#56eaff"}`}
                        >
                            <div class="wa-container">
                                <img
                                    class="tw-w-full"
                                    style="image-rendering: pixelated;"
                                    src={`${message.author?.woka ? message.author?.woka : defaultWoka}`}
                                    alt="Avatar"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                        <div class="tw-w-3/4">
                            {#if !needHideHeader(message.author?.name ?? message.authorName ?? "", message.date, i)}
                                <div
                                    style={`border-bottom-color:${message.author?.color}`}
                                    class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-1 ${
                                        message.type === ChatMessageTypes.me ? "tw-flex-row-reverse" : ""
                                    }`}
                                >
                                    <span class="tw-text-lighter-purple">
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
                                                <span class="tw-font-light tw-text-xs tw-text-gray">
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
                                    <span
                                        >{message.date.toLocaleTimeString($locale, {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}</span
                                    >
                                </div>
                            {/if}
                            {#if message.text}
                                <div class="wa-message-body">
                                    {#each message.text as text (text)}
                                        <div
                                            class="tw-text-ellipsis tw-overflow-y-auto tw-break-words tw-whitespace-pre-line"
                                        >
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
            {/if}

            {#if message.targets && message.targets.length > 0}
                {#if message.type === ChatMessageTypes.userIncoming}
                    {#each message.targets as target (target.jid)}
                        <div class="event tw-text-center tw-mt-2" style="white-space: nowrap;">
                            <span
                                class="tw-w-fit tag tw-bg-dark tw-mx-2 tw-px-3 tw-py-1 tw-border tw-border-solid tw-rounded-full tw-text-xs tw-border-lighter-purple"
                                ><b style={target.color ? `color: ${target.color};` : ""}
                                    >{target.name && target.name.match(/\[\d*]/)
                                        ? target.name.substring(0, target.name.search(/\[\d*]/))
                                        : target.name
                                        ? target.name
                                        : "Unknown"}
                                    {#if target.name.match(/\[\d*]/)}
                                        <span class="tw-font-light tw-text-xs tw-text-gray">
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
                                <span class="tw-text-xss tw-text-lighter-purple">
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
                        <div class="event tw-text-center tw-mt-2" style="white-space: nowrap;">
                            <span
                                class="tw-w-fit tag tw-bg-dark tw-mx-2 tw-px-3 tw-py-1 tw-border tw-border-solid tw-rounded-full tw-text-xs tw-border-lighter-purple"
                                ><b style={target.color ? `color: ${target.color};` : ""}
                                    >{target.name && target.name.match(/\[\d*]/)
                                        ? target.name.substring(0, target.name.search(/\[\d*]/))
                                        : target.name
                                        ? target.name
                                        : "Unknown"}
                                    {#if target.name.match(/\[\d*]/)}
                                        <span class="tw-font-light tw-text-xs tw-text-gray">
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
                                <span class="tw-text-xss tw-text-lighter-purple">
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
    <div class="wa-message-form">
        <div class="emote-menu-container">
            <div class="emote-menu" id="emote-picker" bind:this={emojiContainer} />
        </div>

        {#if applicationMenuIsOpenned}
            <ApplicationPicker
                applications={$applications}
                on:addNewApp={(event) => addNewApp(event.detail)}
                _class="tw-mb-9 tw-left-6"
            />
        {/if}

        <form on:submit|preventDefault={saveMessage} class="tw-flex tw-flex-col">
            {#each [...$applicationsSelected] as app (app.name)}
                <div
                    class="tw-flex tw-flex-column tw-items-center tw-justify-center tw-mx-12 tw-mb-2 tw-p-3 tw-flex tw-flex-wrap tw-rounded-xl tw-text-xxs tw-bottom-12"
                    style="backdrop-filter: blur(30px);border: solid 1px rgb(27 27 41);"
                >
                    <div class="tw-flex tw-flex-row tw-justify-between tw-items-center tw-m-1 tw-w-full">
                        <label for="app" class="tw-m-0">
                            <img src={app.icon} alt={app.name} width="20px" />
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
                        <img class="tw-m-4" src={app.image} alt={app.name} width="100px" />
                    {/if}
                    {#if app.error}
                        <p class="tw-text-pop-red tw-text-xs tw-px-2 tw-mt-2 tw-my-0">{app.error}</p>
                    {/if}
                </div>
            {/each}

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
                    bind:this={input}
                    contenteditable="true"
                    bind:innerHTML={htmlMessageText}
                    data-placeholder={$LL.enterText()}
                    on:keydown={handlerKeyDown}
                    on:input={writing}
                    on:focus={onFocus}
                    on:blur={onBlur}
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
                        <button
                            id="send"
                            type="submit"
                            class="can-send tw-bg-transparent tw-p-0 tw-m-0 tw-inline-flex tw-justify-center tw-items-center tw-text-light-blue"
                            on:click|stopPropagation={saveMessage}
                        >
                            <SendIcon size="17" />
                        </button>
                    </div>
                </div>
            </div>
            <!--
                <div class="tw-w-full tw-p-2">
                    <div class="tw-flex tw-items-center tw-relative">
                        <textarea
                            type="text"
                            bind:value={htmlMessageText}
                            placeholder={$LL.form.placeholder()}
                            on:keydown={handlerKeyDown}
                            on:input={writing}
                            on:focus={onFocus}
                            on:blur={onBlur}
                            rows="1"
                        />
                        <button
                            class={`tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 ${
                                emojiOpened ? "tw-text-light-blue" : ""
                            }`}
                            on:click|preventDefault|stopPropagation={openEmoji}
                        >
                            <SmileIcon size="17" />
                        </button>
                        <button
                            type="submit"
                            class="tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 tw-text-light-blue"
                            on:click|stopPropagation={saveMessage}
                        >
                            <SendIcon size="17" />
                        </button>
                    </div>
                </div>
                -->
        </form>
    </div>
</div>

<style lang="scss">
    .settingsHeader {
        padding-top: 58px;
    }
    .messageList {
        display: flex;
        justify-content: flex-end;
        overflow-y: hidden;
        min-height: calc(100vh - 40px);
        padding: 60px 0;
    }
    form .actions {
        top: 10px;
    }
    form [contenteditable="true"] {
        padding-right: 4rem;
    }
    .wa-dropdown-menu {
        margin: 0 0 0 10px;
        position: relative;
        width: 94%;
        max-height: 50vh;
        overflow-y: auto;
        overflow-x: hidden;
    }

    input {
        border-color: #879fc2;
        margin-bottom: 0px;
    }
    .wa-message-form {
        .actions {
            .action {
                cursor: pointer;
                opacity: 0.8;
                position: relative;
                .caption {
                    @apply tw-absolute tw-bg-dark-blue tw-text-sm tw-px-2 tw-py-1 tw-rounded-xl tw-border-lighter-purple tw-border tw-border-solid;
                    display: none;
                    top: 5px;
                    left: 54px;
                    z-index: 10;
                    width: max-content;
                    &::before {
                        @apply tw-absolute tw-border-lighter-purple;
                        bottom: -10px;
                        content: "";
                        width: 0;
                        height: 0;
                        border-left: 9px solid transparent;
                        border-right: 9px solid transparent;
                        border-top-width: 6px;
                        border-top-style: solid;
                    }
                    &::after {
                        @apply tw-absolute tw-border-dark-blue;
                        bottom: -10px;
                        content: "";
                        width: 0;
                        height: 0;
                        border-left: 7px solid transparent;
                        border-right: 7px solid transparent;
                        border-top-width: 5px;
                        border-top-style: solid;
                    }
                }
                &:hover {
                    opacity: 1;
                    .caption {
                        display: block;
                    }
                }
            }
        }
        &:hover {
            .actions {
                visibility: visible;
            }
        }
    }
</style>
