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
    } from "@workadventure/shared-utils";
    import {
        chatMessagesStore,
        chatInputFocusStore,
        ChatMessageTypes,
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
    import UserWriting from "./UserWriting.svelte";

    const dispatch = createEventDispatcher();
    const defaultMucRoom = mucRoomsStore.getDefaultRoom();

    export let settingsView = false;

    let htmlMessageText = "";
    let input: HTMLElement;

    interface Application {
        name: string;
        icon: string;
        example: string;
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
                if (app.link != undefined) {
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
        if (htmlMessageText != undefined && htmlMessageText !== "" && htmlMessageText !== "<br>") {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userWriting);
        } else {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userStopWriting);
        }
        if (htmlMessageText === "<br>") {
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
                    // Remove previous app
                    applicationsSelected.update((apps) => {
                        apps.delete(app);
                        return apps;
                    });
                    // Update app with Klaxoon's Activity Picker
                    app.link = KlaxoonService.getKlaxoonEmbedUrl(new URL(event.url));
                    if (event.imageUrl) app.icon = event.imageUrl;
                    if (event.title) app.name = event.title;
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
                    app.link = await YoutubeService.getYoutubeEmbedUrl(new URL(app.link));
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
    });
</script>

<!-- thread -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    id="activeTimeline"
    class="flex flex-col h-full min-h-full over w-full"
    transition:fly={{ x: 500, duration: 400 }}
    on:click={() => (applicationMenuIsOpenned = false)}
>
    <div class="wa-thread-head">
        <div class="title">
            <div class="py-1 w-14 self-stretch flex justify-center align-middle">
                <button class="exit text-lighter-purple m-0" on:click={backToThreadList}>
                    <ArrowLeftIcon />
                </button>
            </div>
            <div class="text-center pt-2 pb-3">
                <div class="flex justify-center">
                    <b>{$LL.timeLine.title()}</b>
                    {#if $chatPeerConnectionInProgress}
                        <div class="block relative ml-7 mt-1">
                            <span
                                class="w-4 h-4 bg-pop-green block rounded-full absolute right-0 top-0 animate-ping"
                            />
                            <span
                                class="w-3 h-3 bg-pop-green block rounded-full absolute right-0.5 top-0.5"
                            />
                        </div>
                    {/if}
                </div>
                <div class="flex flex-wrap gap-x-1 items-center text-xs text-lighter-purple">
                    {$LL.timeLine.description()}
                </div>
            </div>
            <div id="settings" class="py-1 w-14 self-stretch flex justify-center align-middle">
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
        <div class="flex flex-col flex-auto w-full">
            <div
                class="wa-message-bg border border-transparent border-b-light-purple border-solid px-5 pb-0.5"
            >
                <button class="wa-action" type="button" on:click|stopPropagation={reInitialize}
                    ><RefreshCwIcon size="13" class="mr-2" /> {$LL.reinit()}
                </button>
            </div>
        </div>
    </div>

    <!-- MESSAGE LIST-->
    <div
        id="timeLine-messageList"
        class="flex flex-col flex-auto px-5 py-24 justify-end h-auto min-h-screen"
    >
        {#each $chatMessagesStore as message, i}
            {#if message.type === ChatMessageTypes.text || message.type === ChatMessageTypes.me}
                <div
                    class={`${
                        needHideHeader(message.author?.name ?? message.authorName ?? "", message.date, i)
                            ? "mt-0.5"
                            : "mt-2"
                    }`}
                >
                    <div
                        class={`flex ${
                            message.type === ChatMessageTypes.me ? "justify-end" : "justify-start"
                        }`}
                    >
                        <div
                            class={`${
                                message.type === ChatMessageTypes.me ? "opacity-0" : "mt-4"
                            } relative wa-avatar-mini mr-2`}
                            style={`background-color: ${message.author?.color ?? "#56eaff"}`}
                        >
                            <div class="wa-container">
                                <img
                                    class="w-full"
                                    style="image-rendering: pixelated;"
                                    src={`${message.author?.woka ? message.author?.woka : defaultWoka}`}
                                    alt="Avatar"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                        <div class="w-3/4">
                            {#if !needHideHeader(message.author?.name ?? message.authorName ?? "", message.date, i)}
                                <div
                                    style={`border-bottom-color:${message.author?.color}`}
                                    class={`flex justify-between mx-2 border-0 border-b border-solid text-light-purple-alt text-xxs pb-1 ${
                                        message.type === ChatMessageTypes.me ? "flex-row-reverse" : ""
                                    }`}
                                >
                                    <span class="text-lighter-purple">
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
                                    {#each message.text as text}
                                        <div
                                            class="text-ellipsis overflow-y-auto break-words whitespace-pre-line"
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
                    {#each message.targets as target}
                        <div class="event text-center mt-2" style="white-space: nowrap;">
                            <span
                                class="w-fit tag bg-dark mx-2 px-3 py-1 border border-solid rounded-full text-xs border-lighter-purple"
                                ><b style={target.color ? `color: ${target.color};` : ""}
                                    >{target.name.match(/\[\d*]/)
                                        ? target.name.substring(0, target.name.search(/\[\d*]/))
                                        : target.name}
                                    {#if target.name.match(/\[\d*]/)}
                                        <span class="font-light text-xs text-gray">
                                            #{target.name
                                                .match(/\[\d*]/)
                                                ?.join()
                                                ?.replace("[", "")
                                                ?.replace("]", "")}
                                        </span>
                                    {/if}</b
                                >{$LL.timeLine.incoming()}
                                <span class="text-xss text-lighter-purple">
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
                    {#each message.targets as target}
                        <div class="event text-center mt-2" style="white-space: nowrap;">
                            <span
                                class="w-fit tag bg-dark mx-2 px-3 py-1 border border-solid rounded-full text-xs border-lighter-purple"
                                ><b style={target.color ? `color: ${target.color};` : ""}
                                    >{target.name.match(/\[\d*]/)
                                        ? target.name.substring(0, target.name.search(/\[\d*]/))
                                        : target.name}
                                    {#if target.name.match(/\[\d*]/)}
                                        <span class="font-light text-xs text-gray">
                                            #{target.name
                                                .match(/\[\d*]/)
                                                ?.join()
                                                ?.replace("[", "")
                                                ?.replace("]", "")}
                                        </span>
                                    {/if}</b
                                >{$LL.timeLine.outcoming()}
                                <span class="text-xss text-lighter-purple">
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
            {#each [...$writingStatusMessageStore] as userJid}
                <UserWriting {defaultMucRoom} {userJid} />
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
                _class="mb-9 left-6"
            />
        {/if}

        <form on:submit|preventDefault={saveMessage} class="flex flex-col">
            {#each [...$applicationsSelected] as app}
                <div
                    class="mx-2 mb-2 px-6 py-3 flex flex-wrap bg-dark-blue/95 rounded-xl text-xxs justify-between items-center bottom-12"
                >
                    <div class="flex flex-row justify-between items-center m-1 w-full">
                        <label for="app" class="m-0">
                            <img src={app.icon} alt={app.name} width="20px" />
                            {#if app.name === "Klaxoon"}
                                {$LL.form.application.klaxoon.description()}
                            {/if}
                            {#if app.name === "Youtube"}
                                {$LL.form.application.youtube.description()}
                            {/if}
                            {#if app.name === "Google Docs"}
                                {$LL.form.application.googleDocs.description()}
                            {/if}
                            {#if app.name === "Google Sheets"}
                                {$LL.form.application.googleSheets.description()}
                            {/if}
                            {#if app.name === "Google Slides"}
                                {$LL.form.application.googleSlides.description()}
                            {/if}
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
                    {#if app.error}
                        <p class="text-pop-red text-xs px-2 mt-2 my-0">{app.error}</p>
                    {/if}
                </div>
            {/each}

            <div class="w-full px-2 pb-2 flex flex-row justify-center items-center">
                <div class="actions px-2 py-2">
                    <div class="flex items-center space-x-1">
                        <button
                            id="application"
                            class="bg-transparent p-0 m-0 inline-flex justify-center items-center"
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
                <div class="actions px-2 py-2">
                    <div class="flex items-center space-x-1">
                        <button
                            class={`bg-transparent p-0 m-0 inline-flex justify-center items-center ${
                                emojiOpened ? "text-light-blue" : ""
                            }`}
                            on:click|preventDefault|stopPropagation={openEmoji}
                        >
                            <SmileIcon size="17" />
                        </button>
                        <button
                            id="send"
                            type="submit"
                            class="can-send bg-transparent p-0 m-0 inline-flex justify-center items-center text-light-blue"
                            on:click|stopPropagation={saveMessage}
                        >
                            <SendIcon size="17" />
                        </button>
                    </div>
                </div>
            </div>
            <!--
                <div class="w-full p-2">
                    <div class="flex items-center relative">
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
                            class={`bg-transparent h-8 w-8 p-0 inline-flex justify-center items-center right-0 ${
                                emojiOpened ? "text-light-blue" : ""
                            }`}
                            on:click|preventDefault|stopPropagation={openEmoji}
                        >
                            <SmileIcon size="17" />
                        </button>
                        <button
                            type="submit"
                            class="bg-transparent h-8 w-8 p-0 inline-flex justify-center items-center right-0 text-light-blue"
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
                    @apply absolute bg-dark-blue text-sm px-2 py-1 rounded-xl border-lighter-purple border border-solid;
                    display: none;
                    top: 5px;
                    left: 54px;
                    z-index: 10;
                    width: max-content;
                    &::before {
                        @apply absolute border-lighter-purple;
                        left: -18px;
                        top: 40%;
                        content: "";
                        width: 0;
                        height: 0;
                        border-left: 9px solid transparent;
                        border-right: 9px solid transparent;
                        border-top-width: 6px;
                        border-top-style: solid;
                        transform: rotate(90deg);
                    }
                    &::after {
                        @apply absolute border-dark-blue;
                        left: -16px;
                        top: 40%;
                        content: "";
                        width: 0;
                        height: 0;
                        border-left: 7px solid transparent;
                        border-right: 7px solid transparent;
                        border-top-width: 5px;
                        border-top-style: solid;
                        transform: rotate(90deg);
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
