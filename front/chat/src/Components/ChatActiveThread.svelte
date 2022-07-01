<script lang="ts">
    import { fly } from "svelte/transition";
    import { SettingsIcon, ArrowLeftIcon, MessageCircleIcon } from "svelte-feather-icons";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import LL from "../i18n/i18n-svelte";
    import {activeThreadStore} from "../Stores/ActiveThreadStore";
    import ChatUser from "./ChatUser.svelte";
    import {createEventDispatcher} from "svelte";
    import ChatMessagesList from "./ChatMessagesList.svelte";
    import OnlineUsers from "./OnlineUsers.svelte";

    const dispatch = createEventDispatcher();

    export let activeThread;
    export let usersListStore;
    export let messagesStore;
    export let settingsView = false;

    let handleFormBlur: { blur(): void };

    let threadList = [
        // newest first
        {
            type: "message",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            user_avatar: "yoda2-avatar.png",
            time: "2 min ago",
            text: "Check that",
        },
        {
            type: "attachment",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            user_avatar: "yoda2-avatar.png",
            info: "a rejoint conversation",
        },

        {
            type: "message",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            user_avatar: "yoda2-avatar.png",
            time: "2 min ago",
            text: "Etiam rutrum, velit et auctor iaculis, massa leo luctus tellus, sit amet bibendum arcu augue in odio. ",
        },
        {
            type: "event",
            user_id: 3,
            user_color: "#04F17A",
            user_name: "Grégoire",
            info: "a rejoint conversation",
        },
        {
            type: "message",
            user_name: "Me",
            user_id: 1,
            user_color: "#FF475a",
            time: "2 min ago",
            me: true,
            text: "My last message",
        },
        {
            type: "message",
            user_name: "Me",
            user_id: 1,
            user_color: "#FF475a",
            time: "2 min ago",
            me: true,
            text: "Donec varius lacus sit amet finibus pharetra.",
        },
        {
            type: "message",
            user_id: 2,
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            time: "2 min ago",
            text: "Another message",
        },
        {
            type: "message",
            user_id: 2,
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            time: "2 min ago",
            text: "Aliquam sollicitudin massa non massa gravida, id bibendum nulla feugiat. Etiam rutrum, velit et auctor iaculis, massa leo luctus tellus, sit amet bibendum arcu",
        },
        {
            type: "message",
            user_id: 2,
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            time: "2 min ago",
            text: "Nam tempus turpis et nulla luctus posuere. Nam lobortis, libero sed varius pellentesque, tellus mauris mollis eros, eget pretium quam nulla sit amet quam",
        },
        {
            type: "message",
            user_name: "Me",
            user_id: 1,
            user_color: "#FF475a",
            time: "4 min ago",
            me: true,
            text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam convallis, dolor vitae tempor porta, dui nisl volutpat ligula",
        },
        {
            type: "message",
            user_id: 2,
            user_color: "#365DFF",
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            time: "9 min ago",
            text: "Nam lacinia, leo eleifend aliquet varius, lorem massa gravida nunc, vel tempus dui diam eu nisl.  ",
        },
        {
            type: "message",
            user_name: "Bernadette",
            user_avatar: "yoda-avatar.png",
            user_color: "#365DFF",
            user_id: 2,
            time: "10 min ago",
            text: "Nunc eget congue arcu. ",
        },
    ];

    let threadListUserTyping: {
        user_id: number;
        user_name: string;
        user_avatar: string;
        user_color: string;
    } = {
        user_id: 3,
        user_name: "Grégoire",
        user_avatar: "yoda2-avatar.png",
        user_color: "#04F17A",
    };
</script>

<!-- thread -->
<div class="tw-flex tw-flex-col tw-h-full tw-min-h-full tw-over tw-fixed tw-w-full" transition:fly={{ x: 500, duration: 400 }}>
	<div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-flex tw-justify-between tw-items-center tw-px-1">
		<div class="tw-border tw-border-transparent tw-border-r-light-purple tw-border-solid tw-py-1 tw-pr-2">
			<button class="tw-text-light-purple tw-m-0" on:click={() => {activeThreadStore.reset()}}>
				<ArrowLeftIcon />
			</button>
		</div>
		<div class="tw-text-center">
			<div class="tw-flex">
				<b>{activeThread.name}</b>
				{#if activeThread.type === 'live'}
					<div class="tw-block tw-relative tw-ml-7 tw-mt-1">
						<span class="tw-w-4 tw-h-4 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-animate-ping"></span>
						<span class="tw-w-3 tw-h-3 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0.5 tw-top-0.5">
					</span>
					</div>
				{/if}
			</div>
			<OnlineUsers {usersListStore} />
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
			<div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5">
				<p class="tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Description</p>
				<p>Test</p>
			</div>
			<div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
				<p class="tw-px-5 tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">{$LL.users()}</p>
				{#each [...$usersListStore] as [jid, user]}
					<ChatUser
							{user}
							{jid}
							on:goTo={(event) => dispatch('goTo', event.detail)}
							meStore={activeThread.getMeStore()}
							on:rankUp={(event) => dispatch('rankUp', event.detail)}
							on:rankDown={(event) => dispatch('rankDown', event.detail)}
							on:ban={(event) => dispatch('ban', event.detail)}
					/>
				{/each}
			</div>
		</div>
	{:else}
		<ChatMessagesList {messagesStore} mucRoom={activeThread}/>

		<div class="messageForm">
			<ChatMessageForm bind:handleForm={handleFormBlur} mucRoom={activeThread}/>
		</div>
	{/if}
</div>
