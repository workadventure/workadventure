<script lang="ts">
    import { MatrixEvent, Room } from "matrix-js-sdk";
    import { Writable } from "svelte/store";
    import { selectedRoom } from "../../../Stores/MatrixStore";
    import Header from "../Ui/Header.svelte";
    import { chatConnectionManager } from "../../../Connection/ChatConnectionManager";
    import { onMount } from "svelte";
    import { RoomWrapper } from "../../../Matrix/MatrixClient";
    import Button from "../Ui/Button.svelte";
    import { ArrowLeftIcon, SettingsIcon, SearchIcon, UsersIcon } from "svelte-feather-icons";
	import MessageForm from "../Wrapper/MessageForm.svelte";
	import Messages from "../Wrapper/Messages.svelte";

    let roomDiv: HTMLDivElement;
    export let roomWrapper: RoomWrapper;
    let room: Writable<Room> = roomWrapper.room;

    function close() {
        selectedRoom.set(undefined);
    }

	async function send(text: string) {
		console.log(await chatConnectionManager.matrixOrFail.sendTextMessage($room.roomId, text));
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
    <Messages messages={roomWrapper.messages}/>
	<MessageForm onSend={send}/>
</div>

<style lang="scss">
    #room {
        @apply tw-px-2 tw-flex tw-flex-col tw-overflow-hidden;
		height: calc( 100% - 60px );
        .buttons {
            @apply tw-flex tw-items-center;
        }
        #messages {
            @apply tw-flex tw-flex-wrap tw-items-center tw-flex-col tw-flex-1 tw-overflow-y-scroll tw-overflow-x-hidden tw-justify-end tw-pb-2;
        }
    }
</style>
