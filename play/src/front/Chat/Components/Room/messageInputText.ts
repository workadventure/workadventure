/**
 * The text to send from the message input's HTML, or undefined when there is nothing to send.
 * The input is contenteditable: it keeps a `<br>` or a non-breaking space once its text is erased,
 * which must not go out as an empty message next to the attached files.
 */
export function messageInputText(html: string): string | undefined {
    // The only tags the input keeps are the line breaks: turn them back into new lines.
    const text = html.replace(/<br\s*\/?>/gi, "\n");
    return text.replace(/&nbsp;|\u00a0/g, " ").trim().length === 0 ? undefined : text;
}
