<script>
    import { createEventDispatcher } from "svelte";
    import PropertyEditorBase from "../../front/Components/MapEditor/PropertyEditor/PropertyEditorBase.svelte";

    const dispatch = createEventDispatcher();
</script>

<PropertyEditorBase on:close={() => dispatch("close")}>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">Microsoft teams meeting</span>
    <span slot="content">
        <p>Entering in this area, a user will enter in Microsoft team meeting automatically.</p>
    </span>
</PropertyEditorBase>
