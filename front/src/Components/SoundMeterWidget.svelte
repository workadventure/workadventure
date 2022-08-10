<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    export let volume = 0;
    let display = true;
    export let classcss: string;
</script>

<div
    class="tw-flex tw-justify-between tw-w-10 tw-h-10 md:tw-w-5 md:tw-w-5 lg:tw-w-10 lg:tw-h-10 tw-items-center {classcss ??
        ''}"
    class:active={display}
>
    <div
        class=" tw-h-1/5 voice-meter-bar"
        class:scale-y-min={volume < 35}
        class:tw-scale-y-[0.3]={volume >= 35 && volume < 50}
        class:tw-scale-y-75={volume >= 50 && volume < 65}
        class:tw-scale-y-125={volume >= 65 && volume < 80}
        class:tw-scale-y-140={volume >= 80 && volume < 95}
        class:tw-scale-y-135={volume > 95}
    />
    <div
        class="tw-h-1/2 voice-meter-bar"
        class:scale-y-min={volume < 35}
        class:tw-scale-y-35={volume >= 35 && volume < 50}
        class:tw-scale-y-95={volume >= 50 && volume < 65}
        class:tw-scale-y-110={volume >= 65 && volume < 80}
        class:tw-scale-y-235={volume >= 80 && volume < 95}
        class:tw-scale-y-135={volume > 80}
    />
    <div
        class="tw-h-2/5 voice-meter-bar"
        class:scale-y-min={volume < 35}
        class:tw-scale-y-75={volume >= 35 && volume < 50}
        class:tw-scale-y-80={volume >= 50 && volume < 65}
        class:tw-scale-y-95={volume >= 65 && volume < 80}
        class:tw-scale-y-235={volume >= 80 && volume < 95}
        class:tw-scale-y-135={volume > 95}
    />
    <div
        class="tw-h-3/5 voice-meter-bar"
        class:scale-y-min={volume < 35}
        class:tw-scale-y-[0.4]={volume >= 35 && volume < 50}
        class:tw-scale-y-80={volume >= 50 && volume < 65}
        class:tw-scale-y-105={volume >= 65 && volume < 80}
        class:tw-scale-y-235={volume >= 80 && volume < 95}
        class:tw-scale-y-135={volume > 95}
    />
    <div
        class="tw-h-3/5 voice-meter-bar"
        class:scale-y-min={volume < 35}
        class:tw-scale-y-35={volume >= 35 && volume < 50}
        class:tw-scale-y-75={volume >= 50 && volume < 65}
        class:tw-scale-y-95={volume >= 65 && volume < 80}
        class:tw-scale-y-235={volume >= 80 && volume < 95}
        class:tw-scale-y-135={volume > 95}
    />
    <div
        class="tw-h-1/2 voice-meter-bar"
        class:scale-y-min={volume < 35}
        class:tw-scale-y-[0.4]={volume >= 35 && volume < 50}
        class:tw-scale-y-80={volume >= 50 && volume < 65}
        class:tw-scale-y-95={volume >= 65 && volume < 80}
        class:tw-scale-y-125={volume >= 80 && volume < 95}
        class:tw-scale-y-135={volume > 95}
    />
    <div
        class="tw-h-1/5 voice-meter-bar"
        class:scale-y-min={volume < 35}
        class:tw-scale-y-35={volume >= 35 && volume < 50}
        class:tw-scale-y-95={volume >= 50 && volume < 65}
        class:tw-scale-y-140={volume >= 65 && volume < 80}
        class:tw-scale-y-125={volume >= 80 && volume < 95}
        class:tw-scale-y-135={volume > 95}
    />
</div>
