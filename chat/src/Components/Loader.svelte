<script lang="ts">
    export let text: string;
    export let height: string = "h-screen";
</script>

<div class={`grid place-items-center ${height} loader`}>
    <div class="flex items-center flex-col">
        <div
            style="border-top-color:transparent"
            class="w-16 h-16 border-2 border-white border-solid rounded-full animate-spin mb-5"
        ></div>
        <div class="animate-pulse">{text}</div>
    </div>
</div>

<style>
    .loader {
        font-family: "Roboto", sans-serif;
    }
</style>
