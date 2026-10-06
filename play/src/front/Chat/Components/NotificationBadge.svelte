<script lang="ts">
    type NotificationType = "success" | "error" | "warning";
    interface Props {
        type: NotificationType;
    }

    let { type = "success" }: Props = $props();
</script>

<div
    class:bg-green-500={type === "success"}
    class:bg-orange-500={type === "warning"}
    class:bg-red-500={type === "error"}
    class="absolute top-[-4px] right-[-4px] h-3 w-3 rounded-full"
></div>
