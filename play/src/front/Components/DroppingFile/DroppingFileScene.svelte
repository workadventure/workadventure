<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
</script>

<div
    class="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 opacity-100 pointer-events-none bg-white/5 backdrop-blur-sm"
    aria-hidden={true}
>
    <div class="flex flex-col items-center justify-center text-white/90 space-y-3">
        <p class="text-xl font-semibold text-white/80 drop-shadow-sm">
            {$LL.mapEditor.entityEditor.drop()}
        </p>
    </div>
</div>
