<script lang="ts">
    import Popup from "../Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { matrixSecurity } from "../../Chat/Connection/Matrix/MatrixSecurity";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen }: Props = $props();
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1>{$LL.menu.chat.resetKeyStorageConfirmationModal.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div>
            <p class="w-full text-center">{$LL.menu.chat.resetKeyStorageConfirmationModal.content()}</p>
            <p class="w-full text-center">{$LL.menu.chat.resetKeyStorageConfirmationModal.warning()}</p>
        </div>
    {/snippet}
    {#snippet action()}
        <button class="btn flex-1 justify-center" onclick={() => modals.close()}
            >{$LL.menu.chat.resetKeyStorageConfirmationModal.cancel()}
        </button>
        <button
            class="btn btn-secondary disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
            onclick={() => {
                modals.close();
                matrixSecurity.setupNewKeyStorage().catch(() => {
                    console.error("Failed to setup new key storage");
                });
            }}
        >
            {$LL.menu.chat.resetKeyStorageConfirmationModal.continue()}
        </button>
    {/snippet}
</Popup>
