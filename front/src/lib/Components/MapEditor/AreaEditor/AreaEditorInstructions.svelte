<script lang="ts">
    import DrowAreaGif from "../../images/draw-area.gif";
    import { LL } from "../../../../i18n/i18n-svelte";
</script>

<div class="area-name-container">
    <h3>{$LL.mapEditor.areaEditorInstructions.title()}</h3>
    <p>{$LL.mapEditor.areaEditorInstructions.description()}</p>
    <img src={DrowAreaGif} class="w-full" alt={$LL.mapEditor.areaEditorInstructions.description()} />
</div>

<style lang="scss">
</style>
