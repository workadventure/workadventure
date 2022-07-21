import { CPU_OVERHEAT_THRESHOLD } from "../Enum/EnvironmentVariable";

function secNSec2ms(secNSec: Array<number> | number) {
    if (Array.isArray(secNSec)) {
        return secNSec[0] * 1000 + secNSec[1] / 1000000;
    }
    return secNSec / 1000;
}

class CpuTracker {
    private cpuPercent = 0;
    private overHeating = false;

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
                console.warn('CPU high threshold alert. Going in "overheat" mode');
            } else if (this.overHeating && this.cpuPercent <= CPU_OVERHEAT_THRESHOLD) {
                this.overHeating = false;
                console.log('CPU is back to normal. Canceling "overheat" mode');
            }

            /*console.log('elapsed time ms:  ', elapTimeMS)
            console.log('elapsed user ms:  ', elapUserMS)
            console.log('elapsed system ms:', elapSystMS)
            console.log('cpu percent:      ', this.cpuPercent)*/
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
