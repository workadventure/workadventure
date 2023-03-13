<script lang="ts">
    import { ADMIN_API_URL } from "../../Enum/EnvironmentVariable";
    import { userStore } from "../../Stores/LocalUserStore";
    import { iframeListener } from "../../IframeListener";
    import { writable } from "svelte/store";
    import lock from "../../../public/static/images/lock.png";
    import Header from "./Header.svelte";

    const step = writable(1);

    let password: string = "";
    let passwordConf: string = "";
    let overrideMemberPassword: boolean = false;
    let resultDiv: HTMLDivElement;

    const loading = writable(false);
    const finished = writable(false);

    let passwordChecked: boolean = false;
    $: passwordChecked = !!password.match(/(?=.*[A-Z])(?=.*[a-z])(?=.*\W)(?=.*[0-9]).{8,}/);

    function submit() {
        if (password !== passwordConf) {
            return;
        }
        resultDiv.innerText = "";
        resultDiv.classList.remove("tw-text-pop-red");
        loading.set(true);
        iframeListener.sendFirstMatrixPassword(password, overrideMemberPassword);
        iframeListener.firstMatrixPasswordResultStream.subscribe((result) => {
            loading.set(false);
            if (result) {
                finished.set(true);
                resultDiv.innerText = "Your password has been successfully set.";
                resultDiv.classList.add("tw-text-pop-green");
            } else {
                resultDiv.innerText = "There was an error while setting your password, try again later.";
                resultDiv.classList.add("tw-text-pop-red");
            }
        });
    }
</script>

<Header title="First connection" />
<div class="first-connection">
    {#if $step === 1}
        <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-center">
            <img src={lock} alt="Lock" height="100" width="100" />
        </div>
        <p class="tw-text-justify">We use Matrix as the protocol for our chat.</p>
        <p class="tw-text-justify">
            Your account on Matrix was created ({$userStore.matrixUserId}), but no password was provided.
        </p>
        <p class="tw-text-justify">
            Matrix allows you to use encrypted end-to-end messages, you need a password to use it.
        </p>
        <button class="btn light tw-font-bold tw-mx-auto tw-cursor-pointer" on:click={() => step.set(2)}
            >Next step</button
        >
    {:else}
        {#if !$finished}
            <div class="tw-flex tw-flex-wrap tw-text-sm tw-items-center tw-justify-between tw-my-2">
                <div>
                    <p>Your password must :</p>
                    <ul>
                        <li class={`${password.match(/(?=.*[A-Z])/) ? "success" : "error"}`}>
                            contain one capital letter
                        </li>
                        <li class={`${password.match(/(?=.*[a-z])/) ? "success" : "error"}`}>
                            contain one lower case letter
                        </li>
                        <li class={`${password.match(/(?=.*\W)/) ? "success" : "error"}`}>
                            contain one special character
                        </li>
                        <li class={`${password.match(/(?=.*[0-9])/) ? "success" : "error"}`}>contain on number</li>
                        <li class={`${password.length >= 8 ? "success" : "error"}`}>be longer than 8 characters</li>
                    </ul>
                </div>
                <img src={lock} alt="Lock" height="80" width="80" />
            </div>
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
                        <input type="checkbox" id="useSameForWA" bind:value={overrideMemberPassword} />
                        Override your WorkAdventure account password
                    </label>
                </div>
            {/if}
            {#if $loading}
                Loading
            {:else}
                <button
                    class="btn light tw-font-bold tw-mx-auto tw-cursor-pointer"
                    disabled={!passwordChecked}
                    on:click={submit}>Submit</button
                >
            {/if}
        {/if}
        <div bind:this={resultDiv} />
    {/if}
</div>

<style lang="scss">
    .first-connection {
        @apply tw-text-white tw-px-4 tw-max-w-full tw-break-words;
        p {
            @apply tw-m-0;
        }

        ul {
            @apply tw-list-none tw-m-0 tw-p-0;
            li {
                @apply tw-m-0 tw-p-0 tw-pl-4;
                &.success {
                    @apply tw-text-pop-green;
                    &::before {
                        @apply tw-bg-pop-green;
                    }
                }

                &.error {
                    @apply tw-text-pop-red;
                    &::before {
                        @apply tw-bg-pop-red;
                    }
                }
                &::before {
                    @apply tw-bg-pop-green tw-rounded-full tw-h-1.5 tw-w-1.5 tw-absolute tw-ml-[-12px] tw-mt-2;
                    content: "";
                }
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
    }
</style>
