<script lang="ts">
    import type { Snippet } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import InputTags from "./InputTags.svelte";
    import type { InputTagOption } from "./InputTagOption";

    interface Props {
        value?: InputTagOption[];
        info?: Snippet | string;
        onchange?: (value?: InputTagOption[]) => void;
        [key: string]: unknown;
    }

    let { value = $bindable(), info: infoContent, onchange, ...rest }: Props = $props();

    function _handleChange() {
        onchange?.(value);
    }

    async function searchRoomTags(filterText: string): Promise<{ value: string; label: string }[]> {
        const customTag = {
            value: filterText,
            label: filterText,
        };
        if (filterText.length === 0) return [];
        const connection = gameManager.getCurrentGameScene().connection;
        if (connection) {
            try {
                const tags = await connection.queryTags(filterText);
                const result = tags.map((tag) => {
                    return {
                        value: tag,
                        label: tag,
                    };
                });
                result.push(customTag);
                return result;
            } catch (error) {
                console.error(error);
                return [customTag];
            }
        }
        return [customTag];
    }
</script>

<div class="flex flex-col w-full">
    <div>
        <InputTags bind:value queryOptions={searchRoomTags} onchange={_handleChange} {...rest}>
            {#snippet info()}
                {#if typeof infoContent === "function"}
                    {@render infoContent()}
                {:else if infoContent}
                    <span>{infoContent}</span>
                {/if}
            {/snippet}
        </InputTags>
    </div>
</div>
