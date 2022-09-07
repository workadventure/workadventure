<script lang="ts">
    import { chatVisibilityStore, writingStatusMessageStore } from "../../Stores/ChatStore";
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import { getColorByString } from "../Video/utils";
    import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
    import { derived, get, Unsubscriber, writable } from "svelte/store";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { CHAT_URL } from "../../Enum/EnvironmentVariable";
    import { locale } from "../../i18n/i18n-svelte";
    import { AdminMessageEventTypes, adminMessagesService } from "../../Connexion/AdminMessagesService";
    import { menuIconVisiblilityStore } from "../../Stores/MenuStore";
    import { Subscription } from "rxjs";
    import { availabilityStatusStore } from "../../Stores/MediaStore";
    import { peerStore } from "../../Stores/PeerStore";
    import { connectionManager } from "../../Connexion/ConnectionManager";

    let chatIframe: HTMLIFrameElement;

    let subscribeListeners: Array<Unsubscriber> = [];

    const wokaDefinedStore = writable<boolean>(false);
    const iframeLoadedStore = writable<boolean>(false);

    export const canSendInitMessageStore = derived(
        [wokaDefinedStore, iframeLoadedStore],
        ([$wokaDefinedStore, $iframeLoadedStore]) => $wokaDefinedStore && $iframeLoadedStore
    );

    // Phantom woka
    let wokaSrc =
        " data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAdCAYAAABBsffGAAAB/ElEQVRIia1WMW7CQBC8EAoqFy74AD1FqNzkAUi09DROwwN4Ag+gMQ09dcQXXNHQIucBPAJFc2Iue+dd40QZycLc7c7N7d7u+cU9wXw+ryyL0+n00eU9tCZIOp1O/f/ZbBbmzuczX6uuRVTlIAYpCSeTScumaZqw0OVyURd47SIGaZ7n6s4wjmc0Grn7/e6yLFtcr9dPaaOGhcTEeDxu2dxut2hXUJ9ioKmW0IidMg6/NPmD1EmqtojTBWAvE26SW8r+YhfIu87zbyB5BiRerVYtikXxXuLRuK058HABMyz/AX8UHwXgV0NRaEXzDKzaw+EQCioo1yrsLfvyjwZrTvK0yp/xh/o+JwbFhFYgFRNqzGEIB1ZhH2INkXJZoShn2WNSgJRNS/qoYSHxer1+qkhChnC320ULRI1LEsNhv99HISBkLmhP/7L8OfqhiKC6SzEJtSTLHMkGFhK6XC79L89rmtC6rv0YfjXV9COPDwtVQxEc2ZflIu7R+WADQrkA7eCH5BdFwQRXQ8bKxXejeWFoYZGCQM7Yh7BAkcw0DEnEEPHhbjBPQfCDvwzlEINlWZq3OAiOx2O0KwAKU8gehXfzu2Wz2VQMTXqCeLZZSNvtVv20MFsu48gQpDvjuHYxE+ZHESBPSJ/x3sqBvhe0hc5vRXkfypBY4xGcc9+lcFxartG6LgAAAABJRU5ErkJggg==";
    const playUri = window.location.protocol + "//" + window.location.hostname + window.location.pathname;
    const name = localUserStore.getName();

    let messageStream: Subscription;

    onMount(() => {
        iframeListener.registerChatIframe(chatIframe);
        chatIframe.addEventListener("load", () => {
            iframeLoadedStore.set(false);
            if (chatIframe && chatIframe.contentWindow && "postMessage" in chatIframe.contentWindow) {
                iframeLoadedStore.set(true);
                subscribeListeners.push(
                    locale.subscribe((value) => {
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
                subscribeListeners.push(
                    canSendInitMessageStore.subscribe((value) => {
                        if (value) {
                            chatIframe?.contentWindow?.postMessage(
                                {
                                    type: "userData",
                                    data: {
                                        ...localUserStore.getLocalUser(),
                                        name,
                                        playUri,
                                        authToken: localUserStore.getAuthToken(),
                                        color: getColorByString(name ?? ""),
                                        woka: wokaSrc,
                                        isLogged: localUserStore.isLogged(),
                                        availabilityStatus: get(availabilityStatusStore),
                                        roomName: connectionManager.currentRoom?.roomName ?? null,
                                        visitCardUrl: gameManager.myVisitCardUrl,
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
                            iframeListener.sendSettingsToChatIframe();
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
                messageStream = adminMessagesService.messageStream.subscribe((message) => {
                    if (message.type === AdminMessageEventTypes.banned) {
                        chatIframe.remove();
                    }
                    chatVisibilityStore.set(false);
                    menuIconVisiblilityStore.set(false);
                });
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
        if (messageStream) {
            messageStream.unsubscribe();
        }
    });

    function closeChat() {
        chatVisibilityStore.set(false);
    }
    function openChat() {
        chatVisibilityStore.set(true);
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape" && $chatVisibilityStore) {
            closeChat();
            chatIframe.blur();
        } else if (e.key === "c" && !$chatVisibilityStore) {
            openChat();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} />
<div id="chatWindow" class:show={$chatVisibilityStore}>
    {#if $chatVisibilityStore}<button class="hide" on:click={closeChat}>&#215;</button>{/if}
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
    @import "../../../style/breakpoints.scss";

    @include media-breakpoint-up(sm) {
        #chatWindow {
            width: calc(100% - 20px) !important;
        }
    }

    #chatWindow {
        z-index: 1000;
        position: absolute;
        background-color: transparent;
        top: 0;
        left: -100%;
        height: 100%;
        width: 28%;
        min-width: 335px;
        transition: all 0.2s ease-in-out;
        pointer-events: none;
        visibility: hidden;
        //display: none;
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
            top: 1%;
            padding: 0 5px 0 3px;
            min-height: fit-content;
            position: absolute;
            right: -21px;
            z-index: -1;
            font-size: 21px;
            border-bottom-left-radius: 0;
            border-top-left-radius: 0;
            background: rgba(27, 27, 41, 0.95);
        }
    }
</style>
