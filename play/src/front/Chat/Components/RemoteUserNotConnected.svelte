<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../../Components/Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";

    export let callUserCallback: () => void;
    export let userName: string;

    function _handleCallUser() {
        closeModal();
        callUserCallback();
    }
</script>

<Popup isOpen={true}>
    <h3 slot="title">{$LL.chat.remoteUserNotConnected.title()}</h3>
    <div slot="content" class="w-full flex flex-col gap-2 text-left">
        <p class="m-0 p-0">{$LL.chat.remoteUserNotConnected.descriptionNotConnected()}</p>
        <p class="m-0 p-0">{$LL.chat.remoteUserNotConnected.descriptionWalkToCallHim()}</p>
    </div>

    <svelte:fragment slot="action">
        <button
            class="btn border border-solid border-white/10 hover:bg-white/10 flex-1 justify-center"
            on:click={closeModal}>{$LL.chat.createFolder.buttons.cancel()}</button
        >
        <button
            class="btn disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
            on:click={_handleCallUser}
            >{$LL.chat.remoteUserNotConnected.call({ userName })}
        </button>
    </svelte:fragment>
</Popup>
