<script lang="ts">
    import Popup from "../../Components/Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { modals } from "@wa-modals";

    interface Props {
        isOpen: boolean;
    }

    let { isOpen }: Props = $props();

    const goToLoginPage = () => {
        analyticsClient.login();
        window.location.href = "/login";
    };
</script>

<Popup {isOpen}>
    {#snippet title()}
        <h3>{$LL.chat.requiresLoginForChatModal.title()}</h3>
    {/snippet}
    {#snippet content()}
        <div class="w-full flex flex-col gap-2 text-left">
            {$LL.chat.requiresLoginForChatModal.content_1()}<br />
            {$LL.chat.requiresLoginForChatModal.content_2()}<br />
            {$LL.chat.requiresLoginForChatModal.content_3()}
        </div>
    {/snippet}

    {#snippet action()}
        <button
            class="btn border border-solid border-white/10 hover:bg-white/10 flex-1 justify-center"
            onclick={() => modals.close()}>{$LL.chat.createFolder.buttons.cancel()}</button
        >
        <button
            class="btn disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
            onclick={goToLoginPage}
            >{$LL.menu.profile.login()}
        </button>
    {/snippet}
</Popup>
