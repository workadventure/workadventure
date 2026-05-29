const jiti = require("jiti")(__filename);

exports.tailwindConfig = jiti("../tailwind.config.ts").default;
