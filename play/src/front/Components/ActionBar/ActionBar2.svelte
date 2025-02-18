<script lang="ts">
    import { peerStore } from "../../Stores/PeerStore";

    import {onMount} from "svelte";
    import { highlightFullScreen } from "../../Stores/ActionsCamStore";

    let actionBar: HTMLDivElement;
    let centerPlusRightDiv: HTMLDivElement;
    let rightDiv: HTMLDivElement;
    let actionBarWidth: number;
    let centerDivWidth: number;
    let leftDivWidth: number;
    let hiddenItemsWidth: number;

    $: if (centerPlusRightDiv) centerPlusRightDiv.style.minWidth = `${Math.min(actionBarWidth*0.5 + centerDivWidth*0.5, actionBarWidth - leftDivWidth)}px`;
    $: if (centerPlusRightDiv) centerPlusRightDiv.style.maxWidth = `${actionBarWidth - leftDivWidth}px`;
    //$: if (centerPlusRightDiv) centerPlusRightDiv.style.minWidth = `${actionBarWidth*0.5 + centerDivWidth*0.5}px`;

    let shrinkNumber = 0;

    $: console.log("hiddenItemsWidth is "+hiddenItemsWidth);
    $: if (hiddenItemsWidth === 0 ) {
        shrinkNumber++;
    }


    onMount(() => {
        // Let's listen to the intersection observer between the actionbar and the centerPlusRightDiv
        const options = {
            root: actionBar,
            rootMargin: "0px",
            threshold: 1.0,
        };

        const observer = new IntersectionObserver((entries) => {
            /*entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // The action bar is intersecting with the centerPlusRightDiv
                    // We need to hide the action bar
                    highlightFullScreen.set(true);
                } else {
                    // The action bar is not intersecting with the centerPlusRightDiv
                    // We need to show the action bar
                    highlightFullScreen.set(false);
                }
            }, options);*/
            console.log(entries[0].isIntersecting);
        }, options);

        observer.observe(rightDiv);
    });
</script>

<div
    class="@container/actions w-full h-10 z-[301] transition-all pointer-events-none bp-menu flex justify-between items-center overflow-hidden {$peerStore.size > 0 &&
    $highlightFullScreen
        ? 'hidden'
        : ''}"
    bind:clientWidth={actionBarWidth}
    bind:this={actionBar}
>
    <!-- Left bar -->
    <div class="flex-1 flex h-8">
        <div class="bg-red-500 h-full w-16 flex-none" bind:clientWidth={leftDivWidth}>
a
        </div>
        <div class="bg-gray-600 w-0 h-8 flex-1 min-w-0 flex justify-end" bind:clientWidth={hiddenItemsWidth}>
<!--            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none">1</div>-->
<!--            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none">2</div>-->
        </div>
    </div>
    <!-- Center + right bar -->
    <div class="bg-green-500 h-full flex justify-between "
         class:flex-none={hiddenItemsWidth !== 0}
         class:flex-1={hiddenItemsWidth === 0}
         bind:this={centerPlusRightDiv}>
        <!-- Center bar -->
        <div class="bg-blue-500 h-8 w-16 flex-none mx-2 flex justify-end" bind:clientWidth={centerDivWidth}>
            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none"></div>
            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none"></div>
        </div>
        <!-- Right bar -->
        <div class="bg-violet-500 h-8 flex-none flex flex-row justify-end"
             class:flex-none={hiddenItemsWidth !== 0}
             class:flex-1={hiddenItemsWidth === 0}
             bind:this={rightDiv}>
            {#if shrinkNumber < 1}
            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none">1</div>
            {/if}
            {#if shrinkNumber < 2}
                <div class="bg-yellow-600 w-6 h-6 m-1 flex-none">2</div>
            {/if}
            {#if shrinkNumber < 3}
            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none">3</div>
            {/if}
            {#if shrinkNumber < 4}
            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none">4</div>
            {/if}
            {#if shrinkNumber < 5}
            <div class="bg-yellow-600 w-6 h-6 m-1 flex-none">5</div>
                {/if}
        </div>
    </div>
</div>
