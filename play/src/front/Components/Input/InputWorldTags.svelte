<script lang="ts">
    import { gameManager } from "../../Phaser/Game/GameManager";
    import InputTags from "./InputTags.svelte";

    async function searchWorldTags(filterText: string) {
        console.log("on searchWorldTags");
        if (filterText.length < 1) return [];
        const connection = gameManager.getCurrentGameScene().connection;
        if (connection) {
            try {
                return await connection.queryTags(filterText);
            } catch (error) {
                console.error(error);
            }
        }
        return [];
    }
</script>

<div>
    <InputTags label="Tags" value={[]} queryOptions={searchWorldTags} {...$$props} />
</div>
