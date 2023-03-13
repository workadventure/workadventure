<script lang="ts">
    import {XIcon} from "svelte-feather-icons";
    import {chatConnectionManager} from "../../Connection/ChatConnectionManager";
    import Button from "./Button.svelte";

    let name = "";
    export let close: () => void;

    async function createRoom() {
        await chatConnectionManager.connectionOrFail.createRoom(name);
        close();
    }
</script>

<div>
    <div class="tw-flex tw-flex-wrap tw-justify-between tw-items-center tw-p-2">
        <h1 class="tw-text-2xl tw-font-bold">Create a new chat</h1>
        <Button icon={XIcon} onClick={close}/>
    </div>
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