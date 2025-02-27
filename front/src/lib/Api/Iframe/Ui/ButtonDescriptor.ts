import type { Popup } from "./Popup";

export type ButtonClickedCallback = (popup: Popup) => void;

export interface ButtonDescriptor {
    /**
     * The label of the button
     */
    label: string;
    /**
     * The type of the button. Can be one of "normal", "primary", "success", "warning", "error", "disabled"
     */
    className?: "normal" | "primary" | "success" | "warning" | "error" | "disabled";
    /**
     * Callback called if the button is pressed
     */
    callback: ButtonClickedCallback;
}
