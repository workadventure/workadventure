<script lang="ts">
    export let volume = 0;
    let display = true;
    export let classcss;
</script>

<div
    class="tw-flex tw-justify-between tw-w-10 tw-h-10 md:tw-w-5 md:tw-w-5 lg:tw-w-10 lg:tw-h-10 tw-items-center {classcss ?? ''}"
    class:active={display}
>
    <div
        class="tw-rounded tw-flex tw-h-1/5 tw-w-1 md:tw-w-0.5 lg:tw-w-1 tw-bg-white tw-drop-shadow-lg tw-transition-transform"
        class:tw-scale-y-01={volume < 10}
        class:tw-scale-y-[0.3]={volume >= 10 && volume < 20}
        class:tw-scale-y-75={volume >= 20 && volume < 40}
        class:tw-scale-y-125={volume >= 40 && volume < 60}
        class:tw-scale-y-140={volume >= 60 && volume < 80}
        class:tw-scale-y-150={volume > 80}
    />
    <div
        class="tw-rounded tw-flex tw-h-1/2 tw-w-1 md:tw-w-0.5 lg:tw-w-1 tw-bg-white tw-drop-shadow-lg tw-transition-transform"
        class:tw-scale-y-01={volume < 10}
        class:tw-scale-y-50={volume >= 10 && volume < 20}
        class:tw-scale-y-100={volume >= 20 && volume < 40}
        class:tw-scale-y-110={volume >= 40 && volume < 60}
        class:tw-scale-y-250={volume >= 60 && volume < 80}
        class:tw-scale-y-150={volume > 80}
    />
    <div
        class="tw-rounded tw-flex tw-h-2/5 tw-w-1 md:tw-w-0.5 lg:tw-w-1 tw-bg-white tw-drop-shadow-lg tw-transition-transform"
        class:tw-scale-y-01={volume < 10}
        class:tw-scale-y-75={volume >= 10 && volume < 20}
        class:tw-scale-y-90={volume >= 20 && volume < 40}
        class:tw-scale-y-100={volume >= 40 && volume < 60}
        class:tw-scale-y-250={volume >= 60 && volume < 80}
        class:tw-scale-y-150={volume > 80}
    />
    <div
        class="tw-rounded tw-flex tw-h-3/5 tw-w-1 md:tw-w-0.5 lg:tw-w-1 tw-bg-white tw-drop-shadow-lg tw-transition-transform"
        class:tw-scale-y-01={volume < 10}
        class:tw-scale-y-[0.4]={volume >= 10 && volume < 20}
        class:tw-scale-y-80={volume >= 20 && volume < 40}
        class:tw-scale-y-105={volume >= 40 && volume < 60}
        class:tw-scale-y-250={volume >= 60 && volume < 80}
        class:tw-scale-y-150={volume > 80}
    />
    <div
        class="tw-rounded tw-flex tw-h-3/5 tw-w-1 md:tw-w-0.5 lg:tw-w-1 tw-bg-white tw-drop-shadow-lg tw-transition-transform"
        class:tw-scale-y-01={volume < 10}
        class:tw-scale-y-50={volume >= 10 && volume < 20}
        class:tw-scale-y-75={volume >= 20 && volume < 40}
        class:tw-scale-y-100={volume >= 40 && volume < 60}
        class:tw-scale-y-250={volume >= 60 && volume < 80}
        class:tw-scale-y-150={volume > 80}
    />
    <div
        class="tw-rounded tw-flex tw-h-1/2 tw-w-1 md:tw-w-0.5 lg:tw-w-1 tw-bg-white tw-drop-shadow-lg tw-transition-transform"
        class:tw-scale-y-01={volume < 10}
        class:tw-scale-y-[0.4]={volume >= 10 && volume < 20}
        class:tw-scale-y-90={volume >= 20 && volume < 40}
        class:tw-scale-y-100={volume >= 40 && volume < 60}
        class:tw-scale-y-125={volume >= 60 && volume < 80}
        class:tw-scale-y-150={volume > 80}
    />
    <div
        class="tw-rounded tw-flex tw-h-1/5 tw-w-1 md:tw-w-0.5 lg:tw-w-1 tw-bg-white tw-drop-shadow-lg tw-transition-transform"
        class:tw-scale-y-01={volume < 10}
        class:tw-scale-y-50={volume >= 10 && volume < 20}
        class:tw-scale-y-100={volume >= 20 && volume < 40}
        class:tw-scale-y-140={volume >= 40 && volume < 60}
        class:tw-scale-y-125={volume >= 60 && volume < 80}
        class:tw-scale-y-150={volume > 80}
    />
</div>
