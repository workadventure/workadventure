<script lang="ts">
    import { onMount } from "svelte";
    import { blackListManager } from "../../WebRtc/BlackListManager";
    import { showReportScreenStore, userReportEmpty } from "../../Stores/ShowReportScreenStore";
    import { LL } from "../../../i18n/i18n-svelte";

    interface Props {
        userUUID?: string;
        userName: string;
    }

    let { userUUID, userName }: Props = $props();
    let userIsBlocked = $state(false);

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
        if (blackListManager.isBlackListed(userUUID)) {
            blackListManager.cancelBlackList(userUUID);
        } else {
            blackListManager.blackList(userUUID);
        }
        showReportScreenStore.set(userReportEmpty); //close the report menu
    }
</script>

<div class="flex flex-col text-left p-3">
    <section class="w-full">
        <h3 class="blue-title justify-start">{$LL.report.block.title()}</h3>
        <p>{$LL.report.block.content({ userName })}</p>
        <button
            type="button"
            data-testid="blockmenu-block-user-button"
            class="btn btn-danger w-full"
            onclick={(event) => {
                event.preventDefault();
                blockUser();
            }}
        >
            {userIsBlocked ? $LL.report.block.unblock() : $LL.report.block.block()}
        </button>
    </section>
</div>
