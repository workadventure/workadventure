<script lang="ts">
    import { FileIcon, EyeIcon, DownloadCloudIcon, LoaderIcon } from "svelte-feather-icons";
    import { LL } from "../../i18n/i18n-svelte";
    import { iframeListener } from "../../IframeListener";
    import { FileMessageManager } from "../../Services/FileMessageManager";

    export let url: string;
    export let name: string | undefined;

    function openCoWebsite() {
        iframeListener.openCoWebsite(url, true, "allowfullscreen");
    }

    let loadingDownload = false;
    function download() {
        loadingDownload = true;
        fetch(url, { method: "GET" })
            .then((res) => {
                return res.blob();
            })
            .then((blob) => {
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = name ?? FileMessageManager.getName(url);
                document.body.appendChild(a);
                a.click();
                setTimeout((_) => {
                    URL.revokeObjectURL(url);
                }, 60000);
                a.remove();
                loadingDownload = false;
            })
            .catch((err) => {
                loadingDownload = false;
                console.error("err: ", err);
            });
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

    <div class="actions tw-mt-2">
        <span class="action wa-dropdown-item" on:click={openCoWebsite}>
            <EyeIcon size="14" />
            <span class="tw-ml-1 tw-text-xxs">{$LL.file.openCoWebsite()}</span>
        </span>
        <span class="action wa-dropdown-item" on:click={download}>
            {#if loadingDownload === true}
                <LoaderIcon size="14" class="tw-animate-spin" />
            {:else}
                <DownloadCloudIcon size="14" />
            {/if}
            <span class="tw-ml-1 tw-text-xxs">{$LL.file.download()}</span>
        </span>
    </div>
</div>
