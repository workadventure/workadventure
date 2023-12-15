<script lang="ts">
    import { onMount } from "svelte";
    import { blackListManager } from "../../WebRtc/BlackListManager";
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { LL } from "../../../i18n/i18n-svelte";

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

<div class="tw-flex tw-flex-col tw-text-left tw-p-3">
    <section class="tw-w-full">
        <h3 class="blue-title tw-justify-start">{$LL.report.block.title()}</h3>
        <p>{$LL.report.block.content({ userName })}</p>
        <button type="button" class="btn danger" on:click|preventDefault={blockUser}>
            {userIsBlocked ? $LL.report.block.unblock() : $LL.report.block.block()}
        </button>
    </section>
</div>
