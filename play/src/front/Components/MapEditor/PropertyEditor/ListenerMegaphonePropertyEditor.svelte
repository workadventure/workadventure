<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { ListenerMegaphonePropertyData, SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    export let property: ListenerMegaphonePropertyData;

    const dispatch = createEventDispatcher();

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
    <span slot="header" class="tw-flex tw-justify-center tw-items-center">
        <img
            class="tw-w-6 tw-mr-1"
            src="resources/icons/icon_listener.png"
            alt={$LL.mapEditor.properties.listenerMegaphoneProperties.description()}
        />
        {$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
    </span>
    <span slot="content">
        <div>
            <label for="speakerZoneSelector">{$LL.mapEditor.properties.listenerMegaphoneProperties.nameLabel()}</label>
            <select
                id="speakerZoneSelector"
                class="tw-w-full"
                bind:value={property.speakerZoneName}
                on:change={onValueChange}
            >
                {#each [...getSpeakerZoneNames()] as [id, speakerZoneName] (id)}
                    <option value={id}>{speakerZoneName}</option>
                {/each}
            </select>
        </div>
        <div class="value-switch">
            <label for="chatEnabled">{$LL.mapEditor.properties.chatEnabled()}</label>
            <input
                id="chatEnabled"
                type="checkbox"
                class="input-switch"
                bind:checked={property.chatEnabled}
                on:change={onValueChange}
            />
        </div>
    </span>
</PropertyEditorBase>
