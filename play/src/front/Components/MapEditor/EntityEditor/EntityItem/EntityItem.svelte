<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { EntityVariant } from "../../../../Phaser/Game/MapEditor/Entities/EntityVariant";
    import EntityImage from "./EntityImage.svelte";

    export let entityVariant: EntityVariant;
    export let isActive: boolean;

    const dispatch = createEventDispatcher<{
        selectEntity: EntityVariant;
    }>();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    data-testid="entity-item"
    class={`flex items-center justify-center box-border py-0.5 cursor-pointer border-solid border-transparent h-full w-full bg-white/10 rounded-2xl hover:bg-white/20 hover:border-white hover:animate-pulse ${
        isActive ? "border-solid border-yellow-400 rounded-2xl" : ""
    }`}
    on:click={() => dispatch("selectEntity", entityVariant)}
>
    <EntityImage
        classNames="cursor-pointer w-14 h-14 object-contain rounded-md"
        imageSource={entityVariant.defaultPrefab.imagePath}
        imageAlt={entityVariant.defaultPrefab.name}
    />
</div>
