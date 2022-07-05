<script lang="ts">
    import {MessagesStore, MucRoom} from "../Xmpp/MucRoom";
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
</script>

<div class="tw-flex tw-flex-col tw-flex-auto tw-px-5 tw-overflow-auto">
	{#each $messagesStore as message, i}
		{#if showDate(message.time)}
			<div class="wa-separator">{message.time.toLocaleDateString($locale, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
		{/if}
		<div class={`${needHideHeader(message.name, message.time, i) ? 'tw-mt-1':'tw-mt-2'}`}>
			<div class={`tw-flex ${isMe(message.name) ? "tw-justify-end" : "tw-justify-start"}`}>
				<div class={`${isMe(message.name) || needHideHeader(message.name, message.time, i) ?'tw-opacity-0':'tw-mt-4'} tw-relative wa-avatar-mini tw-mr-2`} style={`background-color: ${mucRoom.getUserDataByName(message.name).color}`}>
					<div class="wa-container">
						<img class="tw-w-full" src={mucRoom.getUserDataByName(message.name).woka} alt="Avatar"/>
					</div>
				</div>
				<div class={`tw-w-3/4`}>
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
</div>
