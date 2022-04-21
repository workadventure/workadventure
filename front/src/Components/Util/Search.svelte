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

<form>
    <input
        type="text"
        {id}
        name="search-input"
        class="search-input"
        {placeHolder}
        on:input={(event) => onChangeSearchHandler(event.currentTarget.value)}
        {disabled}
    />
    <button type="submit">
        <img src="/static/images/send.png" alt="Send" width="20" />
    </button>
</form>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;
        margin-top: 50px;
        width: 285px;

        input {
            flex: auto;
            background-color: #254560;
            color: white;
            border-bottom-left-radius: 4px;
            border-top-left-radius: 4px;
            border: none;
            font-size: 22px;
            font-family: Lato;
            padding-left: 6px;
            min-width: 0; //Needed so that the input doesn't overflow the container in firefox
            outline: none;
        }

        button {
            background-color: #254560;
            border-bottom-right-radius: 4px;
            border-top-right-radius: 4px;
            border: none;
            border-left: solid white 1px;
            font-size: 16px;
        }
    }
</style>
