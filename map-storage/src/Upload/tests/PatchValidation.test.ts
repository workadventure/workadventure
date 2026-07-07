import jsonpatch from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { describe, expect, it } from "vitest";

/**
 * The WAM patch route applies untrusted JSON-Patch documents with
 * `jsonpatch.applyPatch(content, operations, true, false)`. The third argument
 * (`validateOperation`) is load-bearing: with it, fast-json-patch refuses to
 * resolve a JSON Pointer through an inherited (prototype) property, so a patch
 * cannot reach shared, process-wide state instead of the map document. These
 * tests pin that behaviour so the flag cannot be dropped or regressed silently.
 */
describe("fast-json-patch applyPatch with validateOperation=true", () => {
    const applyValidated = (document: unknown, operations: Operation[]) =>
        jsonpatch.applyPatch(document, operations, true, false).newDocument;

    it("applies legitimate operations, including a leaf key that collides with a builtin name", () => {
        const document = { metadata: { name: "Old" }, vendor: {} as Record<string, unknown>, layers: [{ id: 1 }] };

        const replaced = applyValidated(document, [
            { op: "replace", path: "/metadata/name", value: "New" },
        ]) as typeof document;
        expect(replaced.metadata.name).toBe("New");

        const added = applyValidated(document, [{ op: "add", path: "/vendor/foo", value: 1 }]) as typeof document;
        expect(added.vendor.foo).toBe(1);

        // A leaf key named like a builtin is only an own assignment and stays allowed.
        const withBuiltinLeaf = applyValidated(document, [
            { op: "add", path: "/vendor/toString", value: "data" },
        ]) as typeof document;
        // eslint-disable-next-line @typescript-eslint/unbound-method -- reading the own value written by the patch, not invoking a method
        expect(withBuiltinLeaf.vendor.toString).toBe("data");
        expect(Object.hasOwn(withBuiltinLeaf.vendor, "toString")).toBe(true);
    });

    it("rejects operations whose path descends through an inherited property", () => {
        const vectors: Operation[] = [
            { op: "add", path: "/toString/call", value: "x" },
            { op: "add", path: "/hasOwnProperty/x", value: "x" },
            { op: "add", path: "/__proto__/polluted", value: "x" },
            { op: "add", path: "/constructor/prototype/polluted", value: "x" },
        ];

        for (const operation of vectors) {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading the property value, not invoking it
            const originalCall = Object.prototype.toString.call;
            // Rejected either by validateOperation (unresolvable path) or by the default
            // banPrototypeModifications guard, depending on the vector.
            expect(() => applyValidated({ metadata: {} }, [operation])).toThrow();
            // Nothing on the shared prototype was mutated while rejecting the operation.
            // eslint-disable-next-line @typescript-eslint/unbound-method -- reading the property value, not invoking it
            expect(Object.prototype.toString.call).toBe(originalCall);
            expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        }
    });
});
