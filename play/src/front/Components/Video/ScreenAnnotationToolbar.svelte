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
        IconFocusCentered,
        IconSearch,
        IconX,
    } from "@wa-icons";

    interface Props {
        // spaceUserId of the user sharing the screen.
        targetUserId: string;
        // True when the local user is the one sharing this screen.
        isPresenter: boolean;
        presenterEffects?: boolean;
        placement?: "top" | "bottom";
    }

    let { targetUserId, isPresenter, presenterEffects = false, placement = "bottom" }: Props = $props();
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

<div class="annotation-toolbar" class:at-top={placement === "top"} data-testid="annotation-toolbar">
    <button
        type="button"
        data-testid="annotation-toggle"
        aria-pressed={active}
        title={active ? $LL.screenAnnotation.stopAnnotating() : $LL.screenAnnotation.startAnnotating()}
        aria-label={active ? $LL.screenAnnotation.stopAnnotating() : $LL.screenAnnotation.startAnnotating()}
        onclick={toggleActive}
    >
        {#if active}<IconX font-size="20" />{:else}<IconPencil font-size="20" />{/if}
    </button>
    {#if active}
        <span class="separator" aria-hidden="true"></span>
        {#each tools as toolItem (toolItem.id)}
            {@const ToolIcon = toolItem.icon}
            <button
                type="button"
                data-testid={`annotation-tool-${toolItem.id}`}
                aria-pressed={currentTool === toolItem.id}
                title={toolItem.label}
                aria-label={toolItem.label}
                onclick={() => selectTool(toolItem.id)}><ToolIcon font-size="20" /></button
            >
        {/each}
        <span class="separator" aria-hidden="true"></span>
        <div class="colors" data-testid="annotation-colors">
            {#each ANNOTATION_COLORS as color (color)}
                <button
                    type="button"
                    class="color"
                    style:background-color={color}
                    aria-pressed={currentColor === color}
                    title={$LL.screenAnnotation.color()}
                    aria-label={`${$LL.screenAnnotation.color()} ${color}`}
                    onclick={() => selectColor(color)}
                ></button>
            {/each}
        </div>
        {#if isPresenter && presenterEffects}
            <span class="separator" aria-hidden="true"></span>
            {#each presenterTools as presenterTool (presenterTool)}
                <button
                    type="button"
                    aria-pressed={$presenterToolStore === presenterTool}
                    title={$LL.screenAnnotation.presenter[presenterTool]()}
                    aria-label={$LL.screenAnnotation.presenter[presenterTool]()}
                    onclick={() =>
                        presenterToolStore.set($presenterToolStore === presenterTool ? "none" : presenterTool)}
                >
                    {#if presenterTool === "laser"}<IconPointer font-size="20" />
                    {:else if presenterTool === "spotlight"}<IconFocusCentered font-size="20" />
                    {:else}<IconSearch font-size="20" />{/if}
                </button>
            {/each}
        {/if}
        <span class="separator" aria-hidden="true"></span>
        <button
            type="button"
            data-testid="annotation-undo"
            title={$LL.screenAnnotation.undo()}
            aria-label={$LL.screenAnnotation.undo()}
            onclick={undo}><IconArrowBackUp font-size="20" /></button
        >
        <button
            type="button"
            title={$LL.desktop.meetingBar.redo()}
            aria-label={$LL.desktop.meetingBar.redo()}
            onclick={() => screenAnnotationManager.redoLastLocalElement(targetUserId)}
            ><IconArrowForwardUp font-size="20" /></button
        >
        <button
            type="button"
            title={$LL.desktop.meetingBar.hideAnnotations()}
            aria-label={$LL.desktop.meetingBar.hideAnnotations()}
            aria-pressed={$screenAnnotationLocallyHiddenStore}
            onclick={() => screenAnnotationLocallyHiddenStore.set(!$screenAnnotationLocallyHiddenStore)}
            ><IconEyeOff font-size="20" /></button
        >
    {/if}
    {#if isPresenter}
        <span class="separator" aria-hidden="true"></span>
        <button
            type="button"
            class="permission"
            data-testid="annotation-allow-toggle"
            aria-pressed={othersAllowed}
            title={othersAllowed ? $LL.screenAnnotation.disallowAnnotations() : $LL.screenAnnotation.allowAnnotations()}
            onclick={toggleOthersAllowed}
        >
            <IconUsersGroup font-size="20" />
            <span
                >{othersAllowed
                    ? $LL.screenAnnotation.disallowAnnotations()
                    : $LL.screenAnnotation.allowAnnotations()}</span
            >
        </button>
        <button
            type="button"
            data-testid="annotation-clear-all"
            title={$LL.screenAnnotation.clearAll()}
            aria-label={$LL.screenAnnotation.clearAll()}
            onclick={clearAll}><IconTrash font-size="20" /></button
        >
    {/if}
</div>

<style>
    .annotation-toolbar {
        position: absolute;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 255;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
        gap: 4px;
        width: max-content;
        max-width: calc(100% - 24px);
        padding: 8px;
        border: 1px solid #64748b;
        border-radius: 12px;
        background: #0f172af5;
        color: #f8fafc;
        box-shadow: 0 4px 16px #0006;
        pointer-events: auto;
    }
    .annotation-toolbar.at-top {
        top: 12px;
        bottom: auto;
    }
    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-shrink: 0;
        min-width: 36px;
        height: 36px;
        padding: 6px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: #f8fafc;
        cursor: pointer;
    }
    button:hover {
        background: #334155;
    }
    button[aria-pressed="true"] {
        background: var(--color-secondary);
        border-color: var(--color-secondary);
        color: #fff;
    }
    button:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
    }
    .separator {
        width: 1px;
        height: 24px;
        margin: 0 3px;
        background: #64748b;
    }
    .colors {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 4px;
    }
    button.color {
        min-width: 22px;
        width: 22px;
        height: 22px;
        padding: 0;
        border: 2px solid #64748b;
        border-radius: 50%;
    }
    button.color[aria-pressed="true"] {
        border-color: #fff;
        outline: 2px solid var(--color-secondary);
        outline-offset: 2px;
    }
    .permission {
        height: auto;
        min-height: 36px;
        max-width: 240px;
        font-size: 12px;
        text-align: start;
    }
</style>
