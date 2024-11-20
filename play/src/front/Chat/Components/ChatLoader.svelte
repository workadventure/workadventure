<script lang="ts">
    import { IconLoader } from "@wa-icons";

    export let label: string;
</script>

<div class="text-gray-400 text-xl flex flex-col items-center my-10 gap-2">
    <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={40} />
    <p class="m-0">
        {label}
    </p>
</div>
