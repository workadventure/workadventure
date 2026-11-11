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

    // The app's look (ActionBarButton, the desktop meeting bar), with the theme's colors. Rings, not outlines:
    // the app removes the outline of a focused button.
    const baseButton =
        "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-[6px] p-1.5 text-neutral-100 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white";
    const button = `${baseButton} aria-pressed:bg-secondary aria-pressed:hover:bg-secondary-600`;
    const separator = "mx-0.5 h-6 w-px bg-neutral-800";
</script>

<div
    class={[
        "pointer-events-auto absolute left-1/2 z-[255] flex w-max max-w-[calc(100%-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-md border border-solid border-neutral-800 bg-contrast/90 p-2 text-neutral-100 shadow-[0_4px_16px_#0006] backdrop-blur",
        placement === "top" ? "top-3" : "bottom-3",
    ]}
    data-testid="annotation-toolbar"
>
    <button
        type="button"
        class="{baseButton} aria-pressed:bg-danger aria-pressed:hover:bg-danger-600"
        data-testid="annotation-toggle"
        aria-pressed={active}
        title={active ? $LL.screenAnnotation.stopAnnotating() : $LL.screenAnnotation.startAnnotating()}
        aria-label={active ? $LL.screenAnnotation.stopAnnotating() : $LL.screenAnnotation.startAnnotating()}
        onclick={toggleActive}
    >
        {#if active}<IconX font-size="20" />{:else}<IconPencil font-size="20" />{/if}
    </button>
    {#if active}
        <span class={separator} aria-hidden="true"></span>
        {#each tools as toolItem (toolItem.id)}
            {@const ToolIcon = toolItem.icon}
            <button
                type="button"
                class={button}
                data-testid={`annotation-tool-${toolItem.id}`}
                aria-pressed={currentTool === toolItem.id}
                title={toolItem.label}
                aria-label={toolItem.label}
                onclick={() => selectTool(toolItem.id)}><ToolIcon font-size="20" /></button
            >
        {/each}
        <span class={separator} aria-hidden="true"></span>
        <div class="flex items-center gap-1.5 px-1" data-testid="annotation-colors">
            {#each ANNOTATION_COLORS as color (color)}
                <button
                    type="button"
                    class="size-5.5 shrink-0 rounded-full border-2 border-solid border-neutral-800 focus-visible:ring-2 focus-visible:ring-white aria-pressed:border-white aria-pressed:ring-2 aria-pressed:ring-secondary aria-pressed:ring-offset-2 aria-pressed:ring-offset-contrast"
                    style:background-color={color}
                    aria-pressed={currentColor === color}
                    title={$LL.screenAnnotation.color()}
                    aria-label={`${$LL.screenAnnotation.color()} ${color}`}
                    onclick={() => selectColor(color)}
                ></button>
            {/each}
        </div>
        {#if isPresenter && presenterEffects}
            <span class={separator} aria-hidden="true"></span>
            {#each presenterTools as presenterTool (presenterTool)}
                <button
                    type="button"
                    class={button}
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
        <span class={separator} aria-hidden="true"></span>
        <button
            type="button"
            class={button}
            data-testid="annotation-undo"
            title={$LL.screenAnnotation.undo()}
            aria-label={$LL.screenAnnotation.undo()}
            onclick={undo}><IconArrowBackUp font-size="20" /></button
        >
        <button
            type="button"
            class={button}
            title={$LL.desktop.meetingBar.redo()}
            aria-label={$LL.desktop.meetingBar.redo()}
            onclick={() => screenAnnotationManager.redoLastLocalElement(targetUserId)}
            ><IconArrowForwardUp font-size="20" /></button
        >
        <button
            type="button"
            class={button}
            title={$LL.desktop.meetingBar.hideAnnotations()}
            aria-label={$LL.desktop.meetingBar.hideAnnotations()}
            aria-pressed={$screenAnnotationLocallyHiddenStore}
            onclick={() => screenAnnotationLocallyHiddenStore.set(!$screenAnnotationLocallyHiddenStore)}
            ><IconEyeOff font-size="20" /></button
        >
    {/if}
    {#if isPresenter}
        <span class={separator} aria-hidden="true"></span>
        <button
            type="button"
            class="{button} max-w-60 text-start text-xs"
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
            class={button}
            data-testid="annotation-clear-all"
            title={$LL.screenAnnotation.clearAll()}
            aria-label={$LL.screenAnnotation.clearAll()}
            onclick={clearAll}><IconTrash font-size="20" /></button
        >
    {/if}
</div>
