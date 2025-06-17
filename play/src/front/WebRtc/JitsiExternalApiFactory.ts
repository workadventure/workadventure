class JitsiExternalApiFactory {
    private loadingPromise: Promise<void> | undefined;

    public getJitsiApiUrl(domain: string): string {
        if (!domain.startsWith("https://") && !domain.startsWith("http://")) {
            domain = "https://" + domain;
        }
        return domain + "/external_api.js";
    }

    public loadJitsiScript(domain: string): Promise<void> {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        return (this.loadingPromise = new Promise<void>((resolve, reject) => {
            const jitsiScript = document.createElement("script");
            jitsiScript.src = this.getJitsiApiUrl(domain);
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
