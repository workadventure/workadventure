import * as Sentry from "@sentry/svelte";
import { toastStore } from "../../Stores/ToastStoreSingleton";
import { popupStore } from "../../Stores/PopupStore";
import LivekitConnectionCheckerToast from "../../Components/Toasts/LivekitConnectionCheckerToast.svelte";
import LivekitConnectionCheckerPopup from "../../Components/PopUp/LivekitConnectionCheckerPopup.svelte";
import { LivekitConnectionChecker, LivekitConnectionStatus } from "./LivekitConnectionChecker";

const LIVEKIT_CONNECTION_CHECK_POPUP_ID = "livekit-connection-check";
const WARNING_TOAST_DURATION = 20000;

/**
 * Runs the LiveKit connection test (using the credentials the server sent right after joining)
 * and surfaces the result to the user:
 * - Success: nothing shown.
 * - Warning (degraded media path): a transient toast.
 * - Critical (cannot communicate at all): a persistent popup with a reload action.
 */
export function runLivekitConnectionCheck(url: string, token: string): void {
    const checker = new LivekitConnectionChecker(url, token);

    const subscription = checker.statusStream.subscribe((summary) => {
        subscription.unsubscribe();

        if (summary.status === LivekitConnectionStatus.Success) {
            return;
        }

        console.warn(
            `[Livekit Connection Check] Status: ${summary.status}. Failed checks: ${summary.failedChecks.join(", ")}`,
        );

        // Report to Sentry so we can measure how often users hit LiveKit connectivity issues in the field.
        Sentry.captureMessage(`LiveKit connection check ${summary.status}: ${summary.failedChecks.join(", ")}`, {
            level: summary.status === LivekitConnectionStatus.Critical ? "error" : "warning",
            extra: { status: summary.status, failedChecks: summary.failedChecks },
        });

        if (summary.status === LivekitConnectionStatus.Critical) {
            popupStore.addPopup(
                LivekitConnectionCheckerPopup,
                { status: summary.status },
                LIVEKIT_CONNECTION_CHECK_POPUP_ID,
            );
        } else {
            toastStore.addToast(
                LivekitConnectionCheckerToast,
                { status: summary.status, duration: WARNING_TOAST_DURATION },
                undefined,
            );
        }
    });

    checker.runConnectionCheck().catch((err) => {
        console.error("Error during Livekit connection check", err);
    });
}
