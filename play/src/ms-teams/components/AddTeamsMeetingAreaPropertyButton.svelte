<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import AddPropertyButton from "../../front/Components/MapEditor/PropertyEditor/AddPropertyButton.svelte";
    import teamsLogo from "./TeamsLogo.png";

    const dispatch = createEventDispatcher();
</script>

<AddPropertyButton
    headerText="Open meeting"
    descriptionText="Open a new meeting in new tab"
    img={teamsLogo}
    style={`z-index: 200`}
    on:click={(event) => {
        dispatch("click", event);
    }}
/>
