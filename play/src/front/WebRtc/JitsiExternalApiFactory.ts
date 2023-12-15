class JitsiExternalApiFactory {
    private loadingPromise: Promise<void> | undefined;

    public loadJitsiScript(domain: string): Promise<void> {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        return (this.loadingPromise = new Promise<void>((resolve, reject) => {
            // Load Jitsi if the environment variable is set.
            const jitsiScript = document.createElement("script");
            if (!domain.startsWith("https://")) {
                domain = "https://" + domain;
            }
            jitsiScript.src = domain + "/external_api.js";
            jitsiScript.onload = () => {
                resolve();
            };
            jitsiScript.onerror = (event) => {
                reject(new Error("Unable to load Jitsi external_api.js script."));
            };

            document.head.appendChild(jitsiScript);
        }));
    }
}

export const jitsiExternalApiFactory = new JitsiExternalApiFactory();
