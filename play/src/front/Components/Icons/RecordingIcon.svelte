<script lang="ts">
    export let status: "idle" | "active" = "idle";
    export let width = "28";
    export let height = "28";
    export let classList = "";
    /** Full Tailwind class for hover color (e.g. group-hover/btn-recording:text-red-500). Must be a complete class name so Tailwind includes it. */
    export let hoverClass = "group-hover/btn-recording:text-red-500";

    $: colorClass = status === "active" ? "text-red-500" : "text-white";
</script>

<svg
    {width}
    {height}
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="transition-colors {colorClass} {hoverClass} {classList}"
    aria-hidden="true"
>
    <path
        d="M9.25 5.77246C11.0486 4.73412 13.1381 4.31425 15.1982 4.57617C17.2583 4.83811 19.1758 5.76748 20.6572 7.22266C22.1388 8.67805 23.1028 10.5795 23.4014 12.6348C23.6998 14.6898 23.3166 16.7859 22.3105 18.6025C21.3044 20.4192 19.7305 21.8561 17.8301 22.6934C15.9295 23.5306 13.8068 23.722 11.7871 23.2383C9.76748 22.7545 7.96146 21.623 6.64648 20.0156C5.3315 18.4082 4.57978 16.4134 4.50586 14.3379L4.5 14.0088L4.50586 13.6611C4.56329 12.0522 5.02875 10.4842 5.8584 9.10449C6.68825 7.7246 7.85551 6.57755 9.25 5.77246Z"
        stroke="currentColor"
    />
    <path
        d="M11 8.80382C12.136 8.14801 13.4555 7.88249 14.7567 8.04792C16.0579 8.21335 17.269 8.8006 18.2047 9.7198C19.1404 10.639 19.7491 11.8395 19.9377 13.1375C20.1262 14.4356 19.8842 15.7596 19.2487 16.9071C18.6132 18.0545 17.6192 18.962 16.4188 19.4908C15.2185 20.0196 13.8779 20.1405 12.6023 19.8349C11.3267 19.5294 10.1864 18.8143 9.3559 17.7991C8.52539 16.7838 8.05044 15.5244 8.00375 14.2136L8 13.9998L8.00375 13.7861C8.04001 12.7697 8.33401 11.7793 8.85812 10.9078C9.38224 10.0363 10.1193 9.3123 11 8.80382Z"
        fill="currentColor"
    />
</svg>
