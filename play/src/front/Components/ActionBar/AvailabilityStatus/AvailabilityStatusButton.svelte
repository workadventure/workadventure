<script lang="ts">
    import Tooltip from "../../Util/Tooltip.svelte";
    import WokaFromUserId from "../../Woka/WokaFromUserId.svelte";
    import { AvailabilityStatusPropsInterface } from "./Interfaces/AvailabilityStatusPropsInterface";
    import AvailabilityStatusCircle from "./AvailabilityStatusCircle.svelte";

    export let props: AvailabilityStatusPropsInterface;

    $: ({ listStatusTitle, menuVisibility, statusColorHex, currentPlayerName } = props);
</script>

<div>
    <Tooltip text={listStatusTitle} />
    <button class="large flex justify-around mx-1" class:border-top-light={menuVisibility}>
        <AvailabilityStatusCircle position="absolute" colorHex={statusColorHex} />
        <WokaFromUserId userId={-1} customWidth="32px" customHeight="32px" placeholderSrc="" />
        <div
            class="flex max-w-14 h-full font-bold text-white leading-5 whitespace-nowrap select-none"
        >
            <p class="text-ellipsis overflow-hidden py-auto text-center m-auto">
                {currentPlayerName}
            </p>
        </div>
    </button>
</div>
