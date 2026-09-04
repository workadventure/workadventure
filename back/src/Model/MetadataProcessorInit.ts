import {
    FLOOR_HOLDERS_METADATA_KEY,
    PROXIMITY_POLL_DEFINITION_PREFIX,
    PROXIMITY_POLL_DELETE_PREFIX,
    PROXIMITY_POLL_END_PREFIX,
    PROXIMITY_POLL_VOTE_PREFIX,
    PROXIMITY_QA_ANSWER_PREFIX,
    PROXIMITY_QA_DELETE_PREFIX,
    PROXIMITY_QA_QUESTION_PREFIX,
    PROXIMITY_QA_UPVOTE_PREFIX,
    RAISED_HANDS_METADATA_KEY,
} from "@workadventure/shared-utils";
import { MetadataProcessor } from "./MetadataProcessor";
import {
    processProximityPollDefinitionMetadata,
    processProximityPollDeleteMetadata,
    processProximityPollEndMetadata,
    processProximityPollVoteMetadata,
} from "./ProximityPollMetadataProcessor";
import {
    processProximityQAAnswerMetadata,
    processProximityQADeleteMetadata,
    processProximityQAQuestionMetadata,
    processProximityQAUpvoteMetadata,
} from "./ProximityQAMetadataProcessor";
import { processFloorHoldersMetadata, processRaisedHandsMetadata } from "./RaisedHandsMetadataProcessor";

export const metadataProcessor = new MetadataProcessor();

// One processor per key family rather than one per feature: the shared catalogue resolves each family to a
// single payload type, so every processor below receives an already-validated, correctly typed value.
// "recording" needs no entry at all -- the catalogue marks it server-owned, so MetadataProcessor rejects a
// client write before any processor is reached.

metadataProcessor.registerMetadataPrefixProcessor(PROXIMITY_QA_QUESTION_PREFIX, processProximityQAQuestionMetadata);
metadataProcessor.registerMetadataPrefixProcessor(PROXIMITY_QA_UPVOTE_PREFIX, processProximityQAUpvoteMetadata);
metadataProcessor.registerMetadataPrefixProcessor(PROXIMITY_QA_ANSWER_PREFIX, processProximityQAAnswerMetadata);
metadataProcessor.registerMetadataPrefixProcessor(PROXIMITY_QA_DELETE_PREFIX, processProximityQADeleteMetadata);

metadataProcessor.registerMetadataPrefixProcessor(
    PROXIMITY_POLL_DEFINITION_PREFIX,
    processProximityPollDefinitionMetadata,
);
metadataProcessor.registerMetadataPrefixProcessor(PROXIMITY_POLL_VOTE_PREFIX, processProximityPollVoteMetadata);
metadataProcessor.registerMetadataPrefixProcessor(PROXIMITY_POLL_END_PREFIX, processProximityPollEndMetadata);
metadataProcessor.registerMetadataPrefixProcessor(PROXIMITY_POLL_DELETE_PREFIX, processProximityPollDeleteMetadata);

// The client only sends its own intent ({ raised: boolean }); the server computes the authoritative,
// ordered queue (stamping the timestamp and name, using the trusted senderId). See Space.applyRaisedHand.
metadataProcessor.registerMetadataProcessor(RAISED_HANDS_METADATA_KEY, processRaisedHandsMetadata);

// The client only reports whether it currently holds a granted floor ({ holds: boolean }); the server keeps the
// authoritative list of floor holders (only users given the floor, never the hosts). See Space.applyFloorHolder.
metadataProcessor.registerMetadataProcessor(FLOOR_HOLDERS_METADATA_KEY, processFloorHoldersMetadata);
