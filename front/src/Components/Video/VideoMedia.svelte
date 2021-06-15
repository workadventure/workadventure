<script lang="ts">
    import {VideoPeer} from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import microphoneCloseImg from "../images/microphone-close.svg";
    import reportImg from "./images/report.svg";
    import blockSignImg from "./images/blockSign.svg";
    import {DivImportance} from "../../WebRtc/LayoutManager";
    import {videoFocusStore} from "../../Stores/VideoFocusStore";

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;

    constraintStore.subscribe((vl) => console.log('CONS', vl));

    function getColorByString(str: string) : string|null {
        let hash = 0;
        if (str.length === 0) {
            return null;
        }
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 255;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    function srcObject(node, stream) {
        node.srcObject = stream;
        return {
            update(newStream) {
                if (node.srcObject != newStream) {
                    node.srcObject = newStream
                }
            }
        }
    }

</script>

<div class="video-container">
    {#if $statusStore === 'connecting'}
        <div class="connecting-spinner"></div>
    {/if}
    {#if $statusStore === 'error'}
        <div class="rtc-error"></div>
    {/if}
    {#if !$constraintStore || $constraintStore.video === false}
        <i style="background-color: {getColorByString(name)};">{name}</i>
    {/if}
    {#if $constraintStore && $constraintStore.audio === false}
        <img src={microphoneCloseImg} alt="Muted">
    {/if}
    <button class="report">
        <img alt="Report this user" src={reportImg}>
        <span>Report/Block</span>
    </button>
    <video use:srcObject={$streamStore} autoplay playsinline on:click={() => videoFocusStore.toggleFocus(peer)}></video>
    <img src={blockSignImg} class="block-logo" alt="Block">
    {#if $constraintStore && $constraintStore.audio !== false}
        <SoundMeterWidget stream={$streamStore}></SoundMeterWidget>
    {/if}
</div>

