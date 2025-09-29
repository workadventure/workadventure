<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import {AreaDataPropertyWithoutId} from "@workadventure/map-editor";
    import AddPropertyButton from "../../../Components/MapEditor/PropertyEditor/AddPropertyButton.svelte";
    import {PUSHER_URL} from "../../../Enum/EnvironmentVariable";
    import docsLogo from "./images/icon-docs.svg";

    const dispatch = createEventDispatcher<{
        click: AreaDataPropertyWithoutId;
    }>();

    const LA_SUITE_DOCS_AREA_PUSHER_URL = new URL("laSuiteDocsArea", PUSHER_URL).toString();
</script>

<AddPropertyButton
    headerText="Open docs"
    descriptionText="Open a Doc (from La Suite Numérique)"
    img={docsLogo}
    style="z-index: 200"
    testId="laSuiteNumeriqueDocsButton"
    on:click={() => {
        dispatch("click", {
            type: "extensionModule",
            subtype: "laSuiteNumeriqueDocs",
            resourceUrl: LA_SUITE_DOCS_AREA_PUSHER_URL,
            serverData: {
                url: undefined,
                laSuiteNumeriqueDocsId: undefined,  
            },
        });
    }}
/>
