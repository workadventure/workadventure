<script lang="ts">
    import { closeModal, Modals } from "svelte-modals";
</script>

<Modals>
    <div slot="backdrop" class="backdrop" on:click={closeModal} />
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
