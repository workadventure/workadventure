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
    import { availabilityStatusStore } from "../../Stores/MediaStore";

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
                    iframeListener.sendSettingsToChatIframe();
                }
            })
        );
        subscribeListeners.push(
            chatVisibilityStore.subscribe((visibility) => {
                try {
                    gameManager.getCurrentGameScene()?.onResize();
                } catch (err) {
                    console.info("gameManager doesn't exist!", err);
                }
                try {
                    iframeListener.sendChatVisibilityToChatIframe(visibility);
                } catch (err) {
                    console.error("Send chat visibility to chat iFrame", err);
                }
            })
        );
        subscribeListeners.push(
            availabilityStatusStore.subscribe((status) => {
                iframeListener.postMessageToChat({
                    type: "availabilityStatus",
                    data: status,
                });
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
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        title="WorkAdventureChat"
        src={CHAT_URL}
        class="tw-border-0"
    />
</div>

<!--
<aside class="chatWindow" transition:fly={{ x: -1000, duration: 500 }} bind:this={chatWindowElement}>
    <p class="close-icon noselect" on:click={closeChat}>&times</p>

    < LIST USER SECTION >
    <section class="roomsList">
        <p class="system-text chat-rooms">{$LL.muc.title()}</p>
        {#if $numberPresenceUserStore > 0}
            <Search id="search-user-connected" />
        {/if}
        {#if $xmppServerConnectionStatusStore}
            {#each [...$mucRoomsStore] as mucRoom}
                <p class="room-name">{mucRoom.name}</p>
                <UsersList
                    usersListStore={mucRoom.getPresenceStore()}
                    teleportStore={mucRoom.getTeleportStore()}
                    on:goTo={(event) => mucRoom.goTo(event.detail.type, event.detail.roomId, event.detail.uuid)}
                />
            {/each}
        {:else}
            <div class="reconnecting center">{$LL.muc.mucRoom.reconnecting()}</div>
            <div class="center"><Spinner /></div>
        {/if}
    </section>

    <MESSAGE LIST SECTION>
    <section class="messagesList" bind:this={listDom}>
        <p class="system-text">{$LL.chat.intro()}</p>
        <ul>
            {#each $chatMessagesStore as message, i}
                <li>
                    <ChatElement {message} line={i} />
                </li>
            {/each}
        </ul>
    </section>
    <section class="messageForm">
        <ChatMessageForm bind:handleForm={handleFormBlur} />
    </section>
</aside>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    p.close-icon {
        position: absolute;
        padding: 4px;
        right: 12px;
        font-size: 30px;
        line-height: 25px;
        cursor: pointer;
    }

    p.system-text {
        border-radius: 8px;
        padding: 6px;
        overflow-wrap: break-word;
        max-width: 100%;
        background: gray;
        display: inline-block;
        position: fixed;
    }

    p.system-text.chat-rooms {
        margin-top: -50px;
    }

    aside.chatWindow {
        z-index: 1000;
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        height: 95%;
        width: 95%;
        background: rgb(5, 31, 51, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;

        padding: 10px;

        border-bottom-right-radius: 16px;
        border-top-right-radius: 16px;

        section {
            &.roomsList {
                margin-top: 35px;
                overflow-y: auto;
                height: auto;
                max-height: 50%;
                flex: inherit;
                padding-top: 50px;

                /*p.room-name {
                    margin-top: 10px;
                }*/
            }

            &.messagesList {
                margin-top: 35px;
                overflow-y: auto;
                height: auto;
                max-height: 80%;

                ul {
                    list-style-type: none;
                    padding-left: 0;

                    li:nth-child(1) {
                        margin-top: 40px;
                    }
                }
            }

            &.messageForm {
                position: fixed;
                bottom: 10px;
                height: auto;
            }
        }

        .messageForm {
            flex: 0 70px;
            padding-top: 15px;
        }
    }

    div.center {
        text-align: center;
    }

    div.reconnecting {
        margin-top: 3rem;
    }

    @include media-breakpoint-up(xxl) {
        aside.chatWindow {
            height: 100vh;
            width: 30vw;
        }
    }

    @include media-breakpoint-up(sm) {
        aside.chatWindow {
            height: calc(99vh - 50px);
            width: 95vw;
        }
    }
</style>
-->
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
