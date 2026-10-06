// electron-builder afterSign hook.
//
// Without a signing identity (CI test builds, local builds, until the Developer ID certificate is
// configured), electron-builder leaves the app with Electron's own linker signature, which macOS
// treats as unsigned: it cannot remember a camera or microphone decision and asks again on every
// access. Sign it ad hoc instead, so that macOS has a stable identity for this build (a new build
// asks once more). An app that already carries a valid signature (Developer ID) is left untouched.
const { execFileSync } = require("child_process");
const path = require("path");

exports.default = async function adhocSign(context) {
    if (context.electronPlatformName !== "darwin") {
        return;
    }
    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
    try {
        execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], { stdio: "ignore" });
        return;
    } catch {
        // Not validly signed: sign it ad hoc below.
    }
    console.log(`  • signing ad hoc (no signing identity)  app=${appPath}`);
    execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
};
