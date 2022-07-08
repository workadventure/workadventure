<script lang="ts">
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../Utils/HtmlUtils";
    import {connectionStore} from "../Stores/ConnectionStore";
    import Loader from "./Loader.svelte";
    import {mucRoomsStore, xmppServerConnectionStatusStore} from "../Stores/MucRoomsStore";
    import UsersList from "./UsersList.svelte";
    import {MucRoom} from "../Xmpp/MucRoom";
    import {userStore} from "../Stores/LocalUserStore";
    import LL from "../i18n/i18n-svelte";
    import {localeDetector} from "../i18n/locales";
    import {locale} from "../i18n/i18n-svelte";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };
    let autoscroll: boolean;

    let searchValue = '';
    let showUsers = true;
    let activeThread: unknown = null;

    beforeUpdate(() => {
        autoscroll = listDom && listDom.offsetHeight + listDom.scrollTop > listDom.scrollHeight - 20;
    });

    onMount(() => {
        if(!$locale){
            localeDetector();
        }
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

    function handleActiveThread(event: any){
        activeThread = event.detail;
    }
    function handleShowUsers(){
        showUsers = !showUsers;
    }

    function closeChat() {
        window.parent.postMessage({ type: "closeChat" }, "*");
        //document.activeElement?.blur();
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeChat();
        }
    }

    const defaultRoom = (): MucRoom => {
        const defaultMucRoom = [...$mucRoomsStore].find(mucRoom => mucRoom.name.toLocaleLowerCase() === 'default');
        if(!defaultMucRoom){
            throw new Error('No default MucRoom');
        }
        return defaultMucRoom;
    }

    console.info("Chat fully loaded");
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" bind:this={chatWindowElement}>
    <section class="tw-p-0 tw-m-0" bind:this={listDom}>
        {#if !$connectionStore || !$xmppServerConnectionStatusStore}
            <Loader text={$userStore?$LL.reconnecting():$LL.waitingData()}/>
        {:else}
                <div>
                    <!-- searchbar -->
                    <div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
                        <div class="tw-p-3">
                            <input
                                    class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-p-3 tw-pl-6 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                                    placeholder={$LL.search()}
                                    bind:value={searchValue}
                            />
                        </div>
                    </div>
                    <!-- chat users -->
                    <UsersList
                            usersListStore={defaultRoom().getPresenceStore()}
                            showUsers={showUsers}
                            searchValue={searchValue.toLocaleLowerCase()}
                            on:activeThread={handleActiveThread}
                            on:showUsers={handleShowUsers}
                            on:goTo={(event) => defaultRoom().goTo(event.detail.type, event.detail.roomId, event.detail.uuid)}
                    />
                </div>
        {/if}
    </section>
</aside>

<style lang="scss">
    aside.chatWindow {
        z-index: 1000;
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        min-height: 100vh;
        width: 100%;
        min-width: 350px;
        background: rgba(#1b1b29, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;
    }
</style>
