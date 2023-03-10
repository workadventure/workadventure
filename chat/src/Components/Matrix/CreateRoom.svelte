<script lang="ts">
    import Line from "./Line.svelte";
    import {XIcon} from "svelte-feather-icons";
    import {chatConnectionManager} from "../../Connection/ChatConnectionManager";

    let name = "";
    export let close: () => void;

    async function createRoom() {
        await chatConnectionManager.connectionOrFail.createRoom(name);
        close();
    }
</script>

<div>
    <Line text="Create a new chat" buttonIcon={XIcon} onClick={close}/>
    <input type="text" placeholder="Chat name" class={`tw-w-full`} bind:value={name} />
    <button type="button" class="light tw-m-auto tw-cursor-pointer tw-px-3" on:click={createRoom}>Create</button>
</div>

<style lang="scss">
    div {
      @apply tw-text-white;
      animation: slideRight 200ms;
    }
    @keyframes slideRight {
      0% {
        transform: translateX(25%);
        opacity: 0;
      }
      80% {
        opacity: 1;
      }
      100% {
        transform: translateX(0px);
      }
    }
</style>