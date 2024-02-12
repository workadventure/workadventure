<script lang="ts">
    import Tooltip from "../../Util/Tooltip.svelte";
    import WokaFromUserId from "../../Woka/WokaFromUserId.svelte";
    import { AvailabilityStatusPropsInterface } from "./Interfaces/AvailabilityStatusPropsInterface";
    import AvailabilityStatusCircle from "./AvailabilityStatusCircle.svelte";

    export let props: AvailabilityStatusPropsInterface;

    $: ({ listStatusTitle, menuVisibility, statusColorHex, currentPlayerName } = props);
</script>

<Tooltip text={listStatusTitle} />
<button class=" large tw-flex tw-justify-around  tw-mx-1 " class:border-top-light={menuVisibility}>
    <AvailabilityStatusCircle position="absolute" colorHex={statusColorHex} />
    <WokaFromUserId userId={-1} customWidth="32px" customHeight="32px" placeholderSrc="" />
    <div class=" tw-overflow-ellipsis tw-font-bold tw-text-white tw-leading-5 tw-whitespace-nowrap tw-select-none">
        {currentPlayerName}
    </div>
</button>
