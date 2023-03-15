<script lang="ts">
	import {Writable} from "svelte/store";
	import {MatrixEvent} from "matrix-js-sdk";
	import Event from "../Ui/Event.svelte";
	import Message from "./Message.svelte";
	import {chatConnectionManager} from "../../../Connection/ChatConnectionManager";

	export let messages: Writable<MatrixEvent[]>;
</script>
<div id="messages">
	<div class="tw-flex tw-flex-wrap tw-col tw-w-full tw-max-h-full">
		{#each $messages as message}
			{console.log(message.event.type, message.event)}
			{#if message.event.type !== "m.room.message" && message.event.type !== "m.room.encrypted"}
				<Event event={message} />
			{:else}
				<Message
						type={message.event.sender === chatConnectionManager.connectionOrFail.userId ? "sent" : "received"}
						text={message.event.content.body}
						author={message.event.sender}
						date={new Date(message.event.origin_server_ts)}
						showAvatar={true}
				/>
			{/if}
		{/each}
		<!--
		<Message
				type="sent"
				text="Trééééééééééés long message pour savoir si ça passe à la ligne quand il faut."
				author="Gaëlle"
				date={new Date()}
				showAvatar={false}
		/>
		<Message
				type="sent"
				text="Petit message. 👍🏻"
				author="Gaëlle"
				date={new Date()}
				showAuthor={false}
				showAvatar={false}
		/>
		<Message
				type="sent"
				text="Et un autre gros message sur deux lignes idéalement."
				author="Gaëlle"
				date={new Date()}
				showAuthor={false}
		/>
		<Message
				type="received"
				text="Trééééééééééés long message pour savoir si ça passe à la ligne quand il faut."
				author="Gaëlle"
				date={new Date()}
				showAvatar={false}
		/>
		<Message
				type="received"
				text="Petit message. 👍🏻"
				author="Gaëlle"
				date={new Date()}
				showAuthor={false}
				showAvatar={false}
		/>
		<Message
				type="received"
				text="Et un autre gros message sur deux lignes idéalement."
				author="Gaëlle"
				date={new Date()}
				showAuthor={false}
		/>
		-->
	</div>
</div>