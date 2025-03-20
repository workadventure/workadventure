<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { searchValue } from "../../Stores/Utils/SearchStore";

    export let id: string | undefined;
    export let placeHolder: string = $LL.chat.userList.search();
    export let disabled = false;
    export let onChangeSearchHandler = (value: string) => {
        searchValue.set(value);
    };
</script>

<form>
    <input
        type="text"
        {id}
        name="search-input"
        class="h-full rounded-none"
        placeholder={placeHolder}
        on:input={(event) => onChangeSearchHandler(event.currentTarget.value)}
        {disabled}
    />
    <button type="submit" class="h-full m-0 rounded-l-none">
        <img src="/static/images/send.png" alt="Send" width="20" />
    </button>
</form>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;

        input {
            flex: auto;
            background-color: #254560;
            color: white;
            //border-bottom-left-radius: 4px;
            //border-top-left-radius: 4px;
            border-bottom-right-radius: 0;
            border-top-right-radius: 0;
            padding-top: 2px;
            padding-bottom: 2px;
            margin-bottom: 0;
            border: none;
            font-size: 16px;
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
