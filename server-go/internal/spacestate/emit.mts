// Run by go generate (see spacestate.go).
// Walks the zod v3 schemas of SpaceState and prints Go structs plus Validate() methods with zod's semantics
// (string lengths in UTF-16 code units, null rejected for required collections).
import { createRequire } from "module";
import { fileURLToPath } from "url";
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(repo + "package.json");
const S = await import(repo + "libs/shared-utils/src/SpaceState/SpaceState.ts");
const M = await import(require.resolve("@workadventure/messages"));

// Every exported `fooBarSchema` becomes the Go type `FooBar`; inline objects are named after their parent and field.
const named = new Map<unknown, string>(
    Object.entries({ ...S, spaceKindSchema: M.spaceKindSchema })
        .filter(([key]) => key.endsWith("Schema"))
        .map(([key, z]) => [z, key[0].toUpperCase() + key.slice(1, -"Schema".length)]),
);
const out: string[] = [];
const done = new Set<string>();
const pascal = (s: string) => s.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase()).replace(/Id$/, "ID").replace(/Ids$/, "IDs");

// Returns the Go type of `z`, emitting named/inline declarations on the way.
function goType(z: any, hint: string): string {
    const d = z._def;
    switch (d.typeName) {
        case "ZodString": return "string";
        case "ZodBoolean": return "bool";
        case "ZodNumber": return d.checks.some((c: any) => c.kind === "int") ? "int64" : "float64";
        case "ZodNullable": case "ZodOptional": return "*" + goType(d.innerType, hint);
        case "ZodArray": return "[]" + goType(d.type, hint + "Item");
        case "ZodRecord": return "map[string]" + goType(d.valueType, hint + "Value");
        case "ZodEnum": case "ZodObject": {
            const name = named.get(z) ?? hint;
            if (!done.has(name)) { done.add(name); d.typeName === "ZodEnum" ? emitEnum(name, d.values) : emitStruct(name, d.shape()); }
            return name;
        }
    }
    throw new Error(`unsupported zod type ${d.typeName} at ${hint}`);
}

function emitEnum(name: string, values: string[]) {
    out.push(`type ${name} string\n\nconst (\n${values.map((v) => `\t${name}${pascal(v)} ${name} = ${JSON.stringify(v)}`).join("\n")}\n)\n`);
    out.push(`func (v ${name}) Validate() error {\n\tswitch v {\n\tcase ${values.map((v) => JSON.stringify(v)).join(", ")}:\n\t\treturn nil\n\t}\n\treturn fmt.Errorf("invalid ${name} %q", string(v))\n}\n`);
}

function emitStruct(name: string, shape: Record<string, any>) {
    const fields: string[] = [];
    const checks: string[] = [];
    for (const [key, z] of Object.entries(shape)) {
        const f = pascal(key);
        const t = goType(z, name + f);
        const optional = z._def.typeName === "ZodOptional";
        fields.push(`\t${f} ${t} \`json:"${key}${optional ? ",omitempty" : ""}"\``);
        checks.push(...check(z, `v.${f}`, key, false));
    }
    out.push(`type ${name} struct {\n${fields.join("\n")}\n}\n`);
    out.push(`func (v *${name}) Validate() error {\n${checks.join("")}\treturn nil\n}\n`);
}

// Go statements that return an error when `expr` breaks what zod checks on `z`.
function check(z: any, expr: string, path: string, deref: boolean): string[] {
    const d = z._def;
    const fail = (cond: string, msg: string) => `\tif ${cond} {\n\t\treturn fmt.Errorf("${path}: ${msg}")\n\t}\n`;
    switch (d.typeName) {
        case "ZodOptional": case "ZodNullable": {
            const inner = check(d.innerType, `(*${expr})`, path, true);
            return inner.length ? [`\tif ${expr} != nil {\n${inner.map((s) => s.replace(/^/gm, "\t")).join("")}\t}\n`] : [];
        }
        case "ZodString": return d.checks.flatMap((c: any) =>
            c.kind === "min" ? fail(`jsLength(${expr}) < ${c.value}`, `shorter than ${c.value}`) :
            c.kind === "max" ? fail(`jsLength(${expr}) > ${c.value}`, `longer than ${c.value}`) : []);
        case "ZodNumber": return d.checks.flatMap((c: any) =>
            c.kind === "min" ? fail(`${expr} < ${c.value}`, `below ${c.value}`) :
            c.kind === "max" ? fail(`${expr} > ${c.value}`, `above ${c.value}`) : []);
        case "ZodEnum": case "ZodObject": return [`\tif err := ${expr}.Validate(); err != nil {\n\t\treturn fmt.Errorf("${path}: %w", err)\n\t}\n`];
        case "ZodArray": case "ZodRecord": {
            const res = [fail(`${expr} == nil`, "null")];
            if (d.minLength) res.push(fail(`len(${expr}) < ${d.minLength.value}`, `fewer than ${d.minLength.value} items`));
            if (d.maxLength) res.push(fail(`len(${expr}) > ${d.maxLength.value}`, `more than ${d.maxLength.value} items`));
            const inner = check(d.typeName === "ZodArray" ? d.type : d.valueType, "item", path + "[]", false);
            if (inner.length) res.push(`\tfor _, item := range ${expr} {\n${inner.map((s) => s.replace(/^/gm, "\t")).join("")}\t}\n`);
            return res;
        }
        default: return [];
    }
}

goType(S.spaceStateSchema, "SpaceState");
process.stdout.write(`// Code generated by emit.mts from libs/shared-utils/src/SpaceState/SpaceState.ts. DO NOT EDIT.

package spacestate

import (
\t"fmt"
\t"unicode/utf16"
)

// jsLength is String.prototype.length: UTF-16 code units, what zod's min/max count.
func jsLength(s string) int { return len(utf16.Encode([]rune(s))) }

${out.join("\n")}`);
