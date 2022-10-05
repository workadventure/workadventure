export class MessageUI {
    static warningMessage(text: string) {
        this.removeMessage();
        const body = document.getElementById("body");
        body?.insertAdjacentHTML(
            "afterbegin",
            `
                <div id="message-reconnect" class="message-info warning">
                    ${text}
                </div>
         `
        );
    }

    static removeMessage(id: string | null = null) {
        if (!id) {
            const messages = document.getElementsByClassName("message-info");
            for (let i = 0; i < messages.length; i++) {
                messages.item(i)?.remove();
            }
            return;
        }
        const previousElement = document.getElementById(id);
        if (!previousElement) {
            return;
        }
        previousElement.remove();
    }
}
