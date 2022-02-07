<script lang="typescript">
    import { fly } from "svelte/transition";
    import { userIsAdminStore, limitMapStore } from "../../Stores/GameStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import LL from "../../i18n/i18n-svelte";

    const upgradeLink = ADMIN_URL + "/pricing";
    const registerLink = ADMIN_URL + "/second-step-register";
</script>

<main class="warningMain" transition:fly={{ y: -200, duration: 500 }}>
    {#if $userIsAdminStore}
        <h2>{$LL.warning.title()}</h2>
        <p>
            {$LL.warning.content({ upgradeLink })}
        </p>
    {:else if $limitMapStore}
        <p>
            This map is available for 2 days. You can register your domain <a href={registerLink}>here</a>!
        </p>
    {:else}
        <h2>{$LL.warning.title()}</h2>
        <p>{$LL.warning.limit()}</p>
    {/if}
</main>

<style lang="scss">
    main.warningMain {
        pointer-events: auto;
        width: 80%;
        background-color: #f9e81e;
        color: #14304c;
        text-align: center;
        position: absolute;

        top: 4%;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        font-family: Lato;
        min-width: 300px;
        opacity: 0.9;
        z-index: 700;
        h2 {
            padding: 5px;
        }

        a {
            color: #ff475a;
        }
    }
</style>
