<script lang="ts">
    import { MatrixEvent, Room } from "matrix-js-sdk";
    import { Writable } from "svelte/store";
    import { MoreHorizontalIcon } from "svelte-feather-icons";
    import Button from "./Button.svelte";
    import { selectedRoom } from "../../Stores/MatrixStore";
    import { RoomWrapper } from "../../Matrix/MatrixClient";
    import * as MatrixEventsUtils from "../../Utils/MatrixEventUtils";
    import { chatConnectionManager } from "../../Connection/ChatConnectionManager";

    let lineDiv: HTMLDivElement;
    export let roomWrapper: RoomWrapper;
    let room: Writable<Room> = roomWrapper.room;
    let messages: Writable<MatrixEvent[]> = roomWrapper.messages;
    const lastEvent = $messages.at(-1);
    function open() {
        lineDiv.classList.add("animation-slide-out-right");
        setTimeout(() => selectedRoom.set(roomWrapper), 150);
    }
</script>

<div id="line" on:click={open} bind:this={lineDiv}>
    <div class="body">
        <div class="avatar">
            <img
                src={$room.getAvatarUrl(chatConnectionManager.connectionOrFail.homeServerUrl, 30, 30, "scale") ??
                    `https://via.placeholder.com/50`}
                alt="avatar"
            />
        </div>
        <div class="text">
            <div class="title">{$room.name}</div>
            <div class="snippet">{lastEvent.sender.name} {MatrixEventsUtils.getLocaleType(lastEvent)}</div>
        </div>
    </div>
    <div class="wrapper-button">
        <Button icon={MoreHorizontalIcon} onClick={() => null} />
    </div>
</div>

<style lang="scss">
    #line {
        @apply tw-py-0.5 tw-cursor-pointer tw-rounded-md tw-px-1.5 tw-flex tw-flex-nowrap tw-justify-between tw-items-center;
        .body {
            @apply tw-max-w-[90%] tw-flex tw-items-center tw-min-h-[40px];
            .avatar {
                @apply tw-w-[30px] tw-h-[30px] tw-min-h-[30px] tw-min-w-[30px] tw-bg-dark-purple tw-rounded-md tw-overflow-hidden tw-mr-1.5;
                img {
                    @apply tw-w-full tw-h-full tw-object-cover;
                }
            }

            .text {
                @apply tw-max-w-full;
                div {
                    @apply tw-whitespace-nowrap tw-text-ellipsis tw-max-w-full tw-overflow-hidden;
                    &.title {
                        @apply tw-m-0 tw-p-0 tw-text-white tw-font-bold;
                    }

                    &.snippet {
                        @apply tw-text-lighter-purple tw-text-xxs;
                    }
                }
            }
        }

        &:hover {
            @apply tw-bg-medium-purple;
            .wrapper-button {
                @apply tw-block;
            }
            .body {
                @apply tw-max-w-[85%];
                .text {
                    @apply tw-max-w-[85%];
                }
            }
        }

        .wrapper-button {
            @apply tw-hidden;
        }
    }
</style>
