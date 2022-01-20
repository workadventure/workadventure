import { Selector } from 'testcafe';

/**
 * Tries to find a given log message in the logs (for 10 seconds)
 */
export async function assertLogMessage(t: TestController, message: string): Promise<void> {
    let i = 0;
    let logs: string[]|undefined;
    do {
        const messages = await t.getBrowserConsoleMessages();
        logs = messages['log'];
        if (logs.find((str) => str === message)) {
            break;
        }
        await t.wait(1000);
        i++;
    } while (i < 30);

    await t.expect(logs).contains(message);
}
