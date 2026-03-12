import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

type TranslationModule = Record<string, unknown>;

type ModuleInfo = {
    file: string;
    keys: Set<string>;
};

type LocaleSummary = {
    locale: string;
    missingKeys: number;
    missingFiles: number;
};

const args = process.argv.slice(2);
const checkMode = args.includes("--check");
const localeArgs = args.filter((arg) => !arg.startsWith("--"));

const targetLocale = localeArgs[0];
const sourceLocale = localeArgs[1] ?? "en-US";

const currentDir = path.dirname(new URL(import.meta.url).pathname);

function toFsPathFromImportMetaPath(p: string): string {
    if (process.platform === "win32" && p.startsWith("/")) {
        return p.slice(1);
    }
    return p;
}

const normalizedCurrentDir = toFsPathFromImportMetaPath(currentDir);
const normalizedI18nRoot = path.resolve(normalizedCurrentDir, "../src/i18n");
const normalizedSourceDir = path.join(normalizedI18nRoot, sourceLocale);

function isPlainObject(value: unknown): value is TranslationModule {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

async function loadTranslationFile(filePath: string): Promise<TranslationModule> {
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    const value = mod.default ?? mod;

    return isPlainObject(value) ? value : {};
}

function listLocaleDirectories(rootDir: string, exclude?: string): string[] {
    if (!existsSync(rootDir)) {
        return [];
    }

    return readdirSync(rootDir)
        .filter((name) => {
            const fullPath = path.join(rootDir, name);

            try {
                return statSync(fullPath).isDirectory();
            } catch {
                return false;
            }
        })
        .filter((name) => name !== exclude)
        .sort();
}

function listTranslationFiles(localeDir: string): string[] {
    if (!existsSync(localeDir)) {
        return [];
    }

    return readdirSync(localeDir)
        .filter((name) => name.endsWith(".ts") && name !== "index.ts")
        .sort();
}

function collectLeafKeys(value: unknown, prefix = ""): string[] {
    if (!isPlainObject(value)) {
        return [];
    }

    const keys: string[] = [];

    for (const [key, child] of Object.entries(value)) {
        if (typeof child === "function") {
            continue;
        }

        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (isPlainObject(child)) {
            keys.push(...collectLeafKeys(child, fullKey));
            continue;
        }

        keys.push(fullKey);
    }

    return keys;
}

async function readSourceModules(localeDir: string): Promise<ModuleInfo[]> {
    const files = listTranslationFiles(localeDir);

    return Promise.all(
        files.map(async (file) => {
            const filePath = path.join(localeDir, file);
            const content = await loadTranslationFile(filePath);
            const keys = new Set(collectLeafKeys(content));

            return { file, keys };
        })
    );
}

function diffKeys(sourceKeys: Set<string>, targetKeys: Set<string>): string[] {
    const missing: string[] = [];

    for (const key of sourceKeys) {
        if (!targetKeys.has(key)) {
            missing.push(key);
        }
    }

    return missing;
}

async function readTargetKeys(filePath: string): Promise<Set<string>> {
    if (!existsSync(filePath)) {
        return new Set();
    }

    const content = await loadTranslationFile(filePath);
    return new Set(collectLeafKeys(content));
}

async function summarizeLocale(locale: string, sourceModules: ModuleInfo[], rootDir: string): Promise<LocaleSummary> {
    const localeDir = path.join(rootDir, locale);

    const results = await Promise.all(
        sourceModules.map(async (mod) => {
            const targetPath = path.join(localeDir, mod.file);

            if (!existsSync(targetPath)) {
                return {
                    missingKeys: mod.keys.size,
                    missingFiles: 1,
                };
            }

            const targetKeys = await readTargetKeys(targetPath);

            return {
                missingKeys: diffKeys(mod.keys, targetKeys).length,
                missingFiles: 0,
            };
        })
    );

    return {
        locale,
        missingKeys: results.reduce((sum, item) => sum + item.missingKeys, 0),
        missingFiles: results.reduce((sum, item) => sum + item.missingFiles, 0),
    };
}

async function runSummaryMode(): Promise<void> {
    const locales = listLocaleDirectories(normalizedI18nRoot, sourceLocale);

    if (locales.length === 0) {
        console.log(`No locales found to compare against ${sourceLocale}.`);
        return;
    }

    const sourceModules = await readSourceModules(normalizedSourceDir);

    const summaries = await Promise.all(
        locales.map((locale) => summarizeLocale(locale, sourceModules, normalizedI18nRoot))
    );

    summaries.sort((a, b) => {
        if (b.missingKeys !== a.missingKeys) {
            return b.missingKeys - a.missingKeys;
        }
        return a.locale.localeCompare(b.locale);
    });

    console.log(`i18n summary (source: ${sourceLocale})`);

    for (const summary of summaries) {
        const suffix = summary.missingFiles > 0 ? `, ${summary.missingFiles} missing file(s)` : "";
        console.log(`${summary.locale}: ${summary.missingKeys} missing key(s)${suffix}`);
    }

    const totalMissing = summaries.reduce((sum, item) => sum + item.missingKeys, 0);

    if (totalMissing === 0) {
        console.log("All locales are complete.");
    } else {
        console.log("");
        console.log("Usage for a detailed diff:");
        console.log("tsx scripts/diff-i18n.ts <target-locale> [source-locale]");
    }
}

async function runSingleLocaleDiff(target: string): Promise<void> {
    const targetDir = path.join(normalizedI18nRoot, target);

    if (!existsSync(targetDir)) {
        console.error(`Target locale folder not found: ${targetDir}`);
        process.exitCode = 1;
        return;
    }

    const sourceModules = await readSourceModules(normalizedSourceDir);

    const chunks = await Promise.all(
        sourceModules.map(async (mod) => {
            const targetPath = path.join(targetDir, mod.file);

            if (!existsSync(targetPath)) {
                return [`[MISSING FILE] ${mod.file}`];
            }

            const targetKeys = await readTargetKeys(targetPath);
            const missing = diffKeys(mod.keys, targetKeys);

            if (missing.length === 0) {
                return [];
            }

            return [`${mod.file}:`, ...missing.map((key) => `  - ${key}`)];
        })
    );

    const lines = chunks.flat();

    if (lines.length === 0) {
        console.log(`No missing keys between ${sourceLocale} and ${target}.`);
        return;
    }

    console.log(`Diff for ${sourceLocale} -> ${target}`);
    console.log(lines.join("\n"));
    process.exitCode = 2;
}

async function runCheckMode(): Promise<void> {
    const locales = listLocaleDirectories(normalizedI18nRoot, sourceLocale);
    const sourceModules = await readSourceModules(normalizedSourceDir);

    let hasIssues = false;

    console.log("Complete translation check");
    console.log("");
    console.log(`Source locale: ${sourceLocale}`);
    console.log(`Detected locales: ${locales.length}`);
    console.log(locales.join(", "));
    console.log("");

    for (const mod of sourceModules) {
        if (mod.keys.size === 0) {
            continue;
        }

        console.log(`${mod.file} (${mod.keys.size} key(s))`);

        // eslint-disable-next-line no-await-in-loop
        const checks = await Promise.all(
            locales.map(async (locale) => {
                const targetPath = path.join(normalizedI18nRoot, locale, mod.file);

                if (!existsSync(targetPath)) {
                    return {
                        locale,
                        kind: "missing-file" as const,
                    };
                }

                const targetKeys = await readTargetKeys(targetPath);
                const missing = diffKeys(mod.keys, targetKeys);

                return {
                    locale,
                    kind: missing.length === 0 ? ("complete" as const) : ("incomplete" as const),
                    targetCount: targetKeys.size,
                    totalCount: mod.keys.size,
                    missing,
                };
            })
        );

        let fileHasIssues = false;

        for (const check of checks) {
            if (check.kind === "missing-file") {
                console.log(`  ${check.locale}: missing file`);
                hasIssues = true;
                fileHasIssues = true;
                continue;
            }

            if (check.kind === "complete") {
                console.log(`  ${check.locale}: complete`);
                continue;
            }

            const percent = Math.floor((check.targetCount * 100) / check.totalCount);

            console.log(
                `  ${check.locale}: ${check.targetCount}/${check.totalCount} key(s), ${percent}% complete, ${check.missing.length} missing`
            );

            for (const key of check.missing.slice(0, 15)) {
                console.log(`    - ${key}`);
            }

            if (check.missing.length > 15) {
                console.log(`    ... and ${check.missing.length - 15} more`);
            }

            hasIssues = true;
            fileHasIssues = true;
        }

        if (!fileHasIssues) {
            console.log("  all locales complete");
        }

        console.log("");
    }

    console.log("Summary by locale");
    console.log("");

    const localeSummaries = await Promise.all(
        locales.map(async (locale) => {
            const results = await Promise.all(
                sourceModules
                    .filter((mod) => mod.keys.size > 0)
                    .map(async (mod) => {
                        const targetPath = path.join(normalizedI18nRoot, locale, mod.file);

                        if (!existsSync(targetPath)) {
                            return {
                                file: mod.file,
                                status: "missing-file" as const,
                            };
                        }

                        const targetKeys = await readTargetKeys(targetPath);
                        const missing = diffKeys(mod.keys, targetKeys);

                        if (missing.length === 0) {
                            return {
                                file: mod.file,
                                status: "complete" as const,
                            };
                        }

                        return {
                            file: mod.file,
                            status: "incomplete" as const,
                        };
                    })
            );

            const totalFiles = results.length;
            const completeFiles = results.filter((r) => r.status === "complete").length;
            const missingFiles = results.filter((r) => r.status === "missing-file").length;
            const incompleteFiles = results.filter((r) => r.status === "incomplete").length;
            const incompleteNames = results.filter((r) => r.status === "incomplete").map((r) => r.file);

            return {
                locale,
                totalFiles,
                completeFiles,
                missingFiles,
                incompleteFiles,
                incompleteNames,
            };
        })
    );

    for (const summary of localeSummaries) {
        const percent = summary.totalFiles === 0 ? 100 : Math.floor((summary.completeFiles * 100) / summary.totalFiles);

        console.log(`${summary.locale}: ${summary.completeFiles}/${summary.totalFiles} complete file(s), ${percent}%`);

        if (summary.missingFiles > 0) {
            console.log(`  missing file(s): ${summary.missingFiles}`);
        }

        if (summary.incompleteFiles > 0) {
            console.log(`  incomplete file(s): ${summary.incompleteNames.join(", ")}`);
        }
    }

    console.log("");

    if (hasIssues) {
        console.error("Translation check failed.");
        process.exitCode = 2;
        return;
    }

    console.log("All translations are complete.");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function main(): Promise<void> {
    if (!existsSync(normalizedSourceDir)) {
        console.error(`Source locale folder not found: ${normalizedSourceDir}`);
        process.exitCode = 1;
        return;
    }

    if (checkMode) {
        await runCheckMode();
        return;
    }

    if (!targetLocale) {
        await runSummaryMode();
        return;
    }

    await runSingleLocaleDiff(targetLocale);
}
