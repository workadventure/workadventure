// Run by go generate (gen.sh): writes the JSON Schema of each zod schema the Go server shares with the front and the
// admin, one file per Go package, with a named definition per Go type. go-jsonschema makes the Go types of them;
// santhosh-tekuri/jsonschema validates against them. What zod checks that JSON Schema cannot say (refine,
// transform, preprocess) is listed on stderr and checked by hand in Go (see README.md).
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
const repo = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(repo + "package.json");
const { zodToJsonSchema } = await import(require.resolve("zod-to-json-schema"));
const S = await import(repo + "libs/shared-utils/src/SpaceState/SpaceState.ts");
const M = await import(require.resolve("@workadventure/messages"));
// The pusher's own schemas of the admin's answers; its module checks its environment on import: placeholders.
for (const [k, v] of Object.entries({ API_URL: "http://x", ICON_URL: "http://x", MAP_STORAGE_API_TOKEN: "x", SECRET_KEY: "x", UPLOADER_URL: "http://x" })) {
    process.env[k] ??= v;
}
const P = {
    ...(await import(repo + "play/src/pusher/services/AdminApi.ts")),
    ...(await import(repo + "play/src/pusher/services/ShortMapDescription.ts")),
    ...(await import(repo + "play/src/pusher/services/WorldChatMembersData.ts")),
};

// Go type name → zod schema, per package.
const targets: Record<string, { root: string; defs: Record<string, any> }> = {
    "internal/spacestate/spacestate.schema.json": {
        root: "SpaceState",
        defs: {
            SpaceState: S.spaceStateSchema, SpaceKind: M.spaceKindSchema,
            RaisedHandEntry: S.raisedHandEntrySchema, FloorHolderEntry: S.floorHolderEntrySchema,
            RecordingStatus: S.recordingStatusSchema, RecordingState: S.recordingStateSchema,
            ProximityPollAnswer: S.proximityPollAnswerSchema, ProximityPollVote: S.proximityPollVoteSchema,
            ProximityPoll: S.proximityPollSchema, ProximityQuestion: S.proximityQuestionSchema,
        },
    },
    // The admin's answers, as the pusher checks them (play/src/pusher/services/AdminApi.ts).
    "internal/admin/admin.schema.json": {
        root: "MapDetailsData",
        defs: {
            MapDetailsData: M.isMapDetailsData, RoomRedirect: M.isRoomRedirect, ErrorApiData: M.ErrorApiData,
            ErrorApiErrorData: M.isErrorApiErrorData, Capabilities: M.isCapabilities,
            MemberAccess: P.isFetchMemberDataByUuidResponse, MemberAccessGranted: P.isFetchMemberDataByUuidSuccessResponse,
            WokaDetail: M.WokaDetail, CompanionDetail: M.CompanionDetail, Application: M.isApplicationDefinitionInterface,
            ShortMapDescriptionList: P.ShortMapDescriptionList, WorldChatMembers: P.WorldChatMembersData,
            ChatMember: M.MemberData, WokaList: M.wokaList, CompanionTextureCollection: M.CompanionTextureCollection,
        },
    },
};

// The zod nodes JSON Schema cannot express: their checks are Go's to write.
function effects(z: any, path: string, out: string[]) {
    const d = z?._def;
    if (!d) return;
    if (d.typeName === "ZodEffects") out.push(`${path}: ${d.effect?.type}`);
    for (const [k, v] of Object.entries(d)) {
        if (k === "shape" && typeof v === "function") {
            for (const [f, s] of Object.entries((v as () => object)())) effects(s, `${path}.${f}`, out);
        } else if (v && typeof v === "object" && (v as any)._def) effects(v, path, out);
        else if (Array.isArray(v)) v.forEach((s) => effects(s, path, out));
    }
}

// What the Go side reads differently from the plain export:
// - additionalProperties: true is JSON Schema's default (zod drops extra keys, it does not refuse them); said
//   explicitly, go-jsonschema gives every struct a field for them;
// - a string's minLength/maxLength count UTF-16 code units in zod: they become minLengthUTF16/maxLengthUTF16, which
//   internal/zodschema checks (JSON Schema's would count code points);
// - no $schema: draft 2020-12, the one the custom vocabulary applies to.
function goFriendly(node: any): any {
    if (Array.isArray(node)) return node.map(goFriendly);
    if (!node || typeof node !== "object") return node;
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
        if ((k === "additionalProperties" && v === true) || k === "$schema") continue;
        const utf16 = node.type === "string" && (k === "minLength" || k === "maxLength");
        out[utf16 ? k + "UTF16" : k] = goFriendly(v);
    }
    return out;
}

for (const [file, { root, defs }] of Object.entries(targets)) {
    const list: string[] = [];
    for (const [name, z] of Object.entries(defs)) effects(z, name, list);
    const schema = zodToJsonSchema(defs[root], {
        definitions: defs, $refStrategy: "root", definitionPath: "definitions", removeAdditionalStrategy: "strict",
    });
    const json = JSON.stringify(goFriendly(schema), null, 2);
    writeFileSync(repo + "server-go/" + file, json + "\n");
    for (const e of list) process.stderr.write(`${file}: ${e} (by hand in Go)\n`);
}
