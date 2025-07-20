export async function getContacts(): Promise<undefined> {
    const response = await fetch("/contacts", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (response.ok) {
        return await response.json();
    }
    return undefined;
}
