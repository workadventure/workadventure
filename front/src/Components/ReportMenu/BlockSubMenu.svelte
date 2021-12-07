<script lang="ts">
    import { blackListManager } from "../../WebRtc/BlackListManager";
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { onMount } from "svelte";

    export let userUUID: string | undefined;
    export let userName: string;
    let userIsBlocked = false;

    onMount(() => {
        if (userUUID === undefined) {
            userIsBlocked = false;
            console.error("There is no user to block");
        } else {
            userIsBlocked = blackListManager.isBlackListed(userUUID);
        }
    });

    function blockUser(): void {
        if (userUUID === undefined) {
            console.error("There is no user to block");
            return;
        }
        blackListManager.isBlackListed(userUUID)
            ? blackListManager.cancelBlackList(userUUID)
            : blackListManager.blackList(userUUID);
        showReportScreenStore.set(userReportEmpty); //close the report menu
    }
</script>

<div class="block-container">
    <h3>Block</h3>
    <p>Block any communication from and to {userName}. This can be reverted.</p>
    <button type="button" class="nes-btn is-error" on:click|preventDefault={blockUser}>
        {userIsBlocked ? "Unblock this user" : "Block this user"}
    </button>
</div>

<style lang="scss">
    div.block-container {
        text-align: center;
    }
</style>
