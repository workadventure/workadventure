<script lang="ts">
    import { fly } from "svelte/transition";
    import { SettingsIcon, ArrowLeftIcon, MessageCircleIcon } from "svelte-feather-icons";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import LL from "../i18n/i18n-svelte";
    import {activeThreadStore} from "../Stores/ActiveThreadStore";
    import ChatUser from "./ChatUser.svelte";
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    export let activeThread;
    export let usersListStore;
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

    function lastMessageIsFromSameUser(userID: number, i: number) {
        // since thread displays in reverse
        let nextMsg = threadList[i + 1];
        if (!nextMsg) {
            return false;
        }
        return nextMsg.type !== "event" && nextMsg.user_id === userID;
    }
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
			<b>{activeThread.name}</b>
			<div class="tw-text-xs tw-text-green tw-mt-0">{[...$usersListStore].length} {[...$usersListStore].length > 1 ?$LL.usersOnline() : $LL.userOnline()}</div>
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
				<p class="tw-py-5 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Description</p>
				<p>Test</p>
			</div>
			<div class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid">
				<p class="tw-px-5 tw-py-5 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">{$LL.users()}</p>
				{#each [...$usersListStore] as [, user]}
					<ChatUser {user} on:goTo={(event) => dispatch('goTo', event.detail)}/>
				{/each}
			</div>
		</div>
	{:else}
		<div class="tw-flex tw-flex-col-reverse tw-flex-auto tw-px-5 tw-overflow-auto">
			<!-- if there is a user typing -->

			{#if !!threadListUserTyping}
				<div class="">
					<div class="tw-flex tw-justify-start">
						<img
								class={`tw-mr-2 ${
                                            threadList[0].user_id === threadListUserTyping.user_id
                                                ? "tw-invisible"
                                                : "tw-mt-4"
                                        }`}
								src={`/static/images/${
                                            threadListUserTyping.user_avatar
                                                ? threadListUserTyping.user_avatar
                                                : "yoda-avatar.png"
                                        }`}
								alt="Send"
								width="36"
						/>
						<div class="">
							<div
									style={`border-bottom-color:${threadListUserTyping.user_color}`}
									class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xs tw-pb-1`}
							>
								<!-- if the typer sent the latest message -->
								{#if threadList[0].user_id !== threadListUserTyping.user_id}
									<span class=""> {threadListUserTyping.user_name} </span>
								{/if}
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
			{/if}
			{#each threadList as message, i}
				<div class={`${lastMessageIsFromSameUser(message.user_id, i) ? "" : "tw-mt-4"}`}>
					<!-- if the message is a text/attachment -->

					{#if ["message", "attachment"].includes(message.type)}
						<div class={`tw-flex ${message.me ? "tw-justify-end" : "tw-justify-start"}`}>
							<div
									class={`tw-w-3/4 tw-flex tw-items-start ${
                                                message.me ? "tw-flex-row-reverse" : ""
                                            }`}
							>
								{#if !message.me}
									<!-- make image invisible and omit vertical margin if last message was by same user -->
									<img
											class={`tw-mr-2 ${
                                                        lastMessageIsFromSameUser(message.user_id, i)
                                                            ? "tw-invisible "
                                                            : "tw-mt-4"
                                                    }`}
											src={`/static/images/${
                                                        message.user_avatar ? message.user_avatar : "yoda-avatar.png"
                                                    }`}
											alt="Send"
											width="36"
									/>
								{/if}

								<div class={`tw-flex-auto ${message.me ? "" : ""}`}>
									<!-- message content -->

									{#if message.type === "message"}
										<div
												style={`border-bottom-color:${message.user_color}`}
												class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xs tw-pb-1`}
										>
											<!-- if last message was by this user, ignore this part -->
											{#if !lastMessageIsFromSameUser(message.user_id, i)}
												{#if message.me}
													<span> Me </span>
												{:else}
                                                                <span>
                                                                    {message.user_name}
                                                                </span>
												{/if}
												<span>
                                                                {message.time}
                                                            </span>
											{/if}
										</div>

										<div class={`tw-rounded-lg tw-bg-dark tw-text-xs tw-p-3`}>
											<p class="tw-mb-0">{message.text}</p>
										</div>
									{:else if message.type === "attachment"}
										<!-- attachment content -->

										<div class="tw-flex tw-mt-1">
											<div
													class="tw-rounded tw-border tw-border-solid tw-border-[#979797] tw-p-3"
											>
												<div class="tw-text-xs tw-italic tw-mb-2">
                                                                <span
																		class="tw-font-bold"
																		style={`color:${message.user_color}`}>Grégoire</span
																>
													<span> a envoyer un fichier </span>
												</div>
												<img src="/static/images/attach.svg" alt="attachment" />
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- if the message is an event, like someone joining the conversation -->
					{:else if message.type === "event"}
						<div class="tw-flex tw-justify-center">
							<div
									class="tw-rounded-[13px] tw-justify-center tw-px-2 tw-py-1 tw-text-xs tw-italic tw-border tw-border-solid tw-border-light-purple"
							>
                                            <span class="tw-font-bold" style={`color:${message.user_color}`}>
                                                {message.user_name}
                                            </span>

								{message.info}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="messageForm">
			<ChatMessageForm bind:handleForm={handleFormBlur} />
		</div>
	{/if}
</div>
