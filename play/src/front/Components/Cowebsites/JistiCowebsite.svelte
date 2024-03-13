<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { jitsiExternalApiFactory } from "../../WebRtc/JitsiExternalApiFactory";
    import { inExternalServiceStore } from "../../Stores/MyMediaStore";
    import { CoWebsite } from "../../WebRtc/CoWebsite/CoWebsite";
    import CancelablePromise from "cancelable-promise";
    import { JitsiCoWebsite } from "../../WebRtc/CoWebsite/JitsiCoWebsite";


    // export let coWebsite: CoWebsite;
    // let url: string;
    // let widthPercent: number | undefined;
    // let closable: boolean | undefined;
    // let roomName: string;
    // let playerName: string;
    // let jwt: string | undefined;
    // let jitsiConfig: object | undefined;
    // let jitsiInterfaceConfig: object | undefined;
    // let domain: string;
    // let CancelablePromise: CancelablePromise<HTMLIFrameElement> | undefined;
    // let loadPromise : CancelablePromise | undefined;


    // Faire une instance ou un reprendre la fonction load de Jitsi
    onMount(() => {

    });





    onDestroy(() => {

    });



</script>

<div class="container">
    <!-- <iframe title= "{coWebsite.getId()}" src={coWebsite.getUrl().toString()} frameborder="0" height="100%" width="100%"></iframe> -->
</div>
