<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { ListenerMegaphonePropertyData, SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Select from "../../Input/Select.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: ListenerMegaphonePropertyData;

    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
    }>();

    function onValueChange() {
        dispatch("change");
    }
    function getSpeakerZoneNames() {
        let areasName = new Map<string, string>();
        gameManager
            .getCurrentGameScene()
            .getGameMap()
            .getGameMapAreas()
            ?.getAreas()
            .forEach((area) => {
                const speakerMegaphonePropertyRaw = area.properties?.find(
                    (property) => property.type === "speakerMegaphone"
                );
                if (speakerMegaphonePropertyRaw) {
                    const speakerMegaphoneProperty =
                        SpeakerMegaphonePropertyData.safeParse(speakerMegaphonePropertyRaw);
                    if (speakerMegaphoneProperty.success) {
                        areasName.set(area.id, speakerMegaphoneProperty.data.name);
                    }
                }
            });
        return areasName;
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <img
            class="w-6 me-2"
            src="resources/icons/icon_listener.png"
            alt={$LL.mapEditor.properties.listenerMegaphoneProperties.description()}
        />
        {$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
    </span>
    <span slot="content">
        <div>
            <Select
                id="speakerZoneSelector"
                label={$LL.mapEditor.properties.listenerMegaphoneProperties.nameLabel()}
                bind:value={property.speakerZoneName}
                onChange={onValueChange}
            >
                {#each [...getSpeakerZoneNames()] as [id, speakerZoneName] (id)}
                    <option value={id}>{speakerZoneName}</option>
                {/each}
            </Select>
        </div>
        <div class="value-switch">
            <InputSwitch
                id="chatEnabled"
                label={$LL.mapEditor.properties.chatEnabled()}
                bind:value={property.chatEnabled}
                onChange={onValueChange}
            />
        </div>
    </span>
</PropertyEditorBase>
