<script lang="ts">
    import { modals, Modals } from "@wa-modals";
</script>

<Modals>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    {#snippet backdrop()}
        <div class="backdrop" onclick={() => modals.close()}></div>
    {/snippet}
</Modals>

<style>
    .backdrop {
        position: fixed;
        top: 0;
        bottom: 0;
        right: 0;
        left: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2000;
        pointer-events: auto;
    }
</style>
