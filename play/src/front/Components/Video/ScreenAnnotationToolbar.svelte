<script lang="ts">
    import { presenterToolStore, type ActivePresenterTool } from "../../Stores/PresenterEffectStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { screenAnnotationManager } from "../../Space/ScreenAnnotation/ScreenAnnotationManager";
    import {
        ANNOTATION_COLORS,
        currentAnnotationColorStore,
        currentAnnotationToolStore,
        localAnnotationTargetStore,
        screenAnnotationEnabledStore,
        screenAnnotationLocallyHiddenStore,
        type AnnotationTool,
    } from "../../Stores/ScreenAnnotationStore";
    import {
        IconArrowBackUp,
        IconArrowForwardUp,
        IconEyeOff,
        IconPointer,
        IconArrowNarrowRight,
        IconEraser,
        IconLine,
        IconPencil,
        IconSquare,
        IconTrash,
        IconTypography,
        IconUsersGroup,
        IconX,
    } from "@wa-icons";

    interface Props {
        // spaceUserId of the user sharing the screen.
        targetUserId: string;
        // True when the local user is the one sharing this screen.
        isPresenter: boolean;
        presenterEffects?: boolean;
    }

    let { targetUserId, isPresenter, presenterEffects = false }: Props = $props();
    const presenterTools: ActivePresenterTool[] = ["laser", "spotlight", "loupe"];

    let active = $derived($localAnnotationTargetStore === targetUserId);
    let currentTool = $derived($currentAnnotationToolStore);
    let currentColor = $derived($currentAnnotationColorStore);
    let othersAllowed = $derived($screenAnnotationEnabledStore.get(targetUserId) ?? false);

    let tools = $derived<{ id: AnnotationTool; icon: typeof IconPencil; label: string }[]>([
        { id: "pointer", icon: IconPointer, label: $LL.screenAnnotation.tools.pointer() },
        { id: "pen", icon: IconPencil, label: $LL.screenAnnotation.tools.pen() },
        { id: "line", icon: IconLine, label: $LL.screenAnnotation.tools.line() },
        { id: "arrow", icon: IconArrowNarrowRight, label: $LL.screenAnnotation.tools.arrow() },
        { id: "rect", icon: IconSquare, label: $LL.screenAnnotation.tools.rect() },
        { id: "text", icon: IconTypography, label: $LL.screenAnnotation.tools.text() },
        { id: "eraser", icon: IconEraser, label: $LL.screenAnnotation.tools.eraser() },
    ]);

    function toggleActive(): void {
        if (!active) screenAnnotationLocallyHiddenStore.set(false);
        localAnnotationTargetStore.set(active ? undefined : targetUserId);
    }

    function selectTool(toolId: AnnotationTool): void {
        currentAnnotationToolStore.set(toolId);
    }

    function selectColor(color: string): void {
        currentAnnotationColorStore.set(color);
    }

    function undo(): void {
        // Same history as the meeting bar and the PiP: removing the element directly would record the
        // undo itself as an action, and the next undo from there would bring the stroke back.
        screenAnnotationManager.undoLastLocalElement(targetUserId);
    }

    function clearAll(): void {
        screenAnnotationManager.clearAll();
    }

    function toggleOthersAllowed(): void {
        screenAnnotationManager.setOthersAllowed(!othersAllowed);
    }
</script>

<div
    class="absolute bottom-3 left-1/2 -translate-x-1/2 z-[255] flex items-center gap-2 max-w-[95vw] flex-wrap justify-center rounded-lg bg-contrast/80 backdrop-blur p-1 pointer-events-auto"
    data-testid="annotation-toolbar"
>
    <!-- Enter / leave drawing mode -->
    <button
        class="flex items-center justify-center p-2 rounded hover:bg-white/10 {active ? 'bg-secondary text-white' : ''}"
        data-testid="annotation-toggle"
        title={active ? $LL.screenAnnotation.stopAnnotating() : $LL.screenAnnotation.startAnnotating()}
        aria-label={active ? $LL.screenAnnotation.stopAnnotating() : $LL.screenAnnotation.startAnnotating()}
        onclick={toggleActive}
    >
        {#if active}
            <IconX font-size="18" />
            <span class="ms-1 text-sm whitespace-nowrap">{$LL.screenAnnotation.stopAnnotating()}</span>
        {:else}
            <IconPencil font-size="18" />
        {/if}
    </button>

    {#if active}
        <div class="w-px h-6 bg-white/20"></div>

        <!-- Tools -->
        {#each tools as toolItem (toolItem.id)}
            {@const ToolIcon = toolItem.icon}
            <button
                class="flex items-center justify-center p-2 rounded hover:bg-white/10 {currentTool === toolItem.id
                    ? 'bg-secondary text-white'
                    : ''}"
                data-testid={`annotation-tool-${toolItem.id}`}
                title={toolItem.label}
                aria-label={toolItem.label}
                onclick={() => selectTool(toolItem.id)}
            >
                <ToolIcon font-size="18" />
            </button>
        {/each}

        <div class="w-px h-6 bg-white/20"></div>

        <!-- Colors -->
        <div class="flex items-center gap-1" data-testid="annotation-colors">
            {#each ANNOTATION_COLORS as color (color)}
                <button
                    class="h-5 w-5 rounded-full border-2 {currentColor === color
                        ? 'border-white'
                        : 'border-transparent'}"
                    style={`background-color: ${color};`}
                    title={$LL.screenAnnotation.color()}
                    aria-label={$LL.screenAnnotation.color()}
                    onclick={() => selectColor(color)}
                ></button>
            {/each}
        </div>

        <div class="w-px h-6 bg-white/20"></div>

        {#if isPresenter && presenterEffects}
            {#each presenterTools as presenterTool (presenterTool)}
                <button
                    type="button"
                    class="p-2 rounded hover:bg-white/10"
                    class:bg-secondary={$presenterToolStore === presenterTool}
                    title={$LL.screenAnnotation.presenter[presenterTool]()}
                    aria-label={$LL.screenAnnotation.presenter[presenterTool]()}
                    onclick={() =>
                        presenterToolStore.set($presenterToolStore === presenterTool ? "none" : presenterTool)}
                >
                    {$LL.screenAnnotation.presenter[presenterTool]()}
                </button>
            {/each}
        {/if}
        <!-- Undo -->
        <button
            class="flex items-center justify-center p-2 rounded hover:bg-white/10"
            data-testid="annotation-undo"
            title={$LL.screenAnnotation.undo()}
            aria-label={$LL.screenAnnotation.undo()}
            onclick={undo}
        >
            <IconArrowBackUp font-size="18" />
        </button>
    {/if}

    {#if active}
        <button
            type="button"
            class="p-2 rounded hover:bg-white/10"
            title={$LL.desktop.meetingBar.redo()}
            onclick={() => screenAnnotationManager.redoLastLocalElement(targetUserId)}
            ><IconArrowForwardUp font-size="18" /></button
        >
        <button
            type="button"
            class="p-2 rounded hover:bg-white/10"
            title={$LL.desktop.meetingBar.hideAnnotations()}
            onclick={() => screenAnnotationLocallyHiddenStore.set(!$screenAnnotationLocallyHiddenStore)}
            ><IconEyeOff font-size="18" /></button
        >
    {/if}
    {#if isPresenter}
        <div class="w-px h-6 bg-white/20"></div>

        <!-- Presenter controls -->
        <button
            class="flex items-center justify-center p-2 rounded hover:bg-white/10 {othersAllowed
                ? 'bg-secondary text-white'
                : ''}"
            data-testid="annotation-allow-toggle"
            title={othersAllowed ? $LL.screenAnnotation.disallowAnnotations() : $LL.screenAnnotation.allowAnnotations()}
            aria-label={othersAllowed
                ? $LL.screenAnnotation.disallowAnnotations()
                : $LL.screenAnnotation.allowAnnotations()}
            onclick={toggleOthersAllowed}
        >
            <IconUsersGroup font-size="18" />
        </button>

        <button
            class="flex items-center justify-center p-2 rounded hover:bg-white/10"
            data-testid="annotation-clear-all"
            title={$LL.screenAnnotation.clearAll()}
            aria-label={$LL.screenAnnotation.clearAll()}
            onclick={clearAll}
        >
            <IconTrash font-size="18" />
        </button>
    {/if}
</div>
