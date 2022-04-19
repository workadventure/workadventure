<script lang="ts">
    import { fly } from "svelte/transition";
    import {
        mucRoomsStore,
        mucRoomsVisibilityStore,
        xmppServerConnectionStatusStore,
    } from "../../Stores/MucRoomsStore";
    import UsersList from "./UsersList.svelte";
    import Spinner from "./Spinner.svelte";
    import LL from "../../i18n/i18n-svelte";

    let chatWindowElement: HTMLElement;
    //let handleFormBlur: { blur():void };

    /*function onClick(event: MouseEvent) {
        if (HtmlUtils.isClickedOutside(event, chatWindowElement)) {
            handleFormBlur.blur();
        }
    }*/

    function closeChat() {
        mucRoomsVisibilityStore.set(false);
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeChat();
        }
    }
</script>

<!-- <svelte:window on:keydown={onKeyDown} on:click={onClick}/> -->
<svelte:window on:keydown={onKeyDown} />

<aside class="chatWindow" transition:fly={{ x: -1000, duration: 500 }} bind:this={chatWindowElement}>
    <p class="close-icon" on:click={closeChat}>&times</p>
    {#if $xmppServerConnectionStatusStore}
        <section class="roomsList">
            {#each [...$mucRoomsStore] as mucRoom}
                <p>{mucRoom.name}</p>
                <UsersList usersListStore={mucRoom.getPresenceStore()} />
            {/each}
        </section>
    {:else}
        <div class="reconnecting center">{$LL.muc.mucRoom.reconnecting()}</div>
        <div class="center"><Spinner /></div>
    {/if}
</aside>

<style lang="scss">
    div.reconnecting {
        margin-top: 3rem;
    }

    div.center {
        text-align: center;
    }

    p.close-icon {
        position: absolute;
        padding: 4px;
        right: 12px;
        font-size: 30px;
        line-height: 25px;
        cursor: pointer;
    }

    aside.chatWindow {
        z-index: 800;
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

        .roomsList {
            margin-top: 35px;
            overflow-y: auto;
            flex: auto;
        }
    }
</style>
