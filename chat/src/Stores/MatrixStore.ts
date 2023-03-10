import {Writable, writable} from "svelte/store";
import {MatrixSettingsEvent} from "../Event/MatrixSettingsEvent";

export const matrixSettingsStore: Writable<MatrixSettingsEvent> = writable();
