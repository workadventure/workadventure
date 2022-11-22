<script lang="ts">
    import {mapEditorSelectedEntityStore} from "../../Stores/MapEditorStore"
</script>
<div>
{#if $mapEditorSelectedEntityStore === undefined}
Select an object modify its property
{:else}
<div>name : {$mapEditorSelectedEntityStore}</div> 
<button>Test Interaction</button>
<button>Delete</button>
{/if}
</div>