import { readFile } from "node:fs/promises";
import { parseOnboardingData } from "@workadventure/messages";
import { ONBOARDING_FILE } from "../enums/EnvironmentVariable";
import { BaseHttpController } from "./BaseHttpController";

/**
 * Serves `ONBOARDING_FILE`, the onboarding of a self-hosted install, at the `onboardingUrl` that LocalAdmin gives to
 * the front. The path comes only from the env variable: the route takes no parameter, so it cannot read other files.
 */
export class OnboardingController extends BaseHttpController {
    routes(): void {
        this.app.get("/onboarding.json", async (req, res) => {
            if (!ONBOARDING_FILE) {
                res.status(404).send("No ONBOARDING_FILE is set.");
                return;
            }
            let json: unknown;
            try {
                // Read on each request, so an edit shows without a restart.
                // ponytail: one small file read per room join; cache by mtime if it ever shows up in a profile.
                json = JSON.parse(await readFile(ONBOARDING_FILE, "utf8"));
            } catch (error) {
                console.error(`ONBOARDING_FILE: ${ONBOARDING_FILE} cannot be read as JSON.`, error);
                res.status(500).send("The onboarding file cannot be read as JSON.");
                return;
            }
            // Served as is: the front leaves out the broken items itself. The logs tell the self-hoster which ones.
            for (const error of parseOnboardingData(json).errors) {
                console.warn(`ONBOARDING_FILE: ${error}`);
            }
            res.json(json);
        });
    }
}
