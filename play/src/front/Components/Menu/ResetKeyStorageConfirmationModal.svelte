<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { matrixSecurity } from "../../Chat/Connection/Matrix/MatrixSecurity";

    export let isOpen: boolean;
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.menu.chat.resetKeyStorageConfirmationModal.title()}</h1>
    <div slot="content">
        <p class="w-full text-center">{$LL.menu.chat.resetKeyStorageConfirmationModal.content()}</p>
        <p class="w-full text-center">{$LL.menu.chat.resetKeyStorageConfirmationModal.warning()}</p>
    </div>
    <svelte:fragment slot="action">
        <button class="btn flex-1 justify-center" on:click={() => closeModal()}
            >{$LL.menu.chat.resetKeyStorageConfirmationModal.cancel()}
        </button>
        <button
            class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
            on:click={() => {
                closeModal();
                matrixSecurity.setupNewKeyStorage().catch(() => {
                    console.error("Failed to setup new key storage");
                });
            }}
            >{$LL.menu.chat.resetKeyStorageConfirmationModal.continue()}
        </button>
    </svelte:fragment>
</Popup>
