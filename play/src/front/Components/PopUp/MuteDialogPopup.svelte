<script lang="ts">
    import { readable } from "svelte/store";
    import { LL } from "../../../i18n/i18n-svelte";
    import type { SpaceUserExtended } from "../../Space/SpaceInterface";
    import Woka from "../Woka/Woka.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    interface Props {
        sender: SpaceUserExtended | undefined;
        message: string;
        acceptRequest: () => void;
        refuseRequest: () => void;
    }

    let { sender, message, acceptRequest, refuseRequest }: Props = $props();

    let pictureStore = $derived(sender ? sender.pictureStore : readable<string | undefined>(undefined));
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="interact-menu blue-dialog-box outline-light text-center w-72 pointer-events-auto m-auto">
        <div class="flex flex-row justify-center items-center">
            {#if sender}
                <div class="flex-0">
                    <Woka src={$pictureStore ?? ""} />
                    <div class="text-sm bold">{sender.name}</div>
                </div>
            {/if}
            <div class="flex-1">
                {message}
            </div>
        </div>
    </div>
    {#snippet buttons()}
        <button
            type="button"
            class="btn btn-outline w-1/2 max-w-80 justify-center responsive-message refuse-request"
            onclick={(event) => {
                event.preventDefault();
                refuseRequest();
            }}
        >
            {$LL.follow.interactMenu.no()}
        </button>
        <button
            type="button"
            class="btn btn-secondary w-1/2 max-w-80 justify-center responsive-message accept-request"
            onclick={acceptRequest}
        >
            {$LL.follow.interactMenu.yes()}
        </button>
    {/snippet}
</PopUpContainer>
