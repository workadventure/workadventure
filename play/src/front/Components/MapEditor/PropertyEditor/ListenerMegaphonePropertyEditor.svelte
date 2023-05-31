<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { ListenerMegaphonePropertyData, SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import { HeadphonesIcon } from "svelte-feather-icons";
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
        <HeadphonesIcon class="tw-w-6 tw-mr-1" />
        {$LL.mapEditor.properties.listenerMegaphoneProperties.label()}
    </span>
    <span slot="content">
        <div>
            <label class="tw-m-0" for="trigger"
                >{$LL.mapEditor.properties.listenerMegaphoneProperties.nameLabel()}</label
            >
            <select
                id="trigger"
                class=" tw-m-0 tw-w-full"
                bind:value={property.speakerZoneName}
                on:change={onValueChange}
            >
                {#each [...getSpeakerZoneNames()] as [id, speakerZoneName]}
                    <option value={id}>{speakerZoneName}</option>
                {/each}
            </select>
        </div>
    </span>
</PropertyEditorBase>

<style lang="scss">
    .value-input {
        display: flex;
        width: 100%;
        margin-bottom: 0.5em;
        margin-top: 0.5em;
        flex-direction: column;
        label {
            min-width: fit-content;
            margin-right: 0.5em;
        }
        input {
            flex-grow: 1;
            min-width: 0;
        }
        * {
            margin-bottom: 0;
        }
    }
</style>
