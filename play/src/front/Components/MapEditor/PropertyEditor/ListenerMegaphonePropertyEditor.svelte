<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { ListenerMegaphonePropertyData } from "@workadventure/map-editor";
    import { SpeakerMegaphonePropertyData } from "@workadventure/map-editor";
    import { MediaLinkManager } from "@workadventure/shared-utils";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Select from "../../Input/Select.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import { IconEar } from "../../Icons";
    import Input from "../../Input/Input.svelte";
    import { connectionManager } from "../../../Connection/ConnectionManager";
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

    let linkError = false;
    async function verifyMediaLink() {
        linkError = false;
        if (!property.waitingLink) {
            onValueChange();
            return;
        }
        try {
            const mediaLink = new MediaLinkManager(property.waitingLink);
            const embedLink = await mediaLink.getEmbedLink({
                klaxoonId: connectionManager.klaxoonToolClientId,
                excalidrawDomains: connectionManager.excalidrawToolDomains,
            });
            if (property.waitingLink != embedLink) property.waitingLink = embedLink;
        } catch {
            linkError = true;
        } finally {
            onValueChange();
        }
    }
</script>

<PropertyEditorBase
    on:close={() => {
        dispatch("close");
    }}
>
    <span slot="header" class="flex justify-center items-center">
        <IconEar font-size="18" class="mr-2" />
        {$LL.mapEditor.properties.listenerMegaphone.label()}
    </span>
    <span slot="content">
        <Select
            id="speakerZoneSelector"
            label={$LL.mapEditor.properties.listenerMegaphone.nameLabel()}
            bind:value={property.speakerZoneName}
            onChange={onValueChange}
        >
            {#each [...getSpeakerZoneNames()] as [id, speakerZoneName] (id)}
                <option value={id}>{speakerZoneName}</option>
            {/each}
        </Select>
        <Input
            id="waitingWebLink"
            type="text"
            label={$LL.mapEditor.properties.listenerMegaphone.waitingMediaLinkLabel()}
            placeholder={$LL.mapEditor.properties.listenerMegaphone.waitingMediaLinkPlaceholder()}
            bind:value={property.waitingLink}
            onChange={verifyMediaLink}
        />
        {#if linkError}
            <p data-testid="applicationLinkError" class="text-xs text-red-500 p-0 m-0 h-fit w-full">
                {$LL.mapEditor.properties.listenerMegaphone.waitingMedialLinkError()}
            </p>
            <p data-testid="applicationLinkError" class="text-xs text-red-500 p-0 m-0 h-fit w-full">
                {$LL.mapEditor.properties.listenerMegaphone.waitingMedialLinkHelp()}
            </p>
        {/if}
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
