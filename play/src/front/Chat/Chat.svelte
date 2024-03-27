<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import type { Subscription } from "rxjs";
    import { onDestroy, onMount } from "svelte";
    import { derived} from "svelte/store";
    import { SpaceFilterMessage } from "@workadventure/messages";
    import {fly} from 'svelte/transition'
    import { enableUserInputsStore } from "../Stores/UserInputStore";
    import { iframeListener } from "../Api/IframeListener";
    import { gameManager } from "../Phaser/Game/GameManager";
    import { gameSceneIsLoadedStore } from "../Stores/GameSceneStore";
    import { mapEditorModeStore } from "../Stores/MapEditorStore";
    import { chatVisibilityStore, iframeLoadedStore, wokaDefinedStore } from "../Stores/ChatStore";
    import { LocalSpaceProviderSingleton } from "../Space/SpaceProvider/SpaceStore";
    import { WORLD_SPACE_NAME } from "../Space/Space";
    import NewChat from "./Components/NewChat.svelte";

    let chatIframe: HTMLIFrameElement;
    let searchElement: HTMLInputElement;

    let searchFilter: SpaceFilterMessage | undefined = undefined;

    let subscribeListeners: Array<Unsubscriber> = [];
    let subscribeObservers: Array<Subscription> = [];

    export const canSendInitMessageStore = derived(
        [wokaDefinedStore, iframeLoadedStore, gameSceneIsLoadedStore],
        ([$wokaDefinedStore, $iframeLoadedStore, $gameSceneIsLoadedStore]) =>
            $wokaDefinedStore && $iframeLoadedStore && $gameSceneIsLoadedStore
    );

    // Phantom woka
   // let wokaSrc =
    //    " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";
   // const playUri = window.location.protocol + "//" + window.location.hostname + window.location.pathname;
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
        console.log('on mount chat.svelte')
        //iframeListener.registerChatIframe(chatIframe);
        //iframeLoadedStore.set(true);
        /*
        chatIframe.addEventListener("load", () => {
            iframeLoadedStore.set(false);
            if (chatIframe && chatIframe.contentWindow && "postMessage" in chatIframe.contentWindow) {
                iframeLoadedStore.set(true);
                subscribeListeners.push(
                    currentPlayerWokaStore.subscribe((value) => {
                        if (value !== undefined) {
                            wokaSrc = value;
                            wokaDefinedStore.set(true);
                        }
                    })
                );
                subscribeListeners.push(
                    canSendInitMessageStore.subscribe((value) => {
                        if (value) {            
                            name = name.replace(emojiRegex, "");
                                userStore.set({
                                        email : localUserStore.getLocalUser()?.email,
                                        uuid : localUserStore.getLocalUser()?.uuid||"",
                                        name,
                                        playUri,
                                        authToken: localUserStore.getAuthToken()||undefined,
                                        color: Color.getColorByString(name ?? ""),
                                        woka: wokaSrc,
                                        isLogged: localUserStore.isLogged(),
                                        availabilityStatus: get(availabilityStatusStore),
                                        roomName: connectionManager.currentRoom?.roomName ?? "default",
                                        visitCardUrl: gameManager.myVisitCardUrl,
                                        userRoomToken: gameManager.getCurrentGameScene().connection?.userRoomToken,
                                        klaxoonToolActivated: connectionManager.currentRoom?.klaxoonToolActivated||false,
                                        youtubeToolActivated: connectionManager.currentRoom?.youtubeToolActivated||false,
                                        googleDocsToolActivated: connectionManager.currentRoom?.googleDocsToolActivated||false,
                                        googleSheetsToolActivated:
                                            connectionManager.currentRoom?.googleSheetsToolActivated||false,
                                        googleSlidesToolActivated:
                                            connectionManager.currentRoom?.googleSlidesToolActivated||false,
                                        klaxoonToolClientId: connectionManager.currentRoom?.klaxoonToolClientId,
                                        eraserToolActivated: connectionManager.currentRoom?.eraserToolActivated||false,
                                    });

                                chatConnectionManager.initUser(
                                    playUri,
                                    localUserStore.getLocalUser()?.uuid||"",
                                    connectionManager.currentRoom?.klaxoonToolActivated||false,
                                    connectionManager.currentRoom?.youtubeToolActivated||false,
                                    connectionManager.currentRoom?.googleDocsToolActivated||false,
                                    connectionManager.currentRoom?.googleSheetsToolActivated||false,
                                    connectionManager.currentRoom?.googleSlidesToolActivated||false,
                                    connectionManager.currentRoom?.eraserToolActivated||false,
                                    localUserStore.getAuthToken()||"",
                                    connectionManager.currentRoom?.klaxoonToolClientId
                                );
                                if (chatConnectionManager.connection) {
                                    mucRoomsStore.sendUserInfos();
                                }
                        }
                    })
                );
                subscribeListeners.push(
                    // a supprimer 
                    chatVisibilityStore.subscribe((visibility) => {
                        try {
                            gameManager.getCurrentGameScene()?.onResize();
                        } catch (err) {
                            console.info("gameManager doesn't exist!", err);
                        }
                        if (!visibility) {
                            activeThreadStore.reset();
                        } else if (get(chatPeerConnectionInProgress) || get(timelineMessagesToSee) > 0) {
                            timelineActiveStore.set(true);
                        } else if (mucRoomsStore.getChatZones()) {
                            activeThreadStore.set(mucRoomsStore.getChatZones());
                        }
                                    })
                );

                subscribeObservers.push(
                    adminMessagesService.messageStream.subscribe((message) => {
                        if (message.type === AdminMessageEventTypes.banned) {
                            chatVisibilityStore.set(false);
                        }
                        chatVisibilityStore.set(false);
                        menuIconVisiblilityStore.set(false);
                    })
                );

                //TODO delete it with new XMPP integration
                //send list to chat iframe
                subscribeListeners.push(
                    writingStatusMessageStore.subscribe((list) => {
                        const usersTyping: Array<{
                            jid?: string;
                            name?: string;
                            }> = Array.from(list).map((user : {
                                userJid?: string;
                                name?: string;
                                })=>{
                            return {
                            jid: user.userJid === "fake" ? undefined : user.userJid,
                            name: user.name,
                            }
                        });

        writingStatusMessageStore.set(usersTyping);
                    })
                );
                subscribeListeners.push(
                    peerStore.subscribe((list) => {
                        const status = (list.size > 0)
                        chatPeerConnectionInProgress.set(status);
                        showTimelineStore.set(status);
                    })
                );
            }
        });
        */
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
        const spaceStore = LocalSpaceProviderSingleton.getInstance();
        const filterName = 'searchUser'
        const spaceFilter =  spaceStore.get(WORLD_SPACE_NAME).watch(filterName);

        if (!searchFilter) {

            searchFilter = {
                filterName: "myFirstFilter",
                spaceName: WORLD_SPACE_NAME,
                filter: {
                    $case: "spaceFilterContainName",
                    spaceFilterContainName: {
                        value: searchElement.value,
                    },
                },
            } as SpaceFilterMessage;

            spaceFilter.setFilter(searchFilter.filter);

        } else {
            if (searchElement.value === "") {
                spaceFilter.destroy();
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

                spaceFilter.setFilter(searchFilter.filter)
            }
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />
{#if $chatVisibilityStore}
    <div id="chatWindow"
    transition:fly={{ duration: 200,x:-335 }}
    class="tw-resize-x tw-overflow-hidden tw-bg-white">
        <input type="text" bind:this={searchElement} on:keydown={search} style="display: none;" />
        <button class="close-window " on:click={closeChat}>&#215;</button>    
        <NewChat/> 
    </div>
{/if}


<style lang="scss">
    @import "../style/breakpoints.scss";
    @include media-breakpoint-up(sm) {
        #chatWindow {
            width: 100% !important;
        }
    }

    #chatWindow {
        display: flex;
        flex-direction: column;
        z-index: 1000;
        position: absolute;
        background-color: transparent;
        top: 0;
        //left: -100%;
        height: 100vh;
        width: 22%;
        min-width: 335px;
       // transition: all 0.2s ease-in-out;
        pointer-events: none;
        //visibility: hidden;
        /*&.show {
            left: 0;
            pointer-events: auto;
            visibility: visible;
        }*/
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
