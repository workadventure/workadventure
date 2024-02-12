<script lang="ts">
    import {EntityVariant} from "../../../Phaser/Game/MapEditor/Entities/EntityVariant";

    export let entityVariant: EntityVariant;
    export let isActive: boolean;
    export let onPickEntityVariant: (entityVariant: EntityVariant) => void;

    let imageElementRef : HTMLImageElement;

    function retryImageLoading(){
        imageElementRef.src = entityVariant.defaultPrefab.imagePath
    }
</script>

<div
    class={`tw-cursor-pointer tw-flex tw-flex-[0_0_4em] tw-h-[4em] tw-m-[0_0.25rem] hover:tw-rounded-2xl hover:tw-border-solid  ${
        isActive ? "tw-border-solid tw-border-[yellow] tw-rounded-2xl" : ""
    }`}
    on:click={() => onPickEntityVariant(entityVariant)}
>
    <img
        class="tw-cursor-pointer tw-max-w-[3.6em] tw-max-h-[3.6em] tw-m-auto"
        src={entityVariant.defaultPrefab.imagePath}
        alt={entityVariant.defaultPrefab.name}
        bind:this={imageElementRef}
        on:error={()=>retryImageLoading()}
    />
</div>

