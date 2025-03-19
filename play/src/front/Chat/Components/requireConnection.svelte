<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import messageSmileyImg from "../images/message-smiley.svg";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
</script>

<div class="tw-flex-col tw-items-center tw-justify-center tw-text-center tw-px-4 tw-py-12">
    <slot name="emoji">
        <img src={messageSmileyImg} alt="Smiley happy" />
    </slot>
    <div class="tw-w-full tw-text-center tw-text-lg tw-font-bold">
        <slot name="title">
            {$LL.chat.requiresLoginForChat()}
        </slot>
    </div>
    <div class="tw-flex tw-justify-center">
        <a
            class="tw-flex tw-justify-center tw-rounded-lg tw-h-10 tw-bg-secondary hover:tw-bg-secondary-800 hover:tw-no-underline hover:tw-text-white tw-no-underline tw-transition-all tw-items-center tw-my-4 tw-text-base tw-px-8 tw-text-white"
            href="/login"
            on:click={() => analyticsClient.login()}
        >
            <slot name="button-label">
                {$LL.menu.profile.login()}
            </slot>
        </a>
    </div>
</div>
