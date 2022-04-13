interface DetectedInfo<
    T extends Device,
    N extends Browser,
    O,
    V = null
    > {
    readonly device: T;
    readonly browser: N;
    readonly version: V;
    readonly os: O;
}

export class DeviceInfo
    implements DetectedInfo<Device, Browser, OperatingSystem, number> {
    constructor(
        public readonly device: Device,
        public readonly browser: Browser,
        public readonly version: number,
        public readonly os: OperatingSystem,
    ) {}
}

export type Device =
    | 'Desktop'
    | 'Mobile'
    | 'Tablet'
    | 'Bot'
    | 'TV'
    | 'Watch';

export type Browser =
    | 'aol'
    | 'edge'
    | 'edge-ios'
    | 'yandexbrowser'
    | 'kakaotalk'
    | 'samsung'
    | 'silk'
    | 'miui'
    | 'beaker'
    | 'edge-chromium'
    | 'chrome'
    | 'chromium-webview'
    | 'phantomjs'
    | 'crios'
    | 'firefox'
    | 'fxios'
    | 'opera-mini'
    | 'opera'
    | 'pie'
    | 'netfront'
    | 'ie'
    | 'bb10'
    | 'android'
    | 'ios'
    | 'safari'
    | 'facebook'
    | 'instagram'
    | 'ios-webview'
    | 'curl'
    | 'searchbot';
export type OperatingSystem =
    | 'iOS'
    | 'Android OS'
    | 'BlackBerry OS'
    | 'Windows Mobile'
    | 'Amazon OS'
    | 'Windows 3.11'
    | 'Windows 95'
    | 'Windows 98'
    | 'Windows 2000'
    | 'Windows XP'
    | 'Windows Server 2003'
    | 'Windows Vista'
    | 'Windows 7'
    | 'Windows 8'
    | 'Windows 8.1'
    | 'Windows 10'
    | 'Windows ME'
    | 'Windows CE'
    | 'Open BSD'
    | 'Sun OS'
    | 'Linux'
    | 'Mac OS'
    | 'QNX'
    | 'BeOS'
    | 'OS/2'
    | 'Chrome OS'
    | 'Unknown';
type DeviceRule = [Device, RegExp];
type UserAgentRule = [Browser, RegExp];
type UserAgentMatch = [Browser, RegExpExecArray] | false;
type OperatingSystemRule = [OperatingSystem, RegExp];

// tslint:disable-next-line:max-line-length
const SEARCHBOX_UA_REGEX = /alexa|bot|crawl(er|ing)|facebookexternalhit|feedburner|google web preview|nagios|postrank|pingdom|slurp|spider|yahoo!|yandex/;
const REQUIRED_VERSION_PARTS = 3;

const deviceRules: DeviceRule[] = [
    ['Mobile', /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i],
    ['Tablet', /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i],
    ['Bot', /bot/],
    ['TV', /tv/],
    ['Watch', /watch/],
];
const userAgentRules: UserAgentRule[] = [
    ['aol', /AOLShield\/([0-9._]+)/],
    ['edge', /Edge\/([0-9._]+)/],
    ['edge-ios', /EdgiOS\/([0-9._]+)/],
    ['yandexbrowser', /YaBrowser\/([0-9._]+)/],
    ['kakaotalk', /KAKAOTALK\s([0-9.]+)/],
    ['samsung', /SamsungBrowser\/([0-9.]+)/],
    ['silk', /\bSilk\/([0-9._-]+)\b/],
    ['miui', /MiuiBrowser\/([0-9.]+)$/],
    ['beaker', /BeakerBrowser\/([0-9.]+)/],
    ['edge-chromium', /EdgA?\/([0-9.]+)/],
    [
        'chromium-webview',
        /(?!Chrom.*OPR)wv\).*Chrom(?:e|ium)\/([0-9.]+)(:?\s|$)/,
    ],
    ['chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9.]+)(:?\s|$)/],
    ['phantomjs', /PhantomJS\/([0-9.]+)(:?\s|$)/],
    ['crios', /CriOS\/([0-9.]+)(:?\s|$)/],
    ['firefox', /Firefox\/([0-9.]+)(?:\s|$)/],
    ['fxios', /FxiOS\/([0-9.]+)/],
    ['opera-mini', /Opera Mini.*Version\/([0-9.]+)/],
    ['opera', /Opera\/([0-9.]+)(?:\s|$)/],
    ['opera', /OPR\/([0-9.]+)(:?\s|$)/],
    ['pie', /^Microsoft Pocket Internet Explorer\/(\d+.\d+)$/],
    ['pie', /^Mozilla\/\d.\d+\s\(compatible;\s(?:MSP?IE|MSInternet Explorer) (\d+.\d+);.*Windows CE.*\)$/],
    ['netfront', /^Mozilla\/\d.\d+.*NetFront\/(\d.\d)/],
    ['ie', /Trident\/7.0.*rv:([0-9.]+).*\).*Gecko$/],
    ['ie', /MSIE\s([0-9.]+);.*Trident\/[4-7].0/],
    ['ie', /MSIE\s(7.0)/],
    ['bb10', /BB10;\sTouch.*Version\/([0-9.]+)/],
    ['android', /Android\s([0-9.]+)/],
    ['ios', /Version\/([0-9._]+).*Mobile.*Safari.*/],
    ['safari', /Version\/([0-9._]+).*Safari/],
    ['facebook', /FB[AS]V\/([0-9.]+)/],
    ['instagram', /Instagram\s([0-9.]+)/],
    ['ios-webview', /AppleWebKit\/([0-9.]+).*Mobile/],
    ['ios-webview', /AppleWebKit\/([0-9.]+).*Gecko\)$/],
    ['curl', /^curl\/([0-9.]+)$/],
    ['searchbot', SEARCHBOX_UA_REGEX],
];
const operatingSystemRules: OperatingSystemRule[] = [
    ['iOS', /iP(hone|od|ad)/],
    ['Android OS', /Android/],
    ['BlackBerry OS', /BlackBerry|BB10/],
    ['Windows Mobile', /IEMobile/],
    ['Amazon OS', /Kindle/],
    ['Windows 3.11', /Win16/],
    ['Windows 95', /(Windows 95)|(Win95)|(Windows_95)/],
    ['Windows 98', /(Windows 98)|(Win98)/],
    ['Windows 2000', /(Windows NT 5.0)|(Windows 2000)/],
    ['Windows XP', /(Windows NT 5.1)|(Windows XP)/],
    ['Windows Server 2003', /(Windows NT 5.2)/],
    ['Windows Vista', /(Windows NT 6.0)/],
    ['Windows 7', /(Windows NT 6.1)/],
    ['Windows 8', /(Windows NT 6.2)/],
    ['Windows 8.1', /(Windows NT 6.3)/],
    ['Windows 10', /(Windows NT 10.0)/],
    ['Windows ME', /Windows ME/],
    ['Windows CE', /Windows CE|WinCE|Microsoft Pocket Internet Explorer/],
    ['Open BSD', /OpenBSD/],
    ['Sun OS', /SunOS/],
    ['Chrome OS', /CrOS/],
    ['Linux', /(Linux)|(X11)/],
    ['Mac OS', /(Mac_PowerPC)|(Macintosh)/],
    ['QNX', /QNX/],
    ['BeOS', /BeOS/],
    ['OS/2', /OS\/2/],
];

export function detect(userAgent?: string): DeviceInfo | null {
    if (userAgent) {
        return parseUserAgent(userAgent);
    }

    if (typeof navigator === 'undefined') return null;

    return parseUserAgent(navigator.userAgent);
}

function matchUserAgent(ua: string): UserAgentMatch {
    // opted for using reduce here rather than Array#first with a regex.test call
    // this is primarily because using reduce we only perform the regex
    // execution once rather than once for the test and for the exec again below
    // probably something that needs to be benchmarked though
    return (
        ua !== '' &&
        userAgentRules.reduce<UserAgentMatch>(
            (matched: UserAgentMatch, [browser, regex]) => {
                if (matched) {
                    return matched;
                }

                const uaMatch = regex.exec(ua);
                return !!uaMatch && [browser, uaMatch];
            },
            false,
        )
    );
}

export function browserName(ua: string): Browser | null {
    const data = matchUserAgent(ua);
    return data ? data[0] : null;
}

export function parseUserAgent(
    ua: string,
): DeviceInfo | null {
    const matchedRule: UserAgentMatch = matchUserAgent(ua);

    if (!matchedRule) {
        return null;
    }

    const [browser, match] = matchedRule;

    // Do not use RegExp for split operation as some browsers don't support it (See: http://blog.stevenlevithan.com/archives/cross-browser-split)
    let versionParts = match[1] && match[1].split('.').join('_').split('_').slice(0, 3);
    if (versionParts) {
        if (versionParts.length < REQUIRED_VERSION_PARTS) {
            versionParts = [
                ...versionParts,
                ...createVersionParts(REQUIRED_VERSION_PARTS - versionParts.length),
            ];
        }
    } else {
        versionParts = [];
    }

    const version = versionParts.join('.');
    const os = detectOS(ua);
    const device = detectDevice(ua);

    return new DeviceInfo(device, browser, parseFloat(version), os);
}

export function detectOS(ua: string): OperatingSystem {
    for (let ii = 0, count = operatingSystemRules.length; ii < count; ii++) {
        const [os, regex] = operatingSystemRules[ii];
        const match = regex.exec(ua);
        if (match) {
            return os;
        }
    }

    return "Unknown";
}

export function detectDevice(ua: string): Device {
    for (let ii = 0, count = deviceRules.length; ii < count; ii++) {
        const [device, regex] = deviceRules[ii];
        const match = regex.exec(ua);
        if (match) {
            return device;
        }
    }

    return 'Desktop';
}

function createVersionParts(count: number): string[] {
    const output = [];
    for (let ii = 0; ii < count; ii++) {
        output.push('0');
    }

    return output;
}
