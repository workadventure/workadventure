<script lang="ts">
    import { fly } from "svelte/transition";
    import { SettingsIcon, ArrowLeftIcon, MessageCircleIcon } from "svelte-feather-icons";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import LL from "../i18n/i18n-svelte";
    import { activeThreadStore, settingsViewStore } from "../Stores/ActiveThreadStore";
    import ChatMessagesList from "./ChatMessagesList.svelte";
    import {onDestroy, onMount} from "svelte";
    import {SingleRoom} from "../Xmpp/SingleRoom";
    import {User} from "../Xmpp/AbstractRoom";
    import {mucRoomsStore} from "../Stores/MucRoomsStore";
    import {Unsubscriber} from "svelte/store";
    import Loader from "./Loader.svelte";

    export let singleRoom: SingleRoom;

    let messagesList: ChatMessagesList;

    let userTargeted: User;

    let subscribeListeners = new Array<Unsubscriber>();

    onMount(() => {
        subscribeListeners.push(mucRoomsStore.getDefaultRoom().getPresenceStore().subscribe(users => {
            if(users.has(singleRoom.jid)) {
                userTargeted = users.get(singleRoom.jid);
            }
        }));
    });

    onDestroy(() => {
        settingsViewStore.set(false);
        subscribeListeners.forEach((listener) => {
            listener();
        });
    });


    function getColorOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
                return "tw-text-pop-green";
            case 2:
                return "tw-text-pop-red";
            case 3:
                return "tw-text-orange";
            case 4:
                return "tw-text-light-blue";
            default:
                return "tw-text-pop-red";
        }
    }

    function getNameOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
                return $LL.status.online();
            case 2:
                return $LL.status.away();
            case 3:
                return $LL.status.unavailable();
            case 4:
                return $LL.status.meeting();
            default:
                return $LL.userList.disconnected();
        }
    }

</script>

{#if userTargeted}
<!-- thread -->
    <div class="wa-thread-head">
        <div
                class="tw-border tw-border-transparent tw-border-r-light-purple tw-border-solid tw-py-1 tw-pr-2 tw-border-t-0 tw-border-b-0 tw-self-stretch tw-flex tw-justify-center tw-align-middle"
        >
            <button
                    class="exit tw-text-lighter-purple tw-m-0"
                    on:click={() => {
                    activeThreadStore.reset();
                }}
            >
                <ArrowLeftIcon />
            </button>
        </div>
        <div class="tw-text-center tw-pt-1 tw-pb-2">
            <div class="tw-text-center tw-font-bold">
                {userTargeted.name}
            </div>
            <div
                    class={`tw-text-xs ${getColorOfAvailabilityStatus(userTargeted.availabilityStatus)} tw-mt-0`}
            >
                {getNameOfAvailabilityStatus(userTargeted.availabilityStatus)}
            </div>
        </div>
        <div
                id="settings"
                class="tw-border tw-border-transparent tw-border-l-light-purple tw-border-solid tw-py-1 tw-pl-2 tw-border-t-0 tw-border-b-0 tw-self-stretch tw-flex tw-justify-center tw-align-middle"
                on:click={() => settingsViewStore.set(!$settingsViewStore)}
        >
            <button class="tw-text-lighter-purple tw-m-0">
                {#if $settingsViewStore}
                    <MessageCircleIcon />
                {:else}
                    <SettingsIcon />
                {/if}
            </button>
        </div>
    </div>
    {#if $settingsViewStore}
        <div
                in:fly={{ y: -100, duration: 100, delay: 200 }}
                out:fly={{ y: -100, duration: 100 }}
                class="tw-flex tw-flex-col tw-flex-auto tw-w-full"
                style="margin-top: 52px"
        >
            <div
                    class="wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5 tw-pb-0.5"
            >
            </div>
            <div class="wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5">
                <p class="tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Chat One-to-one</p>
                <p>Nickname : {userTargeted.name}</p>
                <p>RoomName : {userTargeted.roomName}</p>
            </div>

        </div>
    {:else}
        <ChatMessagesList mucRoom={singleRoom} bind:this={messagesList} />

        <div class="messageForm">
            <ChatMessageForm mucRoom={singleRoom} on:scrollDown={messagesList.scrollDown} />
        </div>
    {/if}
{:else}
    <Loader text={$LL.waitingData()} />
{/if}

<style lang="scss">
  .messageForm {
    position: fixed;
    bottom: 0;
    width: 100%;
  }
</style>
