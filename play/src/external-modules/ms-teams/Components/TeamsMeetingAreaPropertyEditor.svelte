<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import PropertyEditorBase from "../../../front/Components/MapEditor/PropertyEditor/PropertyEditorBase.svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { TeamsMeetingPropertyData } from "../MapEditor/types";
    import TeamsLogoSvg from "./images/business.svg";

    export let property: TeamsMeetingPropertyData;

    const dispatch = createEventDispatcher();
    let optionAdvancedActivated = false;

    function onValueChange() {
        dispatch("change", property.data);
    }

    function toggleAdvancedOption() {
        optionAdvancedActivated = !optionAdvancedActivated;
    }

    onMount(() => {
        console.log("property", property);
    });
</script>

<PropertyEditorBase on:close={() => dispatch("close")}>
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img class="tw-w-6 tw-mr-1" src={TeamsLogoSvg} alt="Teams logo" />
        Microsoft Teams
    </span>
    <span slot="content">
        <p>Entering in this area, a user will enter in Microsoft team meeting automatically.</p>
        <div class="value-switch">
            <label for="advancedOption">{$LL.mapEditor.properties.advancedOptions()}</label>
            <input id="advancedOption" type="checkbox" class="input-switch" on:change={toggleAdvancedOption} />
        </div>
        {#if optionAdvancedActivated}
            <div class="advanced-option tw-px-2">
                <div class="value-input tw-flex tw-flex-col">
                    <label for="teamsMeetingId">Teams meeting id</label>
                    <input
                        id="teamsMeetingId"
                        type="text"
                        placeholder="Teams meeting id"
                        bind:value={property.data}
                        on:change={onValueChange}
                    />
                </div>
            </div>
        {/if}
    </span>
</PropertyEditorBase>
