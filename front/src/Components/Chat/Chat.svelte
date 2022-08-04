<script lang="ts">
    import { chatVisibilityStore } from "../../Stores/ChatStore";
    import { onDestroy, onMount } from "svelte";
    import { iframeListener } from "../../Api/IframeListener";
    import { localUserStore } from "../../Connexion/LocalUserStore";
    import { getColorByString } from "../Video/utils";
    import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
    import { derived, Unsubscriber, writable } from "svelte/store";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { CHAT_URL } from "../../Enum/EnvironmentVariable";
    import { locale } from "../../i18n/i18n-svelte";
    import { AdminMessageEventTypes, adminMessagesService } from "../../Connexion/AdminMessagesService";
    import { menuIconVisiblilityStore } from "../../Stores/MenuStore";
    import { Subscription } from "rxjs";

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
    const playUri = document.location.toString().split("#")[0].toString();
    const name = localUserStore.getName();

    let messageStream: Subscription;

    onMount(() => {
        iframeListener.registerIframe(chatIframe);
        chatIframe.addEventListener("load", () => {
            iframeLoadedStore.set(false);
            if (chatIframe && chatIframe.contentWindow && "postMessage" in chatIframe.contentWindow) {
                iframeLoadedStore.set(true);
            }
        });
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
            chatVisibilityStore.subscribe(() => {
                try {
                    gameManager.getCurrentGameScene()?.onResize();
                } catch (err) {
                    console.info("gameManager doesn't exist!", err);
                }
            })
        );
        messageStream = adminMessagesService.messageStream.subscribe((message) => {
            if (message.type === AdminMessageEventTypes.banned) {
                chatIframe.remove();
            }
            chatVisibilityStore.set(false);
            menuIconVisiblilityStore.set(false);
        });
    });
    onDestroy(() => {
        iframeListener.unregisterIframe(chatIframe);
        subscribeListeners.forEach((listener) => {
            listener();
        });
        messageStream.unsubscribe();
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
    {#if $chatVisibilityStore}<button class="hide" on:click={closeChat}>&lsaquo</button>{/if}
    <iframe
        id="chatWorkAdventure"
        bind:this={chatIframe}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        allow="fullscreen; clipboard-read; clipboard-write"
        title="WorkAdventureChat"
        src={CHAT_URL}
        class="tw-border-0"
    />
</div>

<style lang="scss">
    #chatWindow {
        z-index: 1000;
        position: absolute;
        background-color: transparent;
        top: 0;
        left: -100%;
        height: 100vh;
        width: 28vw;
        min-width: 250px;
        transition: all 0.2s ease-in-out;
        pointer-events: none;
        visibility: hidden;
        //display: none;
        &.show {
            left: 0;
            pointer-events: auto;
            visibility: visible;
            //display: block;
        }
        iframe {
            width: 100%;
            height: 100%;
        }
        .hide {
            top: 1%;
            padding: 0 7px 2px 6px;
            min-height: fit-content;
            position: absolute;
            right: -21px;
            z-index: -1;
            font-size: 20px;
            border-bottom-left-radius: 0;
            border-top-left-radius: 0;
            background: rgba(27, 27, 41, 0.95);
        }
    }
</style>
