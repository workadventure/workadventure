<script lang="typescript">
    import { fly } from "svelte/transition";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";

    function register() {
        window.open(`${ADMIN_URL}/second-step-register`, "_self");
    }
</script>

<div class="limit-map nes-container" transition:fly={{ y: -900, duration: 500 }}>
    <section>
        <h2>Limit of your room</h2>
        <p>Register your account!</p>
        <p>
            This map is limited in the time and to continue to use WorkAdventure, you must register your account in our
            back office.
        </p>
    </section>
    <section>
        <button class="nes-btn is-primary" on:click|preventDefault={register}>Register</button>
    </section>
</div>

<style lang="scss">
    .limit-map {
        pointer-events: auto;
        background: #eceeee;
        margin-left: auto;
        margin-right: auto;
        margin-top: 10vh;
        max-height: 80vh;
        max-width: 80vw;
        overflow: auto;
        text-align: center;
        z-index: 500;

        h2 {
            font-family: "Press Start 2P";
        }

        section {
            p {
                margin: 15px;
                font-family: "Press Start 2P";
            }
        }
    }
</style>
