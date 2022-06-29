<script>
    import LL from "../i18n/i18n-svelte";
    export let liveRoom;
    export let usersListStore;
    let forumMenuActive = false;
    export let open;
    let openChatForumMenu = () => {
        forumMenuActive = true;
    };
    let closeChatUserMenu = () => {
        forumMenuActive = false;
    };

    import { MoreHorizontalIcon } from "svelte-feather-icons";
</script>

<div class={`wa-chat-item`} on:mouseleave={closeChatUserMenu}>
	<div class="tw-relative" on:click|stopPropagation={() => open(liveRoom)}>
		<img class={``} src="/static/images/logo-wa-2.png" alt="Send" width="42" />
		<div class="tw-block tw-absolute tw-right-0 tw-top-0 tw-transform tw-translate-x-2 -tw-translate-y-1">
			<div class="tw-block tw-relative">
				<span class="tw-w-4 tw-h-4 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0 tw-top-0 tw-animate-ping"></span>
				<span class="tw-w-3 tw-h-3 tw-bg-pop-red tw-block tw-rounded-full tw-absolute tw-right-0.5 tw-top-0.5">
				</span>
			</div>
		</div>
	</div>
	<div class="tw-flex-auto tw-ml-2" on:click|stopPropagation={() => open(liveRoom)}>
		<h1 class="tw-text-sm tw-font-bold tw-mb-0">
			{liveRoom.name}
		</h1>
		<p class="tw-text-xs tw-font-condensed tw-mb-0 tw-text-green">
			<b>
				{[...$usersListStore].length}
			</b>
			<span>{[...$usersListStore].length > 1 ?$LL.usersOnline() : $LL.userOnline()}</span>
		</p>
	</div>

	{#if liveRoom.unreads}
        <span
				class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
		>
            {liveRoom.unreads}
        </span>
	{/if}

	<div class="wa-dropdown">
		<!-- toggle -->
		<button class="tw-text-light-purple tw-m-0" on:click={openChatForumMenu}>
			<MoreHorizontalIcon />
		</button>

		<!-- menu -->
		<div class={`wa-dropdown-menu ${forumMenuActive ? "" : "tw-invisible"}`} on:mouseleave={closeChatUserMenu}>
			<span class="wa-dropdown-item" on:click|stopPropagation={() => open(liveRoom)}> {$LL.open()} </span>
			<!--<div class="wa-dropdown-item">Delete forum</div>-->
		</div>
	</div>
</div>
