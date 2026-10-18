// Dumps the zod schemas the pusher and the back use to read the admin's answers (dev/contracts/admin-api.md) as
// one JSON Schema, the input of the Rust generator. See tools/gen-admin-types.sh. Run from play/.
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { isMapDetailsData } from "../../libs/messages/src/JsonMessages/MapDetailsData";
import { isRoomRedirect } from "../../libs/messages/src/JsonMessages/RoomRedirect";
import { isErrorApiErrorData } from "../../libs/messages/src/JsonMessages/ErrorApiData";
import { isOauthRefreshToken } from "../../libs/messages/src/JsonMessages/AdminApiData";
import { MemberData } from "../../libs/messages/src/JsonMessages/MemberData";
import { isFetchMemberDataByUuidResponse } from "../../play/src/pusher/services/AdminApi";
import { ShortMapDescriptionList } from "../../play/src/pusher/services/ShortMapDescription";
import { WorldChatMembersData } from "../../play/src/pusher/services/WorldChatMembersData";
import { IceServer } from "../../play/src/pusher/services/IceServer";
import { LivekitCredentialsResponse } from "../../back/src/Services/Repository/LivekitCredentialsResponse";

const answers = z.object({
    mapDetails: isMapDetailsData,
    roomRedirect: isRoomRedirect,
    errorApiData: isErrorApiErrorData,
    roomAccess: isFetchMemberDataByUuidResponse,
    sameWorld: ShortMapDescriptionList,
    chatMembers: WorldChatMembersData,
    members: MemberData.array(),
    member: MemberData,
    oauthRefreshToken: isOauthRefreshToken,
    iceServers: IceServer.array(),
    livekitCredentials: LivekitCredentialsResponse,
});
const schema = zodToJsonSchema(answers, {
    name: "AdminAnswers",
    definitions: {
        MapDetailsData: isMapDetailsData,
        RoomRedirect: isRoomRedirect,
        ErrorApiData: isErrorApiErrorData,
        RoomAccess: isFetchMemberDataByUuidResponse,
        ShortMapDescriptionList,
        WorldChatMembersData,
        MemberData,
        OauthRefreshToken: isOauthRefreshToken,
        IceServer,
        LivekitCredentials: LivekitCredentialsResponse,
    },
});
// Two differences between zod and JSON Schema are undone here.
// `undefined` is no JSON value: zod-to-json-schema writes it as `{"not": {}}` inside an anyOf, which a generator
// turns into an uninhabited type. It goes, and an anyOf of one becomes that one.
function clean(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(clean);
    if (node === null || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = clean(v);
    // A zod object strips the keys it does not know, it does not refuse them: the admin may send more.
    if (out.additionalProperties === false) delete out.additionalProperties;
    if (Array.isArray(out.anyOf)) {
        const kept = (out.anyOf as Record<string, unknown>[]).filter(
            (b) => !(Object.keys(b).length === 1 && "not" in b && Object.keys(b.not as object).length === 0),
        );
        if (kept.length === 1) {
            delete out.anyOf;
            Object.assign(out, kept[0]);
        } else if (kept.some((b) => b.type === "null")) {
            out.anyOf = kept;
        } else {
            // A zod union is one of its branches. Written anyOf, a branch that is a $ref (a named definition) makes
            // the generator give up proving they exclude each other: it yields a struct of optional flattened parts,
            // which accepts anything. oneOf keeps it an enum that refuses what fits no branch.
            delete out.anyOf;
            out.oneOf = kept;
        }
    }
    return out;
}
console.log(JSON.stringify(clean(schema), null, 2));
