# Map Scripts (`src/`)

This directory contains **all map-related scripts** that will be executed in the browser by WorkAdventure.

## 📁 Structure

- **`main.ts`**: Main map script (referenced in `.tmj` files)

## ⚠️ CRITICAL: Scripts MUST be in `src/`

**All map scripts MUST be placed in this `src/` directory** to work correctly. Scripts placed elsewhere will NOT be compiled and will cause errors.

### Why `src/`?

Scripts in this directory are:
- ✅ **Automatically transformed** from TypeScript to JavaScript
- ✅ **Bundled with npm dependencies** (like `@workadventure/scripting-api-extra`)
- ✅ **Served with correct MIME types** (`application/javascript`)
- ✅ **Referenced in `.tmj` files** using paths like `src/main.ts`

### How to Use

1. Create your TypeScript script in `src/` (e.g., `src/my-script.ts`)
2. Reference it in your `.tmj` file's `script` property: `"src/my-script.ts"`
3. The script will be automatically compiled and bundled when accessed

### Example

```typescript
// src/main.ts
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

WA.onInit().then(() => {
    console.info('Map script loaded!');
    // Your map logic here
});
```

Then in your `.tmj` file:
```json
{
  "properties": [
    {
      "name": "script",
      "type": "string",
      "value": "src/main.ts"
    }
  ]
}
```

## 🚫 What NOT to Do

- ❌ **Don't** place map scripts in `app/` (reserved for the server entry point)
- ❌ **Don't** place map scripts in `public/` (static files)
- ❌ **Don't** place map scripts in the root directory
- ❌ **Don't** reference scripts outside `src/` in your `.tmj` files

## 📚 Learn More

See the main [README.md](../README.md) for more information about the project structure.