<script lang="ts">
    import { Readable } from "svelte/store";
    import { ChatMessageContent } from "../../../Connection/ChatConnection";

    export let content: Readable<ChatMessageContent>;
</script>

<a
    href={$content.url}
    download
    class="tw-flex tw-items-center tw-text-white hover:tw-bg-white/10 tw-px-4 tw-py-2 tw-rounded-full hover:tw-no-underline hover:tw-text-white tw-font-bold tw-cursor-pointer"
>
    <div class="tw-flex tw-items-center tw-justify-center tw-p-2 tw-bg-white/10 tw-rounded-full">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_4440_22441)">
                <path
                    d="M15.0002 7.00045L8.50019 13.5005C8.10237 13.8983 7.87887 14.4378 7.87887 15.0005C7.87887 15.5631 8.10237 16.1026 8.50019 16.5005C8.89802 16.8983 9.43758 17.1218 10.0002 17.1218C10.5628 17.1218 11.1024 16.8983 11.5002 16.5005L18.0002 10.0005C18.7958 9.2048 19.2428 8.12567 19.2428 7.00045C19.2428 5.87524 18.7958 4.7961 18.0002 4.00045C17.2045 3.2048 16.1254 2.75781 15.0002 2.75781C13.875 2.75781 12.7958 3.2048 12.0002 4.00045L5.50019 10.5005C4.30672 11.6939 3.63623 13.3126 3.63623 15.0005C3.63623 16.6883 4.30672 18.307 5.50019 19.5005C6.69367 20.6939 8.31236 21.3644 10.0002 21.3644C11.688 21.3644 13.3067 20.6939 14.5002 19.5005L21.0002 13.0005"
                    stroke="white"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </g>
            <defs>
                <clipPath id="clip0_4440_22441">
                    <rect width="24" height="24" fill="white" />
                </clipPath>
            </defs>
        </svg>
    </div>
    <div class="tw-px-4 tw-truncate">
        {$content.body}
    </div>
</a>
