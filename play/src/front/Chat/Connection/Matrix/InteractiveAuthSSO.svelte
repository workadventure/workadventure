<script lang="ts">
    import { onMount } from "svelte";
    import { MatrixClient } from "matrix-js-sdk/lib/matrix";
    import { AuthType , AuthDict } from "matrix-js-sdk/lib/interactive-auth";
    import LL from "../../../../i18n/i18n-svelte";
    import { INTERACTIVE_AUTH_PHASE } from "./MatrixChatConnection";

    export let authSessionId;
    export let matrixClient: MatrixClient;
    export let onPhaseChange: (nextStage: number) => void;
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
    <div class="tw-text-red-500" role="alert">{errorText}</div>
{/if}

<button class="tw-flex-1 tw-justify-center" on:click={onCancel} data-testid="cancelSSO">
    {$LL.chat.e2ee.interactiveAuth.buttons.cancel()}
</button>
{#if phase === INTERACTIVE_AUTH_PHASE.PRE_AUTH}
    <button class="tw-bg-secondary tw-flex-1 tw-justify-center" on:click={onStartAuthClick}>
        {$LL.chat.e2ee.interactiveAuth.buttons.continueSSO()}
    </button>
{:else}
    <button class="tw-bg-secondary tw-flex-1 tw-justify-center" on:click={onConfirmClick}>
        {$LL.chat.e2ee.interactiveAuth.buttons.finish()}
    </button>
{/if}
