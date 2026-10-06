<script lang="ts">
    import ToastContainer from "./ToastContainer.svelte";

    export let message: string;
    export let toastUuid = "";
    export let duration = 5000;
    export let theme: "success" | "error" | "secondary" = "error";
</script>

<ToastContainer extraClasses="w-full min-w-72 max-w-sm sm:min-w-80 sm:max-w-md" {toastUuid} {duration} {theme}>
    <span>{message}</span>
</ToastContainer>
