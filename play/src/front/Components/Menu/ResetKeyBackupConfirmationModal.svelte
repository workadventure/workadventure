<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { matrixSecurity } from "../../Chat/Connection/Matrix/MatrixSecurity";

    export let isOpen: boolean;
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.menu.chat.resetKeyBackupConfirmationModal.title()}</h1>
    <div slot="content">
        <p>{$LL.menu.chat.resetKeyBackupConfirmationModal.content()}</p>
    </div>
    <svelte:fragment slot="action">
        <button class="tw-flex-1 tw-justify-center" on:click={() => closeModal()}
            >{$LL.menu.chat.resetKeyBackupConfirmationModal.cancel()}
        </button>
        <button
            class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
            on:click={() => {
                closeModal();
                matrixSecurity.setupNewKeyBackup().catch(() => {
                    console.error("Failed to setup new key backup");
                });
            }}
            >{$LL.menu.chat.resetKeyBackupConfirmationModal.continue()}
        </button>
    </svelte:fragment>
</Popup>
