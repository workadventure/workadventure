<script lang="ts">
    import { IconLoader } from "@wa-icons";

    export let label: string;
</script>

<div class="tw-text-gray-400 tw-text-xl tw-flex tw-flex-col tw-items-center tw-mt-20">
    <IconLoader class="tw-animate-[spin_2s_linear_infinite]" font-size={40} />
    <p class="tw-m-0">
        {label}
    </p>
</div>
