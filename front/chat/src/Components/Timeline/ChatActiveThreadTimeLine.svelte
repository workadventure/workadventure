<script lang="ts">
    import { fly } from "svelte/transition";
    import { SettingsIcon, ArrowLeftIcon, MessageCircleIcon, RefreshCwIcon } from "svelte-feather-icons";
    import { SendIcon } from "svelte-feather-icons";
    import { chatMessagesStore, chatInputFocusStore, ChatMessageTypes, chatPeerConexionInprogress, writingStatusMessageStore, _newChatMessageWritingStatusSubject } from "../../Stores/ChatStore";
    import {createEventDispatcher} from "svelte";
    import LL, {locale} from "../../i18n/i18n-svelte";
    import { activeThreadStore } from "../../Stores/ActiveThreadStore";

    const dispatch = createEventDispatcher();

    export let settingsView = false;

    let newMessageText = "";

    function reInitialize(){
        console.log('reInitialize');
    }

    function onFocus() {
        chatInputFocusStore.set(true);
    }
    function onBlur() {
        chatInputFocusStore.set(false);
    }
    function saveMessage() {
        if (!newMessageText) return;
        console.log('saveMessage');
        chatMessagesStore.addPersonnalMessage(newMessageText);
        newMessageText = "";
    }

    let lastDate: Date;
    function showDate(date: Date){
        if(!lastDate){
            lastDate = date;
            return true;
		} else {
            return date.toDateString() !== lastDate.toDateString();
		}
	}

    function backToThreadList(){
        activeThreadStore.reset();
        dispatch('unactiveThreadTimeLine');
    }

    function writing(){
        if (newMessageText != undefined && newMessageText !== "") {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userWriting);
        } else {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userStopWriting);
        }
    }
</script>

<!-- thread -->
<div class="tw-flex tw-flex-col tw-h-full tw-min-h-full tw-over tw-fixed tw-w-full" transition:fly={{ x: 500, duration: 400 }}>
	<div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-flex tw-justify-between tw-items-center tw-px-1">
		<div class="tw-border tw-border-transparent tw-border-r-light-purple tw-border-solid tw-py-1 tw-pr-2">
			<button class="tw-text-light-purple tw-m-0" on:click={backToThreadList}>
				<ArrowLeftIcon />
			</button>
		</div>
		<div class="tw-text-center">
			<div class="tw-flex">
				<b>{$LL.timeLine.title()}</b>
				<!-- Have a event when user is in spountanéous discussion -->
                {#if $chatPeerConexionInprogress}
                    <div class="tw-block tw-relative tw-ml-7 tw-mt-1">
                        <span class="tw-w-4 tw-h-4 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-animate-ping"></span>
                        <span class="tw-w-3 tw-h-3 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0.5 tw-top-0.5"></span>
                    </div>
                {/if}
			</div>
            <div class="tw-text-xs tw-text-lighter-purple tw-mt-0">{$LL.timeLine.description()}</div>
		</div>
		<div class="tw-border tw-border-transparent tw-border-l-light-purple tw-border-solid tw-py-1 tw-pl-2" on:click={() => settingsView = !settingsView}>
			<button class="tw-text-light-purple tw-m-0">
				{#if settingsView}
					<MessageCircleIcon />
				{:else}
					<SettingsIcon />
				{/if}
			</button>
		</div>
	</div>

	{#if settingsView}
		<div transition:fly={{ y: -100, duration: 100 }} class="tw-flex tw-flex-col tw-flex-auto tw-overflow-auto tw-w-full">
			<div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5 tw-pb-0.5">
                <button class="wa-action" type="button" on:click|stopPropagation={reInitialize}>
                    <RefreshCwIcon size="13" class="tw-mr-2" /> {$LL.reinit()} 
                </button>
			</div>
			<div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5">
				<p class="tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Description</p>
				<p>{$LL.timeLine.description()}</p>
			</div>
		</div>
	{:else}
	
        <!-- MESSAGE LIST-->
        <div class="tw-flex tw-flex-col tw-flex-auto tw-px-5 tw-overflow-auto">
            {#each $chatMessagesStore as message}
                
                {#if message.type === ChatMessageTypes.text || message.type === ChatMessageTypes.me}
                    {#if showDate(message.date)}
                        <div class="wa-separator">{message.date.toLocaleDateString($locale, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    {/if}
                    <div class="tw-mt-2">
                        <div class={`tw-flex ${message.type === ChatMessageTypes.me ? "tw-justify-end" : "tw-justify-start"}`}>
                            <div class={`${message.author ? 'tw-opacity-0':'tw-mt-4'} tw-relative wa-avatar-mini tw-mr-2`} style={`background-color: ${message.author?.color}`}>
                                <div class="wa-container">
                                    <img class="tw-w-full" src={message.author?.woka ? message.author?.woka : '/static/images/logo-wa-2.png'} alt="Avatar"/>
                                </div>
                            </div>
                            <div class="tw-w-3/4">
                                <div style={`border-bottom-color:${message.author?.color}`} class="tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-1">
                                    <span class="tw-text-lighter-purple">{#if message.type === ChatMessageTypes.me}{$LL.me()}{:else}{message.author?.name}{/if}</span>
                                    <span>{message.date.toLocaleTimeString($locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                </div>
                                <div class={`tw-rounded-lg tw-bg-dark tw-text-xs tw-px-3 tw-py-2`}>
                                    {#if message.text}
                                        {#each message.text as text}
                                            <p class="tw-mb-0">{text}</p>
                                        {/each}
                                    {/if}
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                {#if message.targets && message.targets.length > 0}
                    {#if message.type === ChatMessageTypes.userIncoming}
                        {#each message.targets as target}
                            <span class="tw-text-lighter-purple tw-text-xxs tw-py-1"><span class="tag tw-px-1 tw-py-1 tw-border tw-border-transparent tw-border-light-purple tw-border-solid tw-rounded-lg tw-bg-dark"><b>{target.name}</b></span> try to meet with you. Are your here?</span>
                        {/each}
                    {/if}
                    {#if message.type === ChatMessageTypes.userOutcoming}
                        {#each message.targets as target}
                            <span class="tw-text-lighter-purple tw-text-xxs tw-py-1"><span class="tag tw-px-1 tw-py-1 tw-border tw-border-transparent tw-border-light-purple tw-border-solid tw-rounded-lg tw-bg-dark"><b>{target.name}</b></span> quit the meeting!</span>
                        {/each}
                    {/if}
                {/if}
            {/each}
        </div>

        <!--MESSAGE FORM-->
		<div class="messageForm">

			<form on:submit|preventDefault={saveMessage}>
                <div class="tw-w-full tw-p-2">

                    <div class="typing tw-text-lighter-purple tw-text-xxs">
                        {#each [...$writingStatusMessageStore] as user}
                            <span>@{user.name} is typing...</span>
                        {/each}
                    </div>

                    <div class="tw-flex tw-items-center tw-relative">
                        <textarea
                            type="text"
                            class="tw-flex-1 tw-text-sm tw-ml-2 tw-border tw-border-solid tw-rounded-full tw-bg-transparent tw-outline-0 focus:tw-ring-0 tw-mb-0 tw-min-h-[35px] tw-resize-none placeholder:tw-italic placeholder:tw-text-light-purple"
                            bind:value={newMessageText}
                            placeholder={$LL.form.placeholder()}
                            on:input={writing}
                            on:focus={onFocus}
                            on:blur={onBlur}
                            rows="1"
                        />
                        <button
                            type="submit"
                            class="tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 tw-text-light-blue"
                            on:click|stopPropagation={saveMessage}
                        >
                            <SendIcon size="17" />
                        </button>
                    </div>
                </div>
            </form>
		</div>
	{/if}

</div>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;

        textarea{
            border-color: white;
            border-radius: 9998px;
        }
    }

    span.tag{
        cursor: pointer;
        margin: 0 2px 0 0;
    }
    div.typing span{
        font-style: italic;
        white-space: nowrap;
        margin: 0 2px;
    }
</style>
