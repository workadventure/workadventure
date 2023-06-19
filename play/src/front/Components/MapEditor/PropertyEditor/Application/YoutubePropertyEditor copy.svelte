<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import OpenWebsitePropertyEditor from "../OpenWebsitePropertyEditor.svelte";
    import { OpenWebsitePropertyData } from "@workadventure/map-editor";
    import youtubeSvg from "../../../images/applications/icon_youtube.svg";
    import { isString } from "lodash";
    import axios from "axios";

    export let property: OpenWebsitePropertyData;
    let youtubeEmbedLink : string | undefined;
    const dispatch = createEventDispatcher();

    onMount(() => {
        // check if the web link youtube is embeddable
    });

    // eslint-disable-next-line no-undef
    let timeOutWriteUrl: NodeJS.Timeout | undefined = undefined;
    function changeUrl(value: CustomEvent){
        if(!isString(value.detail)) return;
        if(timeOutWriteUrl) clearTimeout(timeOutWriteUrl);
        timeOutWriteUrl = setTimeout(() => {
            axios.get(`https://www.youtube.com/oembed?url=${value.detail}&format:json`).then((res) => {
                console.log(res);
                const html = res.data.html;
                const div = document.createElement('div');
                div.insertAdjacentHTML('beforeend', html);
                const iframe : HTMLIFrameElement = (div.firstChild as HTMLIFrameElement);
                property.link = iframe.src;
            }).catch((err) => {});
        }, 1000);
    }
</script>

<OpenWebsitePropertyEditor
    property={property}
    icon={youtubeSvg}
    on:close={() => {
        dispatch("close");
    }}
    on:change={changeUrl}
>
</OpenWebsitePropertyEditor>

<style lang="scss">
</style>
