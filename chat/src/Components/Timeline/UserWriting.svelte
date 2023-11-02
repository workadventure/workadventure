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
    <div class={`tw-mt-2`}>
        <div class={`tw-flex tw-justify-start`}>
            <div
                class={`tw-mt-4 tw-relative wa-avatar-mini tw-mr-2 tw-z-10`}
                style={`background-color: ${userData.color}`}
                in:fade={{ duration: 100 }}
                out:fade={{ delay: 200, duration: 100 }}
            >
                <div class="wa-container">
                    <img class="tw-w-full" src={userData.woka} alt="Avatar" />
                </div>
            </div>
            <div class={`tw-w-3/4`} in:fly={{ x: -10, delay: 100, duration: 200 }} out:fly={{ x: -10, duration: 200 }}>
                <div class="tw-w-fit">
                    <div
                        style={`border-bottom-color:${userData.color}`}
                        class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-pb-1`}
                    >
                        <span class="tw-text-lighter-purple tw-text-xxs">
                            {userData.name.match(/\[\d*]/)
                                ? userData.name.substring(0, userData.name.search(/\[\d*]/))
                                : userData.name}
                            {#if userData.name.match(/\[\d*]/)}
                                <span class="tw-font-light tw-text-xs tw-text-gray">
                                    #{userData.name
                                        .match(/\[\d*]/)
                                        ?.join()
                                        ?.replace("[", "")
                                        ?.replace("]", "")}
                                </span>
                            {/if}</span
                        >
                    </div>
                    <div class="tw-rounded-lg tw-bg-dark tw-text-xs tw-p-3">
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
