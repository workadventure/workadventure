<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import type { Subscription } from "rxjs";
    import { onDestroy, onMount } from "svelte";
    import { Color, defaultWoka } from "@workadventure/shared-utils";
    import { derived, get } from "svelte/store";
    import { SpaceFilterMessage } from "@workadventure/messages";
    import {
        chatVisibilityStore,
        iframeLoadedStore,
        wokaDefinedStore,
        writingStatusMessageStore,
    } from "../../Stores/ChatStore";
    import { enableUserInputsStore } from "../../Stores/UserInputStore";
    import { iframeListener } from "../../Api/IframeListener";
    import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { CHAT_URL } from "../../Enum/EnvironmentVariable";
    import { locale } from "../../../i18n/i18n-svelte";
    import { AdminMessageEventTypes, adminMessagesService } from "../../Connection/AdminMessagesService";
    import { menuIconVisiblilityStore } from "../../Stores/MenuStore";
    import { availabilityStatusStore } from "../../Stores/MediaStore";
    import { peerStore } from "../../Stores/PeerStore";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { gameSceneIsLoadedStore } from "../../Stores/GameSceneStore";
    import { Locales } from "../../../i18n/i18n-types";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { mapEditorModeStore } from "../../Stores/MapEditorStore";

    let chatIframe: HTMLIFrameElement;
    let searchElement: HTMLInputElement;

    let searchFilter: SpaceFilterMessage | undefined = undefined;

    let subscribeListeners: Array<Unsubscriber> = [];
    let subscribeObservers: Array<Subscription> = [];

    export const canSendInitMessageStore = derived(
        [wokaDefinedStore, iframeLoadedStore, gameSceneIsLoadedStore],
        ([$wokaDefinedStore, $iframeLoadedStore, $gameSceneIsLoadedStore]) => {
            console.log(
                "$wokaDefinedStore",
                $wokaDefinedStore,
                "$iframeLoadedStore",
                $iframeLoadedStore,
                "$gameSceneIsLoadedStore",
                $gameSceneIsLoadedStore
            );
            return $wokaDefinedStore && $iframeLoadedStore && $gameSceneIsLoadedStore;
        }
    );

    // Phantom woka
    let wokaSrc = defaultWoka;
    const playUri = window.location.protocol + "//" + window.location.hostname + window.location.pathname;
    let name = gameManager.getPlayerName() ?? "unknown";
    name = name.replace(
        /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu,
        (match) => {
            const codePoint = match.codePointAt(0);
            if (!codePoint) {
                throw new Error("Emoji match codePointAt(0) is undefined");
            }
            return `[e-${codePoint.toString(16)}]`;
        }
    );

    onMount(() => {
        iframeListener.registerChatIframe(chatIframe);
        chatIframe.addEventListener("load", () => {
            iframeLoadedStore.set(false);
            if (chatIframe && chatIframe.contentWindow && "postMessage" in chatIframe.contentWindow) {
                iframeLoadedStore.set(true);
                subscribeListeners.push(
                    locale.subscribe((value: Locales) => {
                        chatIframe?.contentWindow?.postMessage(
                            {
                                type: "setLocale",
                                data: {
                                    locale: value,
                                },
                            },
                            "*"
                        );
                    })
                );
                subscribeListeners.push(
                    currentPlayerWokaStore.subscribe((value) => {
                        if (value !== undefined) {
                            wokaSrc = value;
                            wokaDefinedStore.set(true);
                        }
                    })
                );
                // If the renderer is disabled, we will never have a Woka. Let's define the Woka as a phantom one.
                if (!gameManager.getCurrentGameScene().renderer) {
                    currentPlayerWokaStore.set(wokaSrc);
                    wokaDefinedStore.set(true);
                }

                subscribeListeners.push(
                    canSendInitMessageStore.subscribe((value) => {
                        if (value) {
                            iframeListener.sendSettingsToChatIframe();
                            chatIframe?.contentWindow?.postMessage(
                                {
                                    type: "userData",
                                    data: {
                                        ...localUserStore.getLocalUser(),
                                        name,
                                        playUri,
                                        authToken: localUserStore.getAuthToken(),
                                        color: Color.getColorByString(name ?? ""),
                                        woka: wokaSrc,
                                        isLogged: localUserStore.isLogged(),
                                        availabilityStatus: get(availabilityStatusStore),
                                        roomName: connectionManager.currentRoom?.roomName ?? "default",
                                        visitCardUrl: gameManager.myVisitCardUrl,
                                        userRoomToken: gameManager.getCurrentGameScene().connection?.userRoomToken,
                                        klaxoonToolActivated: connectionManager.klaxoonToolActivated,
                                        youtubeToolActivated: connectionManager.youtubeToolActivated,
                                        googleDocsToolActivated: connectionManager.googleDocsToolActivated,
                                        googleSheetsToolActivated: connectionManager.googleSheetsToolActivated,
                                        googleSlidesToolActivated: connectionManager.googleSlidesToolActivated,
                                        klaxoonToolClientId: connectionManager.klaxoonToolClientId,
                                        eraserToolActivated: connectionManager.eraserToolActivated,
                                        excalidrawToolActivated: connectionManager.excalidrawToolActivated,
                                        excalidrawToolDomains: connectionManager.excalidrawToolDomains,
                                        cardsToolActivated: connectionManager.cardsToolActivated,
                                        applications: connectionManager.applications,
                                    },
                                },
                                "*"
                            );
                            chatIframe?.contentWindow?.postMessage(
                                {
                                    type: "setLocale",
                                    data: {
                                        locale: $locale,
                                    },
                                },
                                "*"
                            );
                        }
                    })
                );
                subscribeListeners.push(
                    availabilityStatusStore.subscribe((status) =>
                        iframeListener.sendAvailabilityStatusToChatIframe(status)
                    )
                );
                subscribeListeners.push(
                    chatVisibilityStore.subscribe((visibility) => {
                        try {
                            gameManager.getCurrentGameScene()?.onResize();
                        } catch (err) {
                            console.info("gameManager doesn't exist!", err);
                        }
                        iframeListener.sendChatVisibilityToChatIframe(visibility);
                    })
                );
                subscribeObservers.push(
                    adminMessagesService.messageStream.subscribe((message) => {
                        if (message.type === AdminMessageEventTypes.banned) {
                            chatIframe.remove();
                        }
                        chatVisibilityStore.set(false);
                        menuIconVisiblilityStore.set(false);
                    })
                );

                //TODO delete it with new XMPP integration
                //send list to chat iframe
                subscribeListeners.push(
                    writingStatusMessageStore.subscribe((list) => iframeListener.sendWritingStatusToChatIframe(list))
                );
                subscribeListeners.push(
                    peerStore.subscribe((list) => iframeListener.sendPeerConnexionStatusToChatIframe(list.size > 0))
                );
            }
        });
    });
    onDestroy(() => {
        iframeListener.unregisterIframe(chatIframe);
        subscribeListeners.forEach((listener) => {
            listener();
        });
        subscribeObservers.forEach((observer) => {
            observer.unsubscribe();
        });
    });

    function closeChat() {
        chatVisibilityStore.set(false);
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && $chatVisibilityStore) {
            closeChat();
            chatIframe.blur();
        } else if (e.key === "c" && !$chatVisibilityStore && !$mapEditorModeStore && $enableUserInputsStore) {
            chatVisibilityStore.set(true);
        }
    }

    function search() {
        if (!searchFilter) {
            searchFilter = {
                filterName: "myFirstFilter",
                spaceName: "http://play.workadventure.localhost/@/wa/workadventure-premium/public/space",
                filter: {
                    $case: "spaceFilterContainName",
                    spaceFilterContainName: {
                        value: searchElement.value,
                    },
                },
            } as SpaceFilterMessage;
            gameManager.getCurrentGameScene().connection?.emitAddSpaceFilter({ spaceFilterMessage: searchFilter });
        } else {
            if (searchElement.value === "") {
                gameManager
                    .getCurrentGameScene()
                    .connection?.emitRemoveSpaceFilter({ spaceFilterMessage: searchFilter });
                searchFilter = undefined;
            } else {
                searchFilter = {
                    ...searchFilter,
                    filter: {
                        $case: "spaceFilterContainName",
                        spaceFilterContainName: {
                            value: searchElement.value,
                        },
                    },
                } as SpaceFilterMessage;
                gameManager
                    .getCurrentGameScene()
                    .connection?.emitUpdateSpaceFilter({ spaceFilterMessage: searchFilter });
            }
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />
<div id="chatWindow" class:show={$chatVisibilityStore}>
    <input type="text" bind:this={searchElement} on:keydown={search} style="display: none;" />
    {#if $chatVisibilityStore}<div class="hide">
            <button class="close-window" on:click={closeChat}>&#215;</button>
        </div>{/if}
    <iframe
        id="chatWorkAdventure"
        bind:this={chatIframe}
        allow="fullscreen; clipboard-read; clipboard-write"
        title="WorkAdventureChat"
        src={CHAT_URL}
        class="tw-border-0"
    />
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";

    @include media-breakpoint-up(sm) {
        #chatWindow {
            width: 100% !important;
        }
    }

    #chatWindow {
        z-index: 1000;
        position: absolute;
        background-color: transparent;
        top: 0;
        left: -100%;
        height: 100%;
        width: 22%;
        min-width: 335px;
        transition: all 0.2s ease-in-out;
        pointer-events: none;
        visibility: hidden;
        &.show {
            left: 0;
            pointer-events: auto;
            visibility: visible;
        }
        iframe {
            width: 100%;
            height: 100%;
        }
        .hide {
            top: 13px;
            position: absolute;
            right: 12px;
            width: fit-content;
            height: fit-content;
            .close-window {
                height: 1.6rem;
                width: 1.6rem;
                position: initial;
                cursor: pointer;
            }
        }
    }
</style>
