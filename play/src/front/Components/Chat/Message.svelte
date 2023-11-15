<script lang="ts">

    export let message = "On dirait Chat GPT quand tu parles...";
    export let user = "par Hugo";
    export let time = "Il y'a 4 minutes";

</script>
<div class="group">
    <div class="rounded-lg px-4 py-2 text-xs overflow-hidden bg-contrast/50 text-white max-w-[300px] mt-1 shadow-lg inline-block clear-both hover:bg-contrast/80 transition-all">
        {message}
    </div>
    <div class="group-hover:h-3 group-hover:opacity-100 group-hover:visible invisible opacity-0 h-0 transition-all text-xxs mt-1">
        <span class="opacity-50">{time}</span> {user} <!-- trad -->
    </div>
</div>