import type { HookManager } from "./HookManager.ts";

export interface MapStorageModuleInterface {
    init: (hookManager: HookManager) => void;
}
