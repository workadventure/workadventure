<script lang="ts">
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import LL from "../../i18n/i18n-svelte";
    import {gameManager} from "../../Phaser/Game/GameManager";
    import {urlManager} from "../../Url/UrlManager";

    export let userUUID: string | undefined;
    export let userName: string;

    function banUser(): void {
        if (userUUID === undefined) {
            console.error("There is no user to block");
            return;
        }
        gameManager.getCurrentGameScene().connection?.emitBanUserByUuid(urlManager.getPlayUri(), userUUID, userName, "Message");
        showReportScreenStore.set(userReportEmpty);
    }
</script>

<div class="block-container">
    <h3>{$LL.report.ban.title()}</h3>
    <p>{$LL.report.ban.content({ userName })}</p>
    <button type="button" class="nes-btn is-error" on:click|preventDefault={banUser}>
        {$LL.report.ban.ban()}
    </button>
</div>

<style lang="scss">
    div.block-container {
        text-align: center;
    }
</style>
