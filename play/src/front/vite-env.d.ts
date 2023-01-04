/// <reference types="svelte" />
/// <reference types="vite/client" />

import { DebugManager } from "./Debug/DebugManager";

interface Window {
    waDebug: DebugManager;
}
