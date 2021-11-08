import { CPU_OVERHEAT_THRESHOLD } from "../Enum/EnvironmentVariable";
import log from "./Logger";

function secNSec2ms(secNSec: Array<number> | number) {
    if (Array.isArray(secNSec)) {
        return secNSec[0] * 1000 + secNSec[1] / 1000000;
    }
    return secNSec / 1000;
}

class CpuTracker {
    private cpuPercent: number = 0;
    private overHeating: boolean = false;

    constructor() {
        let time = process.hrtime.bigint();
        let usage = process.cpuUsage();
        setInterval(() => {
            const elapTime = process.hrtime.bigint();
            const elapUsage = process.cpuUsage(usage);
            usage = process.cpuUsage();

            const elapTimeMS = elapTime - time;
            const elapUserMS = secNSec2ms(elapUsage.user);
            const elapSystMS = secNSec2ms(elapUsage.system);
            this.cpuPercent = Math.round(((100 * (elapUserMS + elapSystMS)) / Number(elapTimeMS)) * 1000000);

            time = elapTime;

            if (!this.overHeating && this.cpuPercent > CPU_OVERHEAT_THRESHOLD) {
                this.overHeating = true;
                log.warn('CPU high threshold alert. Going in "overheat" mode');
            } else if (this.overHeating && this.cpuPercent <= CPU_OVERHEAT_THRESHOLD) {
                this.overHeating = false;
                log.info('CPU is back to normal. Canceling "overheat" mode');
            }

            /*log.info('elapsed time ms:  ', elapTimeMS)
            log.info('elapsed user ms:  ', elapUserMS)
            log.info('elapsed system ms:', elapSystMS)
            log.info('cpu percent:      ', this.cpuPercent)*/
        }, 100);
    }

    public getCpuPercent(): number {
        return this.cpuPercent;
    }

    public isOverHeating(): boolean {
        return this.overHeating;
    }
}

const cpuTracker = new CpuTracker();

export { cpuTracker };
