<script lang="ts">
	import LL from "../../../i18n/i18n-svelte";

	let textarea: HTMLDivElement;
	let htmlMessageText = "";

	export let text: string;

	export let onInput: (event: Event) => void;
	export let onKeyDown: (event: KeyboardEvent) => void;
	export let onKeyPress: (event: KeyboardEvent) => void;

</script>
<div
		contenteditable="true"
		bind:this={textarea}
		bind:textContent={text}
		bind:innerHTML={htmlMessageText}
		data-placeholder={$LL.enterText()}
		on:input={onInput}
		on:keydown={onKeyDown}
		on:keypress={onKeyPress}
>
</div>

<style lang="scss">
	div{
		@apply tw-text-sm tw-outline-none tw-mb-0 tw-resize-none tw-rounded-xl tw-bg-dark-purple/70 tw-px-2 tw-py-2 tw-flex-1 tw-border-solid;
		max-height: 50vh;
		overflow-y: auto;
		line-break: normal;
		word-break: normal;
		overflow-wrap: break-word;
		overflow-x: hidden;
		&:empty::before {
			content: attr(data-placeholder);
			color: #555;
		}

		&:empty:focus::before {
			content: "";
		}
		&:focus{
			@apply tw-bg-dark-purple;
		}
	}
</style>