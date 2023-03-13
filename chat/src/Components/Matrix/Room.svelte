<script lang="ts">
    import { MatrixEvent, Room } from "matrix-js-sdk";
    import { Writable } from "svelte/store";
    import { selectedRoom } from "../../Stores/MatrixStore";
    import Header from "./Header.svelte";
    import { chatConnectionManager } from "../../Connection/ChatConnectionManager";
    import { onMount } from "svelte";
    import { RoomWrapper } from "../../Matrix/MatrixClient";
    import Button from "./Button.svelte";
    import Event from "./Event.svelte";
    import { ArrowLeftIcon, SettingsIcon, SearchIcon, UsersIcon } from "svelte-feather-icons";
    import Message from "./Message.svelte";

    let roomDiv: HTMLDivElement;
    export let roomWrapper: RoomWrapper;
    let room: Writable<Room> = roomWrapper.room;
    let messages: Writable<MatrixEvent[]> = roomWrapper.messages;

    function close() {
        selectedRoom.set(undefined);
    }

    onMount(async () => {
        await chatConnectionManager.matrixOrFail.roomInitialSync($room.roomId, 50);
    });
</script>

<Header title={$room.name} className="animation-slide-in-left" />
<div id="room" bind:this={roomDiv}>
    <div class="buttons animation-slide-in-left">
        <Button onClick={close} icon={ArrowLeftIcon} />
        <Button onClick={close} icon={UsersIcon} /><!-- text={$LL.members()} -->
        <Button onClick={close} icon={SearchIcon} />
        <!-- text={$LL.search()} -->
        <Button onClick={close} icon={SettingsIcon} />
        <!-- text={$LL.settings()} -->
    </div>
    <div id="messages">
        {#each $messages as message}
            {#if message.event.type !== "m.room.message"}
                <Event event={message} />
            {/if}
        {/each}
        <div class="tw-flex tw-flex-wrap tw-col tw-w-full">
            <Message
                type="sent"
                text="Trééééééééééés long message pour savoir si ça passe à la ligne quand il faut."
                author="Gaëlle"
                date={new Date()}
                showAvatar={false}
            />
            <Message
                type="sent"
                text="Petit message. 👍🏻"
                author="Gaëlle"
                date={new Date()}
                showAuthor={false}
                showAvatar={false}
            />
            <Message
                type="sent"
                text="Et un autre gros message sur deux lignes idéalement."
                author="Gaëlle"
                date={new Date()}
                showAuthor={false}
            />
            <Message
                type="received"
                text="Trééééééééééés long message pour savoir si ça passe à la ligne quand il faut."
                author="Gaëlle"
                date={new Date()}
                showAvatar={false}
            />
            <Message
                type="received"
                text="Petit message. 👍🏻"
                author="Gaëlle"
                date={new Date()}
                showAuthor={false}
                showAvatar={false}
            />
            <Message
                type="received"
                text="Et un autre gros message sur deux lignes idéalement."
                author="Gaëlle"
                date={new Date()}
                showAuthor={false}
            />
        </div>
    </div>
</div>

<style lang="scss">
    #room {
        @apply tw-px-2;
        .buttons {
            @apply tw-flex tw-items-center;
        }
        #messages {
            @apply tw-flex tw-flex-wrap tw-items-center tw-flex-col;
        }
    }
</style>
