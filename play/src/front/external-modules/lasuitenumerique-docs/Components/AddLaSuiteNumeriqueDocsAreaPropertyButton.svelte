<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import AddPropertyButton from "../../../Components/MapEditor/PropertyEditor/AddPropertyButton.svelte";
    import docsLogo from "./images/icon-docs.svg";

    const dispatch = createEventDispatcher<{
        click: CustomEvent<undefined>;
    }>();
</script>

<AddPropertyButton
    headerText="Open docs"
    descriptionText="Open a Doc (from La Suite Numérique)"
    img={docsLogo}
    style="z-index: 200"
    testId="laSuiteNumeriqueDocsButton"
    on:click={(event) => {
        dispatch("click", event);
    }}
/>
