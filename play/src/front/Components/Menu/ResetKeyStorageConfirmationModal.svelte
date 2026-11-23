<script lang="ts">
    import Popup from "../Modal/Popup.svelte";
    import Button from "../UI/Button.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { getMatrixSecurity } from "../../Chat/Connection/Matrix/getMatrixSecurity";
    import { IconAlertTriangle } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen }: Props = $props();
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h1 class="text-2xl font-bold">{$LL.menu.chat.resetKeyStorageConfirmationModal.title()}</h1>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-4 text-start">
            <p class="m-0 text-base text-white/80">{$LL.menu.chat.resetKeyStorageConfirmationModal.content()}</p>
            <div class="flex gap-3 p-4 rounded-xl border border-solid border-danger-400/40 bg-danger-400/10">
                <IconAlertTriangle class="text-danger-400 shrink-0" font-size="22" />
                <ul class="m-0 ps-4 flex flex-col gap-2 text-sm text-white/90">
                    <li>{$LL.menu.chat.resetKeyStorageConfirmationModal.loseHistory()}</li>
                    <li>{$LL.menu.chat.resetKeyStorageConfirmationModal.oldSecretsStop()}</li>
                    <li>{$LL.menu.chat.resetKeyStorageConfirmationModal.newSecretsNext()}</li>
                </ul>
            </div>
        </div>
    {/snippet}
    {#snippet action()}
        <div class="flex w-full gap-2">
            <Button variant="light" appearance="ghost" class="flex-1" onclick={() => modals.close()}>
                {$LL.menu.chat.resetKeyStorageConfirmationModal.cancel()}
            </Button>
            <Button
                variant="danger"
                class="flex-1"
                dataTestId="confirmResetKeyStorageButton"
                onclick={() => {
                    modals.close();
                    getMatrixSecurity()
                        .then((matrixSecurity) => matrixSecurity.setupNewKeyStorage())
                        .catch(() => {
                            console.error("Failed to setup new key storage");
                        });
                }}
            >
                {$LL.menu.chat.resetKeyStorageConfirmationModal.continue()}
            </Button>
        </div>
    {/snippet}
</Popup>
