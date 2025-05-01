<script lang="ts">
    import { asError } from "catch-unknown";
    import { IconCircleX, IconInfoCircle } from "@wa-icons";

    export let promise: () => Promise<string>;
    export let initialText: string;
    export let loadingText: string;
    export let dataTestId: string | undefined = undefined;
    let finalText: string;

    let state = "ready";

    function click() {
        state = "loading";
        promise()
            .then((result) => {
                state = "success";
                finalText = result;
            })
            .catch((result) => {
                state = "error";
                finalText = asError(result).message;
            })
            .finally(() => {
                setTimeout(() => {
                    state = "ready";
                }, 3_500);
            });
    }
</script>

<button
    type="button"
    data-testid={dataTestId}
    class={`${state} button-state btn btn-secondary w-full button-state`}
    on:click={click}
    disabled={state !== "ready"}
>
    {#if state === "ready"}
        {initialText}
    {:else if state === "loading"}
        <svg
            aria-hidden="true"
            role="status"
            class="inline w-4 h-4 mr-3 text-gray-200 animate-spin"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentColor"
            />
        </svg>
        {loadingText}
    {:else}
        {#if state === "success"}
            <IconInfoCircle class="mr-3" />
        {:else}
            <IconCircleX class="mr-3" />
        {/if}
        {finalText}
    {/if}
</button>
