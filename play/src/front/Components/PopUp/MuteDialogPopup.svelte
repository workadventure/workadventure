<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { SpaceUserExtended } from "../../Space/SpaceFilter/SpaceFilter";
    import Woka from "../Woka/Woka.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    export let sender: SpaceUserExtended | undefined;
    export let message: string;
    export let acceptRequest: () => void;
    export let refuseRequest: () => void;
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    <div class="interact-menu blue-dialog-box outline-light text-center w-72 pointer-events-auto m-auto">
        <div class="flex flex-row justify-center items-center">
            {#if sender}
                <div class="flex-0">
                    <Woka src={sender.getWokaBase64} />
                    <div class="text-sm bold">{sender.name}</div>
                </div>
            {/if}
            <div class="flex-1">
                {message}
            </div>
        </div>
    </div>
    <svelte:fragment slot="buttons">
        <button
            type="button"
            class="btn btn-outline w-1/2 max-w-80 justify-center responsive-message refuse-request"
            on:click|preventDefault={() => refuseRequest()}>{$LL.follow.interactMenu.no()}</button
        >
        <button
            type="button"
            class="btn btn-secondary w-1/2 max-w-80 justify-center responsive-message accept-request"
            on:click={() => acceptRequest()}>{$LL.follow.interactMenu.yes()}</button
        >
    </svelte:fragment>
</PopUpContainer>
