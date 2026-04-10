<script lang="ts">
    import { getBrowserInfo, getBrowserDisplayName } from "../../Utils/BrowserCompatibility";
    import { LL } from "../../../i18n/i18n-svelte";
    import bgMap from "../images/map-exemple.png";

    let browserInfo = getBrowserInfo();
    let browserName = getBrowserDisplayName();

    function handleUpdateBrowser() {
        window.open(browserInfo.updateUrl, "_blank", "noopener,noreferrer");
    }

    function handleLeave() {
        // Try to go back, or close the window/tab
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
</script>

<div class="fixed inset-0 z-[9999] flex items-center justify-center bg-contrast-1100">
    <!-- Background image layer (like PictureInPicture) -->
    <div
        class="fixed z-[9998] top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-20 bg-black"
        style="background-image: url({bgMap});"
    />
    <!-- Background color overlay -->
    <div class="fixed z-[9998] top-0 left-0 w-full h-full backdrop-blur-md opacity-70" />
    <div
        class="bg-contrast/95 backdrop-blur-md text-white z-[10000] w-[90%] m-auto left-0 right-0 sm:max-w-[600px] rounded-3xl max-h-full overflow-y-auto pointer-events-auto shadow-2xl"
    >
        <div class="p-8 flex flex-col justify-center items-center">
            <div class="flex-row flex items-start w-full justify-between gap-4 mb-6">
                <div class="p-2">
                    <h2 class="text-2xl font-bold">{$LL.warning.browserNotSupported.title()}</h2>
                </div>
                <!-- Note: We don't show close button as user must update or leave -->
            </div>

            <div class="w-full space-y-4">
                <div class="text-center">
                    <p class="text-lg m-0">{$LL.warning.browserNotSupported.message({ browserName })}</p>
                    <p class="text-sm m-0 opacity-90">{$LL.warning.browserNotSupported.description()}</p>
                </div>

                <div class="bg-contrast/50 rounded-lg p-4 mt-6">
                    <h3 class="font-semibold mb-0">{$LL.warning.browserNotSupported.whatToDo()}</h3>
                    <ul class="list-disc list-inside text-sm m-0">
                        <li>{$LL.warning.browserNotSupported.option1({ browserName })}</li>
                        <li>{$LL.warning.browserNotSupported.option2()}</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="footer flex flex-row justify-evenly items-center bg-contrast/80 w-full p-4 gap-3 rounded-b-3xl">
            <button class="btn btn-secondary flex-1" on:click={handleUpdateBrowser} data-testid="update-browser-button">
                {$LL.warning.browserNotSupported.updateBrowser()}
            </button>
            <button class="btn btn-ghost btn-light flex-1" on:click={handleLeave} data-testid="leave-button">
                {$LL.warning.browserNotSupported.leave()}
            </button>
        </div>
    </div>
</div>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>
