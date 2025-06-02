<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import PropertyEditorBase from "../../../Components/MapEditor/PropertyEditor/PropertyEditorBase.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import {
        LaSuiteNumeriqueDocsPropertyData,
        //TeamsAreaMapEditorData,
    } from "../../../../common/external-modules/lasuitenumerique-docs/MapEditor/types";
    import InputSwitch from "../../../Components/Input/InputSwitch.svelte";
    import RangeSlider from "../../../Components/Input/RangeSlider.svelte";
    import DocsLogoSvg from "./images/icon-docs.svg";
    export let property: LaSuiteNumeriqueDocsPropertyData;
    //export let extensionModuleAreaMapEditor: TeamsAreaMapEditorData;


    const dispatch = createEventDispatcher<{
        change: LaSuiteNumeriqueDocsPropertyData["data"];
        close: void;
    }>();
    let optionAdvancedActivated = false;
    //let canOpenAutomatically = false;

    function onValueChange() {
        /*if (!property.data) {
            property.data = {
                width: 50,
                shouldOpenAutomatically: false,
            };
        }*/

        dispatch("change", property.data);
    }

    onMount(() => {
        if (!property.data) {
            property.data = {
                width: 50,
                //shouldOpenAutomatically: false,
            };
        }
    });
</script>

<PropertyEditorBase on:close={() => dispatch("close")}>
    <span slot="header" class="flex justify-center items-center">
        <img class="w-6 mr-1" src={DocsLogoSvg} alt="Docs logo" />
        Docs (Suite Numérique)
    </span>
    <span slot="content">
        <InputSwitch
            id="laSuiteNumeriqueDocsToggleAdvancedOption"
            label={optionAdvancedActivated ? "Clear advanced option" : $LL.mapEditor.properties.advancedOptions()}
            bind:value={optionAdvancedActivated}
        />
        {#if optionAdvancedActivated}
            <div class="advanced-option px-2 flex-row items-center gap-2">
                <RangeSlider
                        label={$LL.mapEditor.properties.jitsiProperties.width()}
                        min={15}
                        max={85}
                        placeholder="50"
                        bind:value={property.data.width}
                        onChange={onValueChange}
                        variant="secondary"
                        buttonShape="square"
                />
            </div>

<!--            <div class="advanced-option px-2 flex flex-row items-center gap-2">
                <input
                        id="openAutomaticallyChatLabel"
                        data-testid="shouldOpenAutomaticallyCheckbox"
                        type="checkbox"
                        class="w-4 h-4"
                        class:opacity-20={!canOpenAutomatically}
                        bind:checked={shouldOpenAutomatically}
                        on:change={onValueChange}
                        disabled={!canOpenAutomatically}
                />
                <label class="m-0 p-0" for="openAutomaticallyChatLabel" class:opacity-50={!canOpenAutomatically}
                >Open Docs automatically {!canOpenAutomatically ? "(disabled)" : ""}</label
                >
            </div> -->

        {/if}
    </span>
</PropertyEditorBase>
