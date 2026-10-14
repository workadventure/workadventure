// Dumps the zod schema of the space state (libs/shared-utils) as JSON Schema, the input of the Rust generator.
// See tools/gen-space-state.sh.
import { zodToJsonSchema } from "zod-to-json-schema";
import * as s from "../../libs/shared-utils/src/SpaceState/SpaceState";

const schema = zodToJsonSchema(s.spaceStateSchema, {
    name: "SpaceState",
    // Named definitions become named Rust types instead of SpaceStatePollsValueAnswersItem...
    definitions: {
        RaisedHandEntry: s.raisedHandEntrySchema,
        FloorHolderEntry: s.floorHolderEntrySchema,
        RecordingStatus: s.recordingStatusSchema,
        RecordingState: s.recordingStateSchema,
        ProximityPollAnswer: s.proximityPollAnswerSchema,
        ProximityPollVote: s.proximityPollVoteSchema,
        ProximityPoll: s.proximityPollSchema,
        ProximityQuestion: s.proximityQuestionSchema,
    },
});
console.log(JSON.stringify(schema, null, 2));
