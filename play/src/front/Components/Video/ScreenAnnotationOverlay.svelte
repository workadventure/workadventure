<script lang="ts">
    import { onDestroy } from "svelte";
    import type { ScreenAnnotationElement, ScreenAnnotationPoint } from "@workadventure/messages";
    import { screenAnnotationManager } from "../../Space/ScreenAnnotation/ScreenAnnotationManager";
    import {
        currentAnnotationColorStore,
        currentAnnotationToolStore,
        currentAnnotationWidthStore,
        localAnnotationTargetStore,
        screenAnnotationElementsStore,
        screenAnnotationFinishedCountStore,
        screenAnnotationLocallyHiddenStore,
    } from "../../Stores/ScreenAnnotationStore";
    import { clamp01, drawElement, hitTest } from "./annotationRender";
    import { observeElementSize } from "./PictureInPicture/childWindow";

    interface Props {
        // spaceUserId of the user sharing the screen this overlay annotates.
        targetUserId: string;
        // Whether the local user is currently allowed to draw on this screen share.
        canDraw: boolean;
    }

    let { targetUserId, canDraw }: Props = $props();

    const EMIT_INTERVAL_MS = 50;
    // A drag in pointer mode draws a highlight: a thick translucent stroke that fades out.
    const HIGHLIGHT_WIDTH = 0.02;

    let canvas: HTMLCanvasElement | undefined = $state();
    let clientWidth = $state(0);
    let clientHeight = $state(0);

    let elements = $derived($screenAnnotationElementsStore.get(targetUserId) ?? []);
    // Local-only visibility toggle: rendering is suspended, but drawing/receiving still work.
    let locallyHidden = $derived($screenAnnotationLocallyHiddenStore);
    let tool = $derived($currentAnnotationToolStore);
    let color = $derived($currentAnnotationColorStore);
    let width = $derived($currentAnnotationWidthStore);
    let inputEnabled = $derived($localAnnotationTargetStore === targetUserId && canDraw);

    let draft: ScreenAnnotationElement | undefined = $state();
    let drawing = false;
    let lastEmit = 0;
    let lastPointerEmit = 0;

    // Floating text input state (in normalized coordinates).
    let textInput: { x: number; y: number; value: string } | undefined = $state();
    let textInputElement: HTMLInputElement | undefined = $state();

    function freehand(tool: string): boolean {
        return tool === "pen" || tool === "highlight";
    }

    function pointerToNorm(event: PointerEvent): ScreenAnnotationPoint {
        if (!canvas) {
            return { x: 0, y: 0 };
        }
        const rect = canvas.getBoundingClientRect();
        return {
            x: clamp01((event.clientX - rect.left) / rect.width),
            y: clamp01((event.clientY - rect.top) / rect.height),
        };
    }

    function eraseAt(p: ScreenAnnotationPoint): void {
        const aspect = clientHeight > 0 ? clientWidth / clientHeight : 1;
        for (let i = elements.length - 1; i >= 0; i--) {
            if (hitTest(elements[i], p, aspect)) {
                screenAnnotationManager.removeElement(targetUserId, elements[i].id);
                return;
            }
        }
    }

    function openTextInput(p: ScreenAnnotationPoint): void {
        textInput = { x: p.x, y: p.y, value: "" };
    }

    function commitText(): void {
        const current = textInput;
        textInput = undefined;
        if (!current || current.value.trim() === "") {
            return;
        }
        const element: ScreenAnnotationElement = {
            id: screenAnnotationManager.nextElementId(),
            authorUserId: screenAnnotationManager.localUserId ?? "local",
            tool: "text",
            color,
            width,
            points: [{ x: current.x, y: current.y }],
            text: current.value,
        };
        screenAnnotationManager.upsertElement(targetUserId, element);
    }

    function onPointerDown(event: PointerEvent): void {
        if (!inputEnabled || !canvas) {
            return;
        }
        if (textInput) {
            commitText();
            return;
        }
        const p = pointerToNorm(event);
        if (tool === "pointer") {
            movePointer(p);
        }
        if (tool === "eraser") {
            eraseAt(p);
            return;
        }
        if (tool === "text") {
            openTextInput(p);
            return;
        }
        drawing = true;
        canvas.setPointerCapture(event.pointerId);
        const draftTool = tool === "pointer" ? "highlight" : tool;
        draft = {
            id: screenAnnotationManager.nextElementId(),
            authorUserId: screenAnnotationManager.localUserId ?? "local",
            tool: draftTool,
            color,
            width: draftTool === "highlight" ? HIGHLIGHT_WIDTH : width,
            points: freehand(draftTool) ? [p] : [p, p],
            text: undefined,
        };
    }

    // A pointer is a live draft only: it never enters the shared state or undo history.
    let pointerId: string | undefined;

    function movePointer(p: ScreenAnnotationPoint): void {
        const now = Date.now();
        if (pointerId && now - lastPointerEmit < EMIT_INTERVAL_MS) return;
        pointerId ??= screenAnnotationManager.nextElementId();
        lastPointerEmit = now;
        screenAnnotationManager.emitDraft(targetUserId, {
            id: pointerId,
            authorUserId: screenAnnotationManager.localUserId ?? "local",
            tool: "pointer",
            color,
            width,
            points: [p],
        });
    }

    function dropPointer(): void {
        if (pointerId) screenAnnotationManager.dropDraft(targetUserId, pointerId);
        pointerId = undefined;
    }

    $effect(() => {
        // Capture the target in this effect so a target change clears the old pointer too.
        const target = targetUserId;
        if (!inputEnabled || tool !== "pointer") return;
        return () => {
            if (pointerId) screenAnnotationManager.dropDraft(target, pointerId);
            pointerId = undefined;
        };
    });

    function onPointerMove(event: PointerEvent): void {
        if (inputEnabled && tool === "pointer") {
            movePointer(pointerToNorm(event));
        }
        if (!drawing || !draft) {
            return;
        }
        const p = pointerToNorm(event);
        draft = freehand(draft.tool)
            ? { ...draft, points: [...draft.points, p] }
            : { ...draft, points: [draft.points[0], p] };

        const now = Date.now();
        if (now - lastEmit > EMIT_INTERVAL_MS) {
            lastEmit = now;
            screenAnnotationManager.emitDraft(targetUserId, draft);
        }
    }

    function onPointerUp(event: PointerEvent): void {
        if (!drawing || !draft) {
            return;
        }
        drawing = false;
        try {
            canvas?.releasePointerCapture(event.pointerId);
        } catch {
            // pointer capture may already be released
        }
        screenAnnotationManager.upsertElement(targetUserId, draft);
        draft = undefined;
    }

    function render(): void {
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }
        const dpr = canvas.ownerDocument.defaultView?.devicePixelRatio || 1;
        const pixelWidth = Math.max(1, Math.round(clientWidth * dpr));
        const pixelHeight = Math.max(1, Math.round(clientHeight * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // When locally hidden, stored elements are skipped but the in-progress draft still shows:
        // a stroke being drawn must never be invisible to its own author.
        if (!locallyHidden) {
            for (const element of elements) {
                ctx.globalAlpha = screenAnnotationManager.opacity(element);
                drawElement(ctx, element);
            }
            ctx.globalAlpha = 1;
        }
        if (draft) {
            drawElement(ctx, draft);
        }
    }

    $effect(() => {
        // render() reads elements, draft, clientWidth and clientHeight, so this effect
        // automatically re-runs whenever any of them changes.
        render();
    });

    // A highlight fades out: redraw on every frame while one shows. The canvas's own window paces it:
    // in the desktop overlay, the main window may be hidden.
    $effect(() => {
        const view = canvas?.ownerDocument.defaultView;
        if (!view || locallyHidden || !elements.some((element) => element.tool === "highlight")) {
            return;
        }
        let frame = view.requestAnimationFrame(function redraw() {
            render();
            frame = view.requestAnimationFrame(redraw);
        });
        return () => view.cancelAnimationFrame(frame);
    });

    // Drawing mode ended mid-stroke (Escape, the presenter stopped letting the others draw...): the stroke is
    // given up, and the others drop what they saw of it.
    $effect(() => {
        if (!inputEnabled) {
            dropDraft();
            textInput = undefined;
        }
    });

    function dropDraft(): void {
        if (draft) {
            screenAnnotationManager.dropDraft(targetUserId, draft.id);
        }
        draft = undefined;
        drawing = false;
    }

    $effect(() => {
        if (!inputEnabled) {
            return;
        }
        // Escape leaves drawing mode (the text input handles its own Escape first).
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                localAnnotationTargetStore.set(undefined);
            }
        };
        const target = canvas?.ownerDocument.defaultView;
        target?.addEventListener("keydown", onKeyDown);
        return () => target?.removeEventListener("keydown", onKeyDown);
    });

    $effect(() => {
        // Focus the floating text input as soon as it appears.
        if (textInput) {
            textInputElement?.focus();
        }
    });

    $effect(() => {
        // Re-render on window resize / browser zoom (the device pixel ratio may change without
        // the bound clientWidth/clientHeight changing).
        const target = canvas?.ownerDocument.defaultView;
        const onResize = () => render();
        target?.addEventListener("resize", onResize);
        return () => target?.removeEventListener("resize", onResize);
    });

    // Measured from the canvas's own window: in the desktop overlay it lives in a child window, where
    // bind:clientWidth never reports. A 0 size left a 1x1 canvas stretched over the screen, all red.
    $effect(() => {
        if (!canvas) return;
        return observeElementSize(canvas, (width, height) => {
            clientWidth = width;
            clientHeight = height;
        });
    });

    onDestroy(() => {
        // A stroke still in progress when the overlay unmounts (e.g. the screen is un-highlighted
        // mid-drag) is never finished: the others drop what they saw of it.
        dropDraft();
        textInput = undefined;
    });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<canvas
    bind:this={canvas}
    data-testid="annotation-canvas"
    data-element-count={$screenAnnotationFinishedCountStore.get(targetUserId) ?? 0}
    class="absolute inset-0 h-full w-full"
    class:cursor-crosshair={inputEnabled}
    style={`touch-action: none; pointer-events: ${inputEnabled ? "auto" : "none"};`}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerleave={dropPointer}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
></canvas>

{#if textInput}
    <input
        bind:this={textInputElement}
        value={textInput.value}
        oninput={(event) => {
            if (textInput) textInput.value = event.currentTarget.value;
        }}
        type="text"
        data-testid="annotation-text-input"
        class="absolute z-[260] bg-transparent border border-dashed border-white/70 outline-none px-1 text-sm pointer-events-auto"
        style={`left: ${textInput.x * clientWidth}px; top: ${textInput.y * clientHeight}px; color: ${color}; transform: translateY(-100%);`}
        maxlength={500}
        onpointerdown={(e) => e.stopPropagation()}
        onkeydown={(e) => {
            // Phaser listens on the window: typing must never reach game shortcuts or movement.
            e.stopPropagation();
            if (e.key === "Enter") {
                commitText();
            } else if (e.key === "Escape") {
                e.stopPropagation();
                textInput = undefined;
            }
        }}
        onblur={commitText}
    />
{/if}
