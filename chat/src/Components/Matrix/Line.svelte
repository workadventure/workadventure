<script lang="ts">
    import {Room} from "matrix-js-sdk";
    import {Writable} from "svelte/store";
    import {MoreHorizontalIcon} from "svelte-feather-icons";
    import Button from "./Button.svelte";

    export let room: Writable<Room>;
</script>
<div id="line" class="tw-flex tw-flex-wrap tw-justify-between tw-items-center">
    <p>{$room.name}</p>
    <Button icon={MoreHorizontalIcon} onClick={() => null} />
</div>

<style lang="scss">
  #line {
    @apply tw-border-0 tw-border-b tw-border-b-lighter-purple tw-border-solid tw-py-2;
    p {
      @apply tw-m-0 tw-text-white tw-font-bold;
    }

    button {
      @apply tw-inline-flex tw-items-center tw-px-1 tw-py-1 tw-text-sm tw-font-medium tw-text-brand-blue tw-bg-white tw-border tw-border-b-lighter-purple tw-rounded-lg tw-cursor-pointer tw-shadow;
      &:hover {
        @apply tw-text-brand-blue;
      }
    }
  }
</style>