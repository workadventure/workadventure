<script lang="ts">
    import {mapEditorSelectedEntityStore} from "../../Stores/MapEditorStore"
</script>
<div>
{#if $mapEditorSelectedEntityStore === undefined}
Select an object modify its property
{:else}
<div>x : {$mapEditorSelectedEntityStore.getEntityData().x}</div> 
<div>y : {$mapEditorSelectedEntityStore.getEntityData().y}</div> 
<button>Test Interaction</button>
<button>Delete</button>
{/if}
</div>