/** Track editable focus, including inputs removed without a focusout by Chromium. */
export function trackFormFocus(document: Document, setFocused: (focused: boolean) => void): () => void {
    let focused: Element | undefined;
    const editable = (element: Element): boolean =>
        element.matches("input, textarea, select, [role='textbox'], .block-user-action, [contenteditable='true']");
    const onFocusIn = (event: FocusEvent) => {
        // Use the event's document realm: PiP inputs can belong to another window.
        const target = event.target;
        if (isElement(target)) {
            focused = target;
            setFocused(editable(target));
            observer.observe(target.ownerDocument, { childList: true, subtree: true });
        }
    };
    const onFocusOut = () => {
        focused = undefined;
        setFocused(false);
    };
    const observer = new MutationObserver(() => {
        if (focused && !focused.isConnected) onFocusOut();
    });
    const onWindowFocus = () => {
        const element = document.activeElement;
        focused = element ?? undefined;
        setFocused(element !== null && editable(element));
    };
    document.defaultView?.addEventListener("focus", onWindowFocus);
    observer.observe(document, { childList: true, subtree: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
        observer.disconnect();
        document.defaultView?.removeEventListener("focus", onWindowFocus);
        document.removeEventListener("focusin", onFocusIn);
        document.removeEventListener("focusout", onFocusOut);
        onFocusOut();
    };
}

function isElement(target: EventTarget | null): target is Element {
    return target !== null && "nodeType" in target && target.nodeType === 1 && "matches" in target;
}
