<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";
    import messageSmileyImg from "../images/message-smiley.svg";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
</script>

<div class="flex-col items-center justify-center text-center px-4 py-12">
    <slot name="emoji">
        <img src={messageSmileyImg} alt="Smiley happy" />
    </slot>
    <div class="w-full text-center text-lg font-bold">
        <slot name="title">
            {$LL.chat.requiresLoginForChat()}
        </slot>
    </div>
    <div class="flex justify-center">
        <a
            class="flex justify-center rounded-lg h-10 bg-secondary hover:bg-secondary-800 hover:no-underline hover:text-white no-underline transition-all items-center my-4 text-base px-8 text-white"
            href="/login"
            on:click={() => analyticsClient.login()}
        >
            <slot name="button-label">
                {$LL.menu.profile.login()}
            </slot>
        </a>
    </div>
</div>
