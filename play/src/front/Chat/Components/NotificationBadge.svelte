<script lang="ts">
    type NotificationType = "success" | "error" | "warning"
    export let type: NotificationType = "success";

</script>

<div class:tw-bg-green-500={type==="success"} class:tw-bg-orange-500={type==="warning"} class:tw-bg-red-500={type==="error"} class="tw-absolute tw-top-[-4px] tw-right-[-4px] tw-h-3 tw-w-3 tw-rounded-full"/>
