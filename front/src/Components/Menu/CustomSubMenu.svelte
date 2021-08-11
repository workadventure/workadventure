<script lang="ts">
    import {sendMenuClickedEvent} from "../../Api/iframe/Ui/MenuItem";

    export let menuCommand: string;

    function menuItemClicked() {
        sendMenuClickedEvent(menuCommand);
    }
</script>

<div>
    <button type="button" class="nes-btn is-primary" on:click|preventDefault={menuItemClicked}>{menuCommand}</button>
</div>