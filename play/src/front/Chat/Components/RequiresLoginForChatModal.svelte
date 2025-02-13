<script lang="ts">
    import { closeModal } from "svelte-modals";
    import Popup from "../../Components/Modal/Popup.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";

    export let isOpen: boolean;

    const goToLoginPage = () => {
        analyticsClient.login();
        window.location.href = "/login";
    };
</script>

<Popup {isOpen}>
    <h3 slot="title">{$LL.chat.requiresLoginForChatModal.title()}</h3>
    <div slot="content" class="w-full flex flex-col gap-2 text-center">
        {$LL.chat.requiresLoginForChatModal.content_1()} <br />
        {$LL.chat.requiresLoginForChatModal.content_2()}<br />
        {$LL.chat.requiresLoginForChatModal.content_3()}
    </div>

    <svelte:fragment slot="action">
        <button class="flex-1 justify-center" on:click={closeModal}>{$LL.chat.createFolder.buttons.cancel()}</button>
        <button
            class="disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
            on:click={goToLoginPage}
            >{$LL.menu.profile.login()}
        </button>
    </svelte:fragment>
</Popup>
