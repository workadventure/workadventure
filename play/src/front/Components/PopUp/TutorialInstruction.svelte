<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import ChevronLeftIcon from "../Icons/ChevronLeftIcon.svelte";
    import ChevronRightIcon from "../Icons/ChevronRightIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import { currentBannerIndex } from "../../Stores/PopupStore";
    import PopUpContainer from "./PopUpContainer.svelte";

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function goToPreviousBanner() {
        if ($currentBannerIndex === 0) return;
        currentBannerIndex.update((slide) => slide - 1);
    }

    function goToNextBanner() {
        if ($currentBannerIndex === 4) return;
        currentBannerIndex.update((slide) => slide + 1);
    }

    function closeBanner() {
        dispatch("close");
    }
</script>

<PopUpContainer>
    <div class="flex p-4 space-x-4 pointer-events-auto">
        <div class="">
            <button
                class="btn btn-light btn-ghost btn-sm {0 < $currentBannerIndex && $currentBannerIndex < 5
                    ? ''
                    : 'opacity-20'}"
                id="chevron-left"
                on:click={goToPreviousBanner}
            >
                <ChevronLeftIcon height="h-4" width="w-4" />
            </button>
        </div>
        <div class="grow">
            <button
                class="btn btn-light btn-ghost btn-sm {$currentBannerIndex === 4 ? 'opacity-20 disbabled' : ''}"
                id="chevron-right"
                on:click={goToNextBanner}
            >
                <ChevronRightIcon height="h-4" width="w-4" />
            </button>
        </div>
        <div class="">
            <button class="btn btn-secondary btn-sm" on:click={closeBanner}>
                <XIcon height="h-4" width="w-4" />
            </button>
        </div>
    </div>
    <div class="flex pb-4 px-8 space-x-4">
        <div>
            <svg width="59" height="59" viewBox="0 0 59 59" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M17.8677 44.1154V35.0185C17.8677 32.8352 16.0978 31.0653 13.9143 31.0653H4.81749C2.63426 31.0653 0.864258 32.8352 0.864258 35.0185V44.1154C0.864258 46.2987 2.63426 48.0686 4.81749 48.0686H13.9143C16.0978 48.0686 17.8677 46.2987 17.8677 44.1154Z"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M38.0017 44.1155V35.0187C38.0017 32.8353 36.2318 31.0654 34.0485 31.0654H24.9515C22.7683 31.0654 20.9983 32.8353 20.9983 35.0187V44.1155C20.9983 46.2988 22.7683 48.0687 24.9515 48.0687H34.0485C36.2318 48.0687 38.0017 46.2988 38.0017 44.1155Z"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M20.998 18.3337V23.9814C20.998 26.1651 22.768 27.9351 24.9517 27.9351H34.0483C36.232 27.9351 38.002 26.1651 38.002 23.9814V14.8848C38.002 12.7011 36.232 10.9311 34.0483 10.9311H24.9517C22.7692 10.9311 21.0004 12.6988 20.998 14.8813"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M50.5382 48.0688H54.182C56.3656 48.0688 58.1356 46.2988 58.1356 44.1152V35.0186C58.1356 32.8349 56.3656 31.066 54.182 31.066H45.0854C42.9017 31.066 41.1328 32.8349 41.1328 35.0186V44.1152C41.1328 46.2988 42.9017 48.0688 45.0854 48.0688H47.0812"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M3.82153 40.4702L6.27787 34.0209C6.328 33.8982 6.50177 33.8979 6.55213 34.0207L8.98611 40.4702"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M4.58765 38.864H8.23251"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M48.607 37.1995C48.607 38.9487 47.6363 40.3326 46.096 40.3595C45.5835 40.3685 44.2585 40.3735 44.2585 40.3735C44.2585 40.3735 44.2502 38.0741 44.2502 37.1925C44.2502 36.4685 44.2456 34.0255 44.2456 34.0255H46.0435C47.7328 34.0255 48.607 35.4505 48.607 37.1995Z"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M28.3154 34.6012C28.3154 34.6012 27.1416 33.6146 25.7574 34.0315C24.4864 34.4144 24.3087 35.88 25.2282 36.4794C25.2282 36.4794 26.1304 36.8819 27.1312 37.251C29.5402 38.1397 28.5025 40.4702 26.5631 40.4702C25.5921 40.4702 24.777 40.045 24.2837 39.5006"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M23.8315 14.546L24.8839 19.8662C24.9226 19.9751 25.077 19.974 25.1142 19.8647L26.7573 14.5559V14.546L28.3963 19.8662C28.435 19.9751 28.5895 19.974 28.6267 19.8647L29.6831 14.5559"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M35.0347 22.3364L32.6456 19.9474L30.2566 22.3364"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M32.6458 20.5235V25.0726"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M30.2566 43.3435L32.6456 45.7325L35.0347 43.3435"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M32.6458 45.1564V40.6073"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M12.7631 40.7809L10.374 43.1699L12.7631 45.559"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M10.9502 43.1699H15.4993"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M52.3701 40.7809L54.7592 43.1699L52.3701 45.559"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
                <path
                    d="M54.1834 43.1699H49.6343"
                    stroke="white"
                    stroke-width="1.25"
                    stroke-miterlimit="10"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </div>
        <div class="flex flex-col">
            <slot />
        </div>
    </div>
    <svelte:fragment slot="buttons">
        <button class="btn btn-light btn-sm btn-ghost w-1/2 justify-center responsive-message"
            >View full tutorial</button
        >
        <button
            data-testId="close-tutorial-button"
            class="btn btn-secondary btn-sm w-1/2 justify-center"
            on:click={closeBanner}
        >
            Close
        </button>
    </svelte:fragment>
</PopUpContainer>

<style>
    @media (max-width: 768px) {
        .responsive-message {
            scale: 1.2;
        }
    }
</style>
