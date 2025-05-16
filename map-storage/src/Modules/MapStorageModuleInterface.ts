import { HookManager } from "./HookManager";

export interface MapStorageModuleInterface {
    init: (hookManager: HookManager) => void;
}
