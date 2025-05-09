<script lang="ts">
    import { onMount } from "svelte";
    import { AuthDict, AuthType, MatrixClient } from "matrix-js-sdk";
    import LL from "../../../../i18n/i18n-svelte";
    import { INTERACTIVE_AUTH_PHASE } from "./InteractiveAuthPhase";

    export let authSessionId;
    export let matrixClient: MatrixClient;
    export let onPhaseChange: (nextStage: INTERACTIVE_AUTH_PHASE) => void;
    export let onCancel: () => void;
    export let submitAuthDict: (auth: AuthDict) => void;
    export let errorText: string | undefined = undefined;

    if (!authSessionId) throw new Error("This UIA flow requires an authSessionId");

    let ssoUrl = matrixClient.getFallbackAuthUrl(AuthType.Sso, authSessionId);
    let popupWindow: Window | null = null;
    let phase = INTERACTIVE_AUTH_PHASE.PRE_AUTH;

    const onReceiveMessage = (event: { data: string; origin: string }) => {
        if (event.data === "authDone" && event.origin === matrixClient.getHomeserverUrl()) {
            if (popupWindow) {
                popupWindow.close();
                popupWindow = null;
            }
        }
    };

    const onStartAuthClick = () => {
        popupWindow = window.open(ssoUrl, "_blank");
        phase = INTERACTIVE_AUTH_PHASE.POST_AUTH;
        onPhaseChange(INTERACTIVE_AUTH_PHASE.POST_AUTH);
    };

    const onConfirmClick = () => {
        submitAuthDict({});
    };

    onMount(() => {
        window.addEventListener("message", onReceiveMessage);
        onPhaseChange(INTERACTIVE_AUTH_PHASE.PRE_AUTH);

        return () => {
            window.removeEventListener("message", onReceiveMessage);
            if (popupWindow) {
                popupWindow.close();
                popupWindow = null;
            }
        };
    });
</script>

{#if errorText}
    <div class="text-red-500" role="alert">{errorText}</div>
{/if}

<button class="flex-1 justify-center" on:click={onCancel} data-testid="cancelSSO">
    {$LL.chat.e2ee.interactiveAuth.buttons.cancel()}
</button>
{#if phase === INTERACTIVE_AUTH_PHASE.PRE_AUTH}
    <button class="btn btn-secondary flex-1 justify-center" on:click={onStartAuthClick}>
        {$LL.chat.e2ee.interactiveAuth.buttons.continueSSO()}
    </button>
{:else}
    <button class="btn btn-secondary flex-1 justify-center" on:click={onConfirmClick}>
        {$LL.chat.e2ee.interactiveAuth.buttons.finish()}
    </button>
{/if}
