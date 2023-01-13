// This variable is modified before compilation when images are built.
// Its value is computed from a hash of the Proto file and all the files in /JsonMessages
// If the hash is different between the pusher and the front, the front will initiate a reload.
export const apiVersionHash = "dev";
