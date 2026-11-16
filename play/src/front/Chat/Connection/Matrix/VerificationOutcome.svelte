<script lang="ts">
    import { IconAlertTriangle, IconShieldCheck } from "@wa-icons";

    interface Props {
        tone: "success" | "danger";
        title: string;
        description: string;
        dataTestId?: string;
    }

    let { tone, title, description, dataTestId }: Props = $props();
</script>

<div
    class="w-full flex flex-col items-center gap-3.5 pt-3 pb-2 text-center"
    role={tone === "danger" ? "alert" : "status"}
    data-testid={dataTestId}
>
    <div
        class="w-[72px] h-[72px] rounded-full flex items-center justify-center {tone === 'success'
            ? 'bg-success/20 text-success-400'
            : 'bg-danger/20 text-danger-400'}"
    >
        {#if tone === "success"}
            <IconShieldCheck font-size="36" />
        {:else}
            <IconAlertTriangle font-size="36" />
        {/if}
    </div>
    <p class="m-0 text-xl font-bold">{title}</p>
    <p class="m-0 text-base text-white/80 max-w-[46ch]">{description}</p>
</div>
