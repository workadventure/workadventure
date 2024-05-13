<script lang="ts">
    type NotificationType = "success" | "error" | "warning"
    export let type: NotificationType = "success";

    function getBackgroundColor(type:NotificationType){
        switch (type) {
            case "success":
                return "tw-bg-green-500";
            case "warning":
                return "tw-bg-orange-500";
            case "error":
                return "tw-bg-red-500"
        }
    }

</script>

<div class={`tw-absolute tw-top-[-4px] tw-right-[-4px] tw-h-3 tw-w-3 tw-rounded-full ${getBackgroundColor(type)}`}/>
