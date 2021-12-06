<script lang="typescript">
    import { fly } from "svelte/transition";
    import { userIsAdminStore } from "../../Stores/GameStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";

    const upgradeLink = ADMIN_URL + "/pricing";
</script>

<main class="warningMain" transition:fly={{ y: -200, duration: 500 }}>
    <h2>Warning!</h2>
    {#if $userIsAdminStore}
        <p>
            This world is close to its limit!. You can upgrade its capacity <a href={upgradeLink} target="_blank"
                >here</a
            >
        </p>
    {:else}
        <p>This world is close to its limit!</p>
    {/if}
</main>

<style lang="scss">
    main.warningMain {
        pointer-events: auto;
        width: 100vw;
        background-color: red;
        text-align: center;
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
        font-family: Lato;
        min-width: 300px;
        opacity: 0.9;
        z-index: 2;
        h2 {
            padding: 5px;
        }
    }
</style>
