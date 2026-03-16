import net from "node:net";

export default async function findAvailablePort() {
    return await new Promise<number>((resolve, reject) => {
        const server = net.createServer();

        server.once("error", reject);
        server.listen(0, () => {
            const address = server.address();
            if (address === null || typeof address === "string") {
                server.close(() => reject(new Error("Could not determine an available port.")));
                return;
            }

            const { port } = address;
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(port);
            });
        });
    });
}
