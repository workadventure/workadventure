<script lang="ts">
    import type { AuthDict, MatrixClient, UIAResponse } from "matrix-js-sdk";
    import { AuthType, InteractiveAuth } from "matrix-js-sdk";
    import { onMount } from "svelte";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import InteractiveAuthSSO from "./InteractiveAuthSSO.svelte";
    import { INTERACTIVE_AUTH_PHASE } from "./InteractiveAuthPhase";
    import { modals, onBeforeClose } from "@wa-modals";

    interface Props {
        isOpen: boolean;
        matrixClient: MatrixClient;
        onFinished: (finished: boolean) => void;
        makeRequest: (auth: AuthDict | null) => Promise<UIAResponse<void>>;
    }

    let { isOpen, matrixClient, onFinished, makeRequest }: Props = $props();

    let isInteractiveAuthFinished = false;

    let uiAuthStage: AuthType | string | undefined = $state();
    let uiAuthPhase: INTERACTIVE_AUTH_PHASE | undefined = $state();

    let interactiveAuth = $derived(
        new InteractiveAuth({
            matrixClient,
            doRequest(auth: AuthDict | null): Promise<UIAResponse<void>> {
                return makeRequest(auth);
            },
            stateUpdated: onPhaseChange,
            requestEmailToken: mandatoryButNotUsedRequestEmailTokenFunction,
            supportedStages: [AuthType.Sso, AuthType.SsoUnstable],
        }),
    );

    function mandatoryButNotUsedRequestEmailTokenFunction(): Promise<{ sid: string }> {
        return Promise.reject(new Error("Not supposed to be called"));
    }

    function onPhaseChange(nextStage: AuthType | string) {
        uiAuthStage = nextStage;
    }

    function onUpdatePhaseChange(newPhase: INTERACTIVE_AUTH_PHASE) {
        uiAuthPhase = newPhase;
    }

    function onCancelInteractiveAuth() {
        onFinished(false);
        modals.close();
    }

    onMount(() => {
        interactiveAuth
            .attemptAuth()
            .then(() => {
                isInteractiveAuthFinished = true;
                onFinished(isInteractiveAuthFinished);
            })
            .catch((error) => {
                console.error(error);
                isInteractiveAuthFinished = false;
                onFinished(isInteractiveAuthFinished);
            })
            .finally(() => {
                modals.close();
            });
    });

    onBeforeClose(() => {
        onFinished(isInteractiveAuthFinished);
    });

    let authSessionId = $derived(interactiveAuth.getSessionId());
</script>

{#if uiAuthStage === "m.login.sso"}
    <Popup {isOpen}>
        {#snippet title()}
            <h1>{$LL.chat.e2ee.interactiveAuth.title()}</h1>
        {/snippet}
        {#snippet content()}
            <div>
                <p>{$LL.chat.e2ee.interactiveAuth.description()}</p>
                {#if uiAuthPhase === INTERACTIVE_AUTH_PHASE.PRE_AUTH}
                    <p>{$LL.chat.e2ee.interactiveAuth.instruction()}</p>
                {/if}
            </div>
        {/snippet}
        {#snippet action()}
            {#if authSessionId}
                <InteractiveAuthSSO
                    {authSessionId}
                    {matrixClient}
                    onPhaseChange={onUpdatePhaseChange}
                    onCancel={onCancelInteractiveAuth}
                    submitAuthDict={() => interactiveAuth.submitAuthDict({})}
                />
            {/if}
        {/snippet}
    </Popup>
{/if}
