<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";
    import type { ListenerMegaphonePropertyData } from "@workadventure/map-editor";
    import { SpeakerMegaphonePropertyData } from "@workadventure/map-editor";

    import { LL } from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Select from "../../Input/Select.svelte";
    import InputSwitch from "../../Input/InputSwitch.svelte";
    import { IconEar } from "../../Icons";
    import Input from "../../Input/Input.svelte";

    import { getEmbedLink } from "../../../Utils/EmbedLink";
    import PropertyEditorBase from "./PropertyEditorBase.svelte";

    interface Props {
        property: ListenerMegaphonePropertyData;
        onchange?: () => void;
        onclose?: () => void;
    }

    let { property = $bindable(), onchange, onclose }: Props = $props();

    function onValueChange() {
        onchange?.();
    }

    function getSpeakerZoneNames() {
        const areasName = new SvelteMap<string, string>();
        const wamFile = gameManager.getCurrentGameScene().getGameMap().getWamFile();
        if (!wamFile) {
            return areasName;
        }

        wamFile
            .getGameMapAreas()
            .getAreas()
            .forEach((area) => {
                const speakerMegaphonePropertyRaw = area.properties?.find(
                    (areaProperty) => areaProperty.type === "speakerMegaphone",
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

    let linkError = $state(false);
    async function verifyMediaLink() {
        linkError = false;
        if (!property.waitingLink) {
            onValueChange();
            return;
        }
        try {
            const embedLink = await getEmbedLink(property.waitingLink);
            if (property.waitingLink != embedLink) property.waitingLink = embedLink;
        } catch {
            linkError = true;
        } finally {
            onValueChange();
        }
    }
</script>

<PropertyEditorBase
    onclose={() => {
        onclose?.();
    }}
>
    {#snippet header()}
        <span class="flex justify-center items-center">
            <IconEar font-size="18" class="mr-2" />
            {$LL.mapEditor.properties.listenerMegaphone.label()}
        </span>
    {/snippet}
    {#snippet content()}
        <span>
            <Select
                id="speakerZoneSelector"
                label={$LL.mapEditor.properties.listenerMegaphone.nameLabel()}
                bind:value={property.speakerZoneName}
                onchange={onValueChange}
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
                onchange={verifyMediaLink}
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
                    onchange={onValueChange}
                />
            </div>
            <div class="value-switch">
                <InputSwitch
                    id="allowTalking"
                    label={$LL.mapEditor.properties.allowTalking()}
                    bind:value={property.allowTalking}
                    onchange={onValueChange}
                />
            </div>
        </span>
    {/snippet}
</PropertyEditorBase>
