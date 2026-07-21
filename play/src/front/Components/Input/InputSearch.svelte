<script lang="ts">
    interface Props {
        id?: string;
        dataTestId?: string;
        // The design system's `.input-search` styling is independent of the input type;
        // callers keep whichever behaviour they had (search adds a clear button, text does not).
        type?: "search" | "text";
        placeholder?: string;
        value?: string;
        size?: "xs" | "sm" | "lg";
        variant?: "light";
        disabled?: boolean;
        // Renders a bare <input> so the caller keeps ownership of the surrounding container
        // and any sibling (e.g. a `peer`-driven icon). Pass positioning/`peer` via class.
        class?: string;
        oninput?: () => void;
        [key: string]: unknown;
    }

    let {
        id = undefined,
        dataTestId = undefined,
        type = "search",
        placeholder = "",
        value = $bindable<string>(),
        size = undefined,
        variant = undefined,
        disabled = false,
        class: className = "",
        oninput = undefined,
        ...rest
    }: Props = $props();

    // Spread rather than an explicit attribute so a caller-supplied data-testid isn't clobbered.
    let testIdAttr = $derived(dataTestId ? { "data-testid": dataTestId } : {});

    // Static design-system classes, so interpolation is safe.
    let classes = $derived(
        ["input-search", size && `input-search-${size}`, variant === "light" && "input-search-light", className]
            .filter(Boolean)
            .join(" "),
    );
</script>

<input {...rest} {...testIdAttr} {id} {type} class={classes} bind:value {placeholder} {disabled} {oninput} />
