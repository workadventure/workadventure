<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import { MucRoom } from "../../Xmpp/MucRoom";
    import { defaultColor, defaultWoka } from "../../Xmpp/AbstractRoom";

    export let userJid: string | undefined;
    export let userName: string | undefined;
    export let defaultMucRoom: MucRoom;

    let userData:
        | {
              name: string;
              color?: string;
              woka?: string;
          }
        | undefined = undefined;
    try {
        if (userJid === undefined) {
            userData = {
                name: userName ?? "System",
                color: defaultColor,
                woka: defaultWoka,
            };
        } else {
            userData = defaultMucRoom.getUserByJid(userJid);
        }
    } catch (e) {
        console.warn("Can't fetch user data from Ejabberd", e);
    }
</script>

{#if userData}
    <div class={`mt-2`}>
        <div class={`flex justify-start`}>
            <div
                class={`mt-6 relative wa-avatar aspect-ratio h-10 w-10 rounded overflow-hidden false cursor-default mr-2`}
                style={`background-color: ${userData.color}`}
                in:fade={{ duration: 100 }}
                out:fade={{ delay: 200, duration: 100 }}
            >
                <div class="wa-container cursor-default">
                    <img class="cursor-default w-full mt-2" src={userData.woka} alt="Avatar" />
                </div>
            </div>
            <div class={`w-3/4`} in:fly={{ x: -10, delay: 100, duration: 200 }} out:fly={{ x: -10, duration: 200 }}>
                <div class="w-fit">
                    <div
                        style={`border-bottom-color:${userData.color}`}
                        class={`flex justify-between mx-2 border-0 border-b border-solid text-light-purple-alt pb-1`}
                    >
                        <span class="text-lighter-purple text-xxs">
                            {userData.name.match(/\[\d*]/)
                                ? userData.name.substring(0, userData.name.search(/\[\d*]/))
                                : userData.name}
                            {#if userData.name.match(/\[\d*]/)}
                                <span class="font-light text-xs text-gray">
                                    #{userData.name
                                        .match(/\[\d*]/)
                                        ?.join()
                                        ?.replace("[", "")
                                        ?.replace("]", "")}
                                </span>
                            {/if}</span
                        >
                    </div>
                    <div class="rounded-lg bg-dark text-xs p-3">
                        <!-- loading animation -->
                        <div class="loading-group">
                            <span class="loading-dot" />
                            <span class="loading-dot" />
                            <span class="loading-dot" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    $dot-width: 10px;
    $dot-color: #ffffff;
    $speed: 1.5s;

    .loading-group {
        position: relative;
        display: flex;
        .loading-dot {
            animation: blink $speed infinite;
            animation-fill-mode: both;
            @apply w-2 h-2 aspect-square bg-white block rounded-full;
            &:nth-child(2) {
                animation-delay: 0.2s;
                @apply ml-1;
            }

            &:nth-child(3) {
                animation-delay: 0.4s;
                @apply ml-1;
            }
        }
    }

    @keyframes blink {
        0% {
            opacity: 0.1;
        }
        20% {
            opacity: 1;
        }
        100% {
            opacity: 0.1;
        }
    }
</style>
