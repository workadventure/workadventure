<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import silentImg from "../images/silent-zone.gif";
</script>

<div
    class="z-[250] py-4 px-3 text-white border-[1px] border-solid border-danger flex flex-col items-center content-center justify-between bg-no-repeat bg-center bg-danger-1000/70 backdrop-blur rounded-xl text-center"
>
    <div class="flex flex-col -mt-20 leading-3">
        <img src={silentImg} alt="" class="h-40 w-40" />
    </div>
    <div class="m-0 text-center -mt-4 text-lg bold">
        {$LL.camera.my.silentZone()}
    </div>
    <div class="text-danger-400 text-xs">
        {$LL.camera.my.silentZoneDesc()}
    </div>
</div>
