<script lang="ts">
    import Bubble from "../Ui/Bubble.svelte";
    import { locale } from "../../../i18n/i18n-svelte";
    export let type: string;
    export let text: string;
    export let author: string;
    export let date: Date;
    export let showAvatar: boolean = true;
    export let showAuthor: boolean = true;
</script>

<div id="message" class={`${type} ${type === "sent" ? "animation-slide-in-right" : "animation-slide-in-left"} ${showAuthor ? 'author-shown':''}`}>
    <div class="content">
        <div class={`avatar ${showAvatar ? "" : "tw-opacity-0"}`}>
            <img src="https://via.placeholder.com/30" alt="avatar" />
        </div>
        <div class="body">
            {#if showAuthor}
                <div class="head">
                    <div class="author">{author}</div>
                    <div class="time">{date.toLocaleTimeString($locale, { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
            {:else}
                <div class="tw-h-1" />
            {/if}
            <Bubble {type} {text} showTail={showAvatar} />
        </div>
    </div>
</div>

<style lang="scss">
    #message {
        @apply tw-w-full;
        .content {
            @apply tw-max-w-[80%] tw-flex tw-flex-wrap tw-flex-row tw-items-end tw-w-full;
            .avatar {
                @apply tw-rounded-full tw-overflow-hidden tw-w-[30px] tw-h-[30px];
                img {
                    @apply tw-w-full tw-h-full tw-object-cover;
                }
            }
            .body {
                max-width: calc(100% - 35px);
                .head {
                    @apply tw-text-lighter-purple tw-text-xs tw-px-2.5 tw-flex tw-flex-wrap tw-justify-between tw-items-end tw-cursor-default;
                    .time {
                        @apply tw-text-xxs tw-opacity-0;
                    }
                }
            }
        }

        &:hover {
            .content .body .head .time {
                @apply tw-opacity-100 tw-ease-in-out tw-transition-all tw-duration-300;
            }
        }

        &.received {
            @apply tw-flex tw-justify-start;
            .content {
                @apply tw-self-start tw-justify-start;
                .body .head {
                    @apply tw-pl-3.5;
                }
            }
        }

        &.sent {
            @apply tw-flex tw-justify-end;
            .content {
                @apply tw-justify-end;
                .avatar {
                    @apply tw-hidden;
                }
                .body {
                    @apply tw-max-w-full;
                    .head {
                        @apply tw-pr-3.5 tw-justify-end;
                        .author {
                            @apply tw-hidden;
                        }
                    }
                }
            }
        }

		&.author-shown{
			@apply tw-mt-2;
		}
    }
</style>
