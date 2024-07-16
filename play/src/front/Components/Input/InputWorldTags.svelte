<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import InputTags from "./InputTags.svelte";

    async function searchWorldTags(filterText: string): Promise<{ value: string; label: string; }[]> {
        const customTag = {
                    value: filterText,
                    label: `add a new tag: '${filterText}'`,
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
        return[customTag];
    }
</script>

<div>
    <InputTags label="Tags" value={[]} queryOptions={searchWorldTags}   {...$$props} testId="worldTagsAutoCompleteInput" />
</div>
