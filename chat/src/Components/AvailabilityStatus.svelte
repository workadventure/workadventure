<script lang="ts">
    import LL from "../i18n/i18n-svelte";

    export let status: number;

    function getColorOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
            default:
                return "tw-text-pop-green";
            case 2:
                return "tw-text-pop-red";
            case 3:
                return "tw-text-orange";
        }
    }

    function getNameOfAvailabilityStatus(status: number) {
        switch (status) {
            case 1:
            default:
                return $LL.status.online();
            case 2:
                return $LL.status.away();
            case 3:
                return $LL.status.unavailable();
        }
    }
</script>

<div
    class={`tw-text-xs ${getColorOfAvailabilityStatus(status)} tw-mt-0`}
>
    {getNameOfAvailabilityStatus(status)}
</div>
