<script lang="ts">
    import { ADMIN_API_URL } from "../../Enum/EnvironmentVariable";
    import { userStore } from "../../Stores/LocalUserStore";

    let password: string = "";
    let passwordConf: string = "";

    let passwordChecked: boolean = false;
    $: passwordChecked = !!password.match(/(?=.*[A-Z])(?=.*[a-z])(?=.*\W)(?=.*[0-9]).{8,}/);
</script>

<div class="first-connection">
    <h2>First connection</h2>
    <p>
        Your account on Matrix was created ({$userStore.matrixUserId}), but no password was provided, you must set one.
    </p>
    <p>
        Also Matrix allows you to use encrypted end-to-end messages, to use it you need a password to decrypt all your
        conversations keys.
    </p>
    <p>Your password must :</p>
    <ul>
        <li class={`${password.match(/(?=.*[A-Z])/) ? "success" : "error"}`}>contain one capital letter</li>
        <li class={`${password.match(/(?=.*[a-z])/) ? "success" : "error"}`}>contain one lower case letter</li>
        <li class={`${password.match(/(?=.*\W)/) ? "success" : "error"}`}>contain one special character</li>
        <li class={`${password.match(/(?=.*[0-9])/) ? "success" : "error"}`}>contain on number</li>
        <li class={`${password.length >= 8 ? "success" : "error"}`}>be longer than 8 characters</li>
    </ul>
    <input
        type="password"
        placeholder="Password"
        class={`tw-w-full ${passwordChecked || password === "" ? "" : "error"}`}
        bind:value={password}
    />
    <input
        type="password"
        placeholder="Confirm password"
        class={`tw-w-full ${password === passwordConf || passwordConf === "" ? "" : "error"}`}
        disabled={!passwordChecked}
        bind:value={passwordConf}
    />
    {#if password !== passwordConf && passwordConf !== ""}
        <span class="tw-text-pop-red tw-text-xs">Passwords are not matching</span>
    {/if}
    {#if ADMIN_API_URL}
        <div class="tw-mt-1">
            <label for="useSameForWA" class="tw-text-sm">
                <input type="checkbox" id="useSameForWA" />
                Use the same password for your WorkAdventure account</label
            >
        </div>
    {/if}
    <button class="btn light tw-font-bold tw-mx-auto tw-cursor-pointer" disabled={!passwordChecked}>Submit</button>
</div>

<style lang="scss">
    .first-connection {
        @apply tw-text-white tw-px-4 tw-max-w-full tw-break-words;
        p {
            @apply tw-m-0;
        }
        li.success {
            @apply tw-text-pop-green;
        }
        li.error {
            @apply tw-text-pop-red;
        }
        input.success {
            @apply tw-border-pop-green;
        }
        input.error {
            @apply tw-border-pop-red;
        }
        input:last-of-type {
            margin-bottom: 0;
        }
        ul {
            li {
                @apply tw-p-0;
            }
        }
    }
</style>
