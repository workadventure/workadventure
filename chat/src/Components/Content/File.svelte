<script lang="ts">
    import { FileIcon } from "svelte-feather-icons";
    import { createEventDispatcher } from "svelte";
    import { FileMessageManager } from "../../Services/FileMessageManager";

    const dispatch = createEventDispatcher();

    export let url: string;
    export let name: string | undefined;

    function download() {
        dispatch("download", { url, name });
    }
</script>

<div class="file">
    {#if FileMessageManager.isImage(url)}
        <img src={url} width="100%" height="100%" alt={name ?? FileMessageManager.getName(url)} class="tw-mt-2" />
    {:else if FileMessageManager.isVideo(url)}
        <video width="100%" height="100%" alt={name ?? FileMessageManager.getName(url)} class="tw-mt-2" controls>
            <track kind="captions" srclang="en" label="english_captions" src="" />
            <source src={url} type={`video/${FileMessageManager.getExtension(url)}`} />
            Sorry, your browser doesn't support <code>embedded</code> videos.
        </video>
    {:else if FileMessageManager.isSound(url)}
        <audio width="100%" height="100%" controls class="tw-mt-2" src={url}>
            Your browser does not support the <code>audio</code> element.
        </audio>
    {:else}
        <div class="other-content" on:click={download}>
            <div class="icon tw-p-0 tw-mr-1">
                <FileIcon size="22" />
            </div>
            <div class="information">
                <p class="tw-m-0">{name ?? FileMessageManager.getName(url)}</p>
                <!--
                <p class="tw-text-light-purple-alt tw-mt-1 tw-m-0 tw-text-xxs">
                    {link.size ?? "0"}kb - {link.lastModified
                        ? new Date(link.lastModified).toLocaleDateString()
                        : new Date().toLocaleDateString()}
                </p>
                -->
            </div>
        </div>
    {/if}
</div>
