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
        <p class="tw-w-full tw-text-center">{$LL.menu.chat.resetKeyStorageConfirmationModal.content()}</p>
        <p class="tw-w-full tw-text-center">{$LL.menu.chat.resetKeyStorageConfirmationModal.warning()}</p>
    </div>
    <svelte:fragment slot="action">
        <button class="tw-flex-1 tw-justify-center" on:click={() => closeModal()}
            >{$LL.menu.chat.resetKeyStorageConfirmationModal.cancel()}
        </button>
        <button
            class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
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
