<script lang="ts">
    import LL from "../../i18n/i18n-svelte";
    import { searchValue } from "../../Stores/Utils/SearchStore";

    export let id: string | undefined;
    export let placeHolder: string = $LL.muc.userList.search();
    export let disabled: boolean = false;
    export let onChangeSearchHandler = (value: string) => {
        searchValue.set(value);
    };
</script>

<div class="search">
    <input
        type="text"
        {id}
        name="search-input"
        class="search-input"
        {placeHolder}
        on:input={(event) => onChangeSearchHandler(event.currentTarget.value)}
        {disabled}
    />
</div>

<style lang="scss">
    div.search {
        width: 100%;
        height: 20px;
        input.search-input {
            padding: 2px;
            border: solid 1px white;
            border-radius: 4px;
        }
    }
</style>
