<script lang="ts">
    import { LL } from "../../../../i18n/i18n-svelte";
    import { askDialogStore } from "../../../Stores/MeetingStore";

    function acceptRequest(uuid: string) {
        askDialogStore.acceptAskDialog(uuid);
    }

    function refuseRequest(uuid: string) {
        askDialogStore.refuseAskDialog(uuid);
    }
</script>

{#if $askDialogStore.size > 0}
    {#each [...$askDialogStore] as askDialog (askDialog.userId)}
        <div
            class="interact-menu blue-dialog-box outline-light tw-text-center tw-w-72 tw-absolute tw-bottom-36 tw-left-0 tw-right-0 tw-pointer-events-auto tw-z-[150] tw-m-auto"
        >
            <p class="tw-mt-2">
                {#if askDialog.userName} {askDialog.userName}: {/if}
                {askDialog.message}
            </p>
            <div class="tw-flex tw-flex-row tw-justify-evenly">
                <button type="button" class="btn light accept-request" on:click={() => acceptRequest(askDialog.uuid)}
                    >{$LL.follow.interactMenu.yes()}</button
                >
                <button
                    type="button"
                    class="btn outline refuse-request"
                    on:click|preventDefault={() => refuseRequest(askDialog.uuid)}>{$LL.follow.interactMenu.no()}</button
                >
            </div>
        </div>
    {/each}
{/if}
