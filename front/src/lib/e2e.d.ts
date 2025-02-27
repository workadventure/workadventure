import {e2eHooks} from "$lib/Utils/E2EHooks";

declare global {
    interface Window {
        e2eHooks: typeof e2eHooks;
    }
}