import type { ComponentProps } from "svelte";
import { onDestroy } from "svelte";
import type { Readable } from "svelte/store";
import { get } from "svelte/store";
import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
import type { WorkAdventureComponent, WorkAdventureComponentProps } from "../../../../types/component";
import TargetPicker from "../../PopUp/TargetPicker.svelte";

/** One thing an action-bar button can act on: a space, a lockable area, the bubble… */
export interface TargetRow {
    id: string;
    label: string;
    /** Whether the action is currently "on" for this target (locked, hand raised…). */
    selected: boolean;
    disabled?: boolean;
    testId: string;
}

/**
 * The action-bar side of a "which target?" picker (TargetPicker, RecordingSpacePicker): anchors the picker to the
 * button, toggles it, and closes it when the button goes away — the picker is portal-rendered at the app root, so
 * it would otherwise outlive the button (e.g. when the player leaves the bubble).
 *
 * Create it during component initialisation, with a getter for the element the picker is anchored to (the
 * button's `bind:wrapperDiv`).
 */
export class TargetPickerController {
    private closePopup: (() => void) | undefined;

    constructor(private readonly trigger: () => HTMLElement | undefined) {
        onDestroy(() => this.close());
    }

    close(): void {
        this.closePopup?.();
        this.closePopup = undefined;
    }

    /** Opens the picker, or closes it when it is already open. It receives an `onclose` prop on top of `props`. */
    toggle(component: WorkAdventureComponent, props: WorkAdventureComponentProps): void {
        if (this.closePopup) {
            this.close();
            return;
        }
        const trigger = this.trigger();
        if (!trigger) {
            return;
        }
        this.closePopup = showFloatingUi(
            trigger,
            component,
            { ...props, onclose: () => this.close() },
            { placement: "bottom" },
            8,
            true,
        );
    }

    /**
     * The common rule of the action-bar buttons that act on one of several targets: with a single target, act on
     * it right away; with several, let the user pick (a second click closes the picker).
     */
    actOrPick(rows: Readable<TargetRow[]>, props: Omit<ComponentProps<typeof TargetPicker>, "rows" | "onclose">): void {
        if (this.closePopup) {
            this.close();
            return;
        }
        const current = get(rows);
        if (current.length === 0) {
            return;
        }
        if (current.length === 1) {
            if (!current[0].disabled) {
                props.onselect(current[0]);
            }
            return;
        }
        this.toggle(TargetPicker, { ...props, rows });
    }
}
