<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import {ChatStates, MessagesStore, MucRoom} from "../Xmpp/MucRoom";
    import LL, {locale} from "../i18n/i18n-svelte";

    export let messagesStore: MessagesStore;
    export let mucRoom: MucRoom;

    let lastDate: Date;

    function needHideHeader(name: string, date: Date, i: number) {
        let previousMsg = $messagesStore[i - 1];
        if (!previousMsg) {
            return false;
        }
        const minutesBetween = (((date.getTime() - previousMsg.time.getTime()) % 86400000) % 3600000) / 60000;
        return previousMsg.name === name && minutesBetween < 2;
    }
    function showDate(date: Date){
        if(!lastDate){
            lastDate = date;
            return true;
        } else {
            return date.toDateString() !== lastDate.toDateString();
        }
    }
    function isMe(name: string){
        return name === mucRoom.getPlayerName();
    }

    $: usersStore = mucRoom.getPresenceStore();
</script>

<div class="tw-flex tw-flex-col tw-flex-auto tw-px-5 tw-overflow-auto">
	{#each $messagesStore as message, i}
		{#if showDate(message.time)}
			<div class="wa-separator">{message.time.toLocaleDateString($locale, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
		{/if}
		<div class={`${needHideHeader(message.name, message.time, i) ? 'tw-mt-1':'tw-mt-2'}`}>
			<div class={`tw-flex ${isMe(message.name) ? "tw-justify-end" : "tw-justify-start"}`}>
				<div class={`${isMe(message.name) || needHideHeader(message.name, message.time, i) ?'tw-opacity-0':'tw-mt-4'} tw-relative wa-avatar-mini tw-mr-2`} transition:fade={{duration: 100}} style={`background-color: ${mucRoom.getUserDataByName(message.name).color}`}>
					<div class="wa-container">
						<img class="tw-w-full" src={mucRoom.getUserDataByName(message.name).woka} alt="Avatar"/>
					</div>
				</div>
				<div class={`tw-w-3/4`} transition:fly={{ x: isMe(message.name)?10:-10, delay: 100, duration: 200 }}>
					<div style={`border-bottom-color:${mucRoom.getUserDataByName(message.name).color}`} class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-1 ${needHideHeader(message.name, message.time, i)?'tw-hidden':''}`}>
						<span class="tw-text-lighter-purple">{#if isMe(message.name)}{$LL.me()}{:else}{message.name}{/if}</span>
						<span>{message.time.toLocaleTimeString($locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
					</div>
					<div class={`tw-rounded-lg tw-bg-dark tw-text-xs tw-px-3 tw-py-2`}>
						<p class="tw-mb-0">{message.body}</p>
					</div>
				</div>
			</div>
		</div>
	{/each}
	{#each [...$usersStore].filter(([,user]) => user.chatState === ChatStates.COMPOSING) as [,user]}
		<div class={`tw-mt-2`} >
			<div class={`tw-flex tw-justify-start`}>
				<div class={`tw-mt-4 tw-relative wa-avatar-mini tw-mr-2 tw-z-10`} style={`background-color: ${mucRoom.getUserDataByName(user.name).color}`} in:fade={{duration: 100}} out:fade={{delay: 200, duration: 100}}>
					<div class="wa-container">
						<img class="tw-w-full" src={mucRoom.getUserDataByName(user.name).woka} alt="Avatar"/>
					</div>
				</div>
				<div class={`tw-w-3/4`} in:fly={{ x: -10, delay: 100, duration: 200 }} out:fly={{ x: -10, duration: 200 }}>
					<div class="tw-w-fit">
						<div style={`border-bottom-color:${mucRoom.getUserDataByName(user.name).color}`} class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-pb-1`}>
							<span class="tw-text-lighter-purple tw-text-xxs">{user.name}</span>
						</div>
						<div class="tw-rounded-lg tw-bg-dark tw-text-xs tw-p-3">
							<!-- loading animation -->
							<div class="loading-group">
								<span class="loading-dot"></span>
								<span class="loading-dot"></span>
								<span class="loading-dot"></span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>
