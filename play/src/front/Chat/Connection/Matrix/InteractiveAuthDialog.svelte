<script lang="ts">
    import { AuthDict, InteractiveAuth, MatrixClient, UIAResponse } from "matrix-js-sdk/lib/matrix";
    import { AuthType } from "matrix-js-sdk/lib/interactive-auth";
    import { onMount } from "svelte";
    import { closeModal, onBeforeClose } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import InteractiveAuthSSO from "./InteractiveAuthSSO.svelte";
    import { INTERACTIVE_AUTH_PHASE } from "./MatrixChatConnection";

    export let isOpen: boolean;
    export let matrixClient: MatrixClient;
    export let onFinished: (finished: boolean) => Promise<void>;
    export let makeRequest: (auth: AuthDict | null) => Promise<UIAResponse<void>>;

    let isInteractiveAuthFinished = false;

    let uiAuthStage: AuthType | string;
    let uiAuthPhase: number;

    const interactiveAuth = new InteractiveAuth({
        matrixClient,
        doRequest(auth: AuthDict | null): Promise<UIAResponse<void>> {
            return makeRequest(auth);
        },
        stateUpdated: onPhaseChange,
        requestEmailToken: mandatoryButNotUsedRequestEmailTokenFunction,
        supportedStages: [AuthType.Sso, AuthType.SsoUnstable],
    });

    function mandatoryButNotUsedRequestEmailTokenFunction(): Promise<{ sid: string }> {
        return Promise.reject(new Error("Not supposed to be called"));
    }

    function onPhaseChange(nextStage: AuthType | string) {
        uiAuthStage = nextStage;
    }

    function onUpdatePhaseChange(newPhase: number) {
        uiAuthPhase = newPhase;
    }

    async function onCancelInteractiveAuth() {
        await onFinished(false);
        closeModal();
    }

    onMount(() => {
        interactiveAuth
            .attemptAuth()
            .then(async () => {
                isInteractiveAuthFinished = true;
                await onFinished(isInteractiveAuthFinished);
            })
            .catch(async (error) => {
                console.error(error);
                isInteractiveAuthFinished = false;
                await onFinished(isInteractiveAuthFinished);
            })
            .finally(() => {
                closeModal();
            });
    });

    onBeforeClose(() => {
        onFinished(isInteractiveAuthFinished)?.catch((error) => console.error(error));
    });
</script>

{#if uiAuthStage === "m.login.sso"}
    <Popup {isOpen}>
        <h1 slot="title">{$LL.chat.e2ee.interactiveAuth.title()}</h1>
        <div slot="content">
            <p>{$LL.chat.e2ee.interactiveAuth.description()}</p>
            {#if uiAuthPhase === INTERACTIVE_AUTH_PHASE.PRE_AUTH}
                <p>{$LL.chat.e2ee.interactiveAuth.instruction()}</p>
            {/if}
        </div>
        <svelte:fragment slot="action">
            <InteractiveAuthSSO
                authSessionId={interactiveAuth.getSessionId()}
                {matrixClient}
                onPhaseChange={onUpdatePhaseChange}
                onCancel={onCancelInteractiveAuth}
                submitAuthDict={() => interactiveAuth.submitAuthDict({})}
            />
        </svelte:fragment>
    </Popup>
{/if}
