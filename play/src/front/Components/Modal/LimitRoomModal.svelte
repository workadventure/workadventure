<script lang="ts">
    import { fly } from "svelte/transition";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";

    function register() {
        window.open(`${ADMIN_URL}/second-step-register`, "_self");
    }
</script>

<div
    class="limit-map absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-contrast/80 backdrop-blur rounded-lg"
    transition:fly={{ y: -900, duration: 500 }}
>
    <section class="p-4">
        <h2>Limit of your room</h2>
        <p>Register your account!</p>
        <p>
            This map is limited in the time and to continue to use WorkAdventure, you must register your account in our
            back office.
        </p>
    </section>

    <section class="justify-center bottom-0 w-full bg-contrast p-4 flex flex-row space-x-4 mt-4 rounded-b-lg">
        <button class="btn btn-secondary grow" on:click|preventDefault={register}>Register</button>
    </section>
</div>

<style lang="scss">
    .limit-map {
        pointer-events: auto;
        max-height: 80vh;
        max-width: 80vw;
        overflow: auto;
        text-align: center;
        z-index: 500;
    }
</style>
