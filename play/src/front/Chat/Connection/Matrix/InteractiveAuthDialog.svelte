<script lang="ts">

    import { AuthDict, AuthType, InteractiveAuth, IStageStatus, MatrixClient, UIAResponse } from "matrix-js-sdk";
    import { onMount } from "svelte";
    import { closeModal } from "svelte-modals";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import LL from "../../../../i18n/i18n-svelte";
    import InteractiveAuthSSO from "./InteractiveAuthSSO.svelte";
    import { INTERACTIVE_AUTH_PHASE } from "./MatrixChatConnection";

    export let isOpen: boolean;
    export let matrixClient: MatrixClient;
    export let onFinished: (finished: boolean) => Promise<void>;
    export let makeRequest: (auth: AuthDict | null) => Promise<UIAResponse<void>>;


    let uiAuthStage: AuthType | string;
    let uiAuthPhase: number;

    const interactiveAuth = new InteractiveAuth({
        matrixClient,
        doRequest(auth: AuthDict | null, background: boolean): Promise<UIAResponse<void>> {
            return makeRequest(auth);
        },
        stateUpdated: onPhaseChange,
        requestEmailToken: mandatoryButNotUsedRequestEmailTokenFunction,
        supportedStages: [AuthType.Sso, AuthType.SsoUnstable]
    });

    function mandatoryButNotUsedRequestEmailTokenFunction(): Promise<{ sid: string; }> {
        return Promise.reject(new Error("Not supposed to be called"));
    }

    function onPhaseChange(nextStage: AuthType | string, status: IStageStatus) {
        uiAuthStage = nextStage;
    }

    function onUpdatePhaseChange(newPhase: number) {
        uiAuthPhase = newPhase;
    }


    onMount(() => {
        interactiveAuth.attemptAuth().then(async () => {
            await onFinished(true);
        }).catch(async error => {
            console.error(error);
            await onFinished(false);
        }).finally(() => {
            closeModal();
        });
    });
</script>

{#if uiAuthStage === "m.login.sso"}
    <Popup {isOpen}>
        <h1 slot="title">{$LL.chat.e2ee.interactiveAuth.title()}</h1>
        <div slot="content">
            <p>{$LL.chat.e2ee.interactiveAuth.description()}</p>
            {#if uiAuthPhase === INTERACTIVE_AUTH_PHASE.PRE_AUTH}
                <p>Be sure to end SSO connection popup after before clicking on Finish button</p>
            {/if}
        </div>
        <svelte:fragment slot="action">
            <InteractiveAuthSSO authSessionId={interactiveAuth.getSessionId()} matrixClient={matrixClient}
                                onPhaseChange={onUpdatePhaseChange} onCancel={()=>onFinished(false)}
                                submitAuthDict={()=>interactiveAuth.submitAuthDict({})} />
        </svelte:fragment>
    </Popup>
{/if}
