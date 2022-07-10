<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatMessagesStore, chatVisibilityStore } from "../../Stores/ChatStore";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import ChatElement from "./ChatElement.svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import LL from "../../i18n/i18n-svelte";
    import {
        mucRoomsStore,
        numberPresenceUserStore,
        xmppServerConnectionStatusStore,
    } from "../../Stores/MucRoomsStore";
    import UsersList from "./UsersList.svelte";
    import Spinner from "./Spinner.svelte";
    import Search from "../Util/Search.svelte";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };
    let autoscroll: boolean;

    beforeUpdate(() => {
        autoscroll = listDom && listDom.offsetHeight + listDom.scrollTop > listDom.scrollHeight - 20;
    });

    onMount(() => {
        listDom.scrollTo(0, listDom.scrollHeight);
    });

    afterUpdate(() => {
        if (autoscroll) listDom.scrollTo(0, listDom.scrollHeight);
    });

    function onClick(event: MouseEvent) {
        if (HtmlUtils.isClickedOutside(event, chatWindowElement)) {
            handleFormBlur.blur();
        }
    }

    function closeChat() {
        chatVisibilityStore.set(false);
    }

    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeChat();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" transition:fly={{ x: -1000, duration: 500 }} bind:this={chatWindowElement}>
    <p class="close-icon noselect" on:click={closeChat}>&times</p>

    <!-- LIST USER SECTION -->
    <section class="roomsList">
        <p class="system-text chat-rooms">{$LL.muc.title()}</p>
        {#if $numberPresenceUserStore > 0}
            <Search id="search-user-connected" />
        {/if}
        {#if $xmppServerConnectionStatusStore}
            {#each [...$mucRoomsStore] as mucRoom}
                <!--<p class="room-name">{mucRoom.name}</p> -->
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

    <!-- MESSAGE LIST SECTION -->
    <section class="messagesList" bind:this={listDom}>
        <p class="system-text">{$LL.chat.intro()}</p>
        <ul>
            {#each $chatMessagesStore as message, i}
                <li><ChatElement {message} line={i} /></li>
            {/each}
        </ul>
    </section>
    <section class="messageForm">
        <ChatMessageForm bind:handleForm={handleFormBlur} />
    </section>
</aside>

<style lang="scss">
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
        height: 100vh;
        width: 30vw;
        min-width: 350px;
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
                bottom: 0;
                margin-top: 35px;
                overflow-y: auto;
                height: auto;
                width: calc(30vw - 20px);
            }
        }
    }

    div.center {
        text-align: center;
    }

    div.reconnecting {
        margin-top: 3rem;
    }
</style>
