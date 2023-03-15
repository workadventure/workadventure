<script lang="ts">

	import TextArea from "../Ui/TextArea.svelte";
	import Button from "../Ui/Button.svelte";
	import {SendIcon} from "svelte-feather-icons";

	export let onSend: (text: string) => void;

	let text: string = "";
</script>
<div class="animation-slide-in-up">
	<TextArea text={text}/>
	<Button icon={SendIcon} onClick={() => onSend(text)}/>
</div>

<style lang="scss">
	div{
		@apply tw-w-full tw-flex tw-justify-evenly tw-items-center;
	}
</style>