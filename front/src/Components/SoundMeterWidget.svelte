<script lang="ts">
    export let volume = 0;
    let display = true;
</script>

<div class="tw-flex tw-justify-between tw-w-10 tw-h-10 tw-bg-medium-purple tw-absolute" class:active={display}>
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-50 tw-w-1 tw-bg-white animated" />
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-75 tw-w-1 tw-bg-white animated" />
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-[0.25] tw-w-1 tw-bg-white animated" />
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-100 tw-w-1 tw-bg-white animated" />
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-50 tw-w-1 tw-bg-white animated" />
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-75 tw-w-1 tw-bg-white animated" />
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-100 tw-w-1 tw-bg-white animated" />
    <div class="tw-rounded tw-flex tw-h-full tw-scale-y-[0.25] tw-w-1 tw-bg-white animated" />
</div>

<style lang="scss">
    .animated {
        animation-duration: 0.7s;
        animation-timing-function: ease-in;
        animation-iteration-count: infinite;
        .quiet {
            animation-name: quiet;
        }

        .medium {
            animation-name: normal;
        }
    }

    @keyframes quiet {
        25% {
            transform: scaleY(0.6);
        }
        50% {
            transform: scaleY(0.4);
        }
        75% {
            transform: scaleY(0.8);
        }
    }

    @keyframes normal {
        25% {
            transform: scaleY(1);
        }
        50% {
            transform: scaleY(0.4);
        }
        75% {
            transform: scaleY(0.6);
        }
    }

    @keyframes loud {
        25% {
            transform: scaleY(1);
        }
        50% {
            transform: scaleY(0.4);
        }
        75% {
            transform: scaleY(1.2);
        }
    }
</style>
