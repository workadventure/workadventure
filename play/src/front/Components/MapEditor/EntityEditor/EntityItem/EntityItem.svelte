<script lang="ts">
    import type { EntityVariant } from "../../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import EntityImage from "./EntityImage.svelte";

    interface Props {
        entityVariant: EntityVariant;
        isActive: boolean;
        onselectentity?: (entityVariant: EntityVariant) => void;
    }

    let { entityVariant, isActive, onselectentity }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    data-testid="entity-item"
    class={`flex items-center justify-center box-border py-0.5 cursor-pointer border-solid border-transparent h-full w-full bg-white/10 rounded-2xl hover:bg-white/20 hover:border-white hover:animate-pulse ${
        isActive ? "border-solid border-yellow-400 rounded-2xl" : ""
    }`}
    onclick={() => onselectentity?.(entityVariant)}
>
    <EntityImage
        classNames="cursor-pointer w-14 h-14 object-contain rounded-md"
        imageSource={entityVariant.defaultPrefab.imagePath}
        imageAlt={entityVariant.defaultPrefab.name}
    />
</div>
