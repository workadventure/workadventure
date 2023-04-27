<script>
    import { createEventDispatcher } from "svelte";
    import trashImg from "../../images/trash.svg";

    const dispatch = createEventDispatcher();
</script>

<button
    class="close-button"
    on:click={() => {
        dispatch("click");
    }}
>
    <img src={trashImg} alt="" />
</button>

<style lang="scss">
    .close-button {
        float: right;
        background-color: #e96c52;
        padding: 3px;
        border-radius: 8px;
        cursor: pointer;
        img {
            object-fit: contain;
        }
    }
</style>
