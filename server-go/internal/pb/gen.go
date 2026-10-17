// Package pb holds the Go types generated from messages/protos, the frozen contract with the front.
// Regenerate with `go generate ./internal/pb` (needs protoc, protoc-gen-go and protoc-gen-go-grpc on the PATH).
package pb

//go:generate protoc -I ../../../messages/protos --go_out=../.. --go_opt=module=github.com/workadventure/workadventure/server-go --go_opt=Mmessages.proto=github.com/workadventure/workadventure/server-go/internal/pb/messages messages.proto
//go:generate protoc -I ../../../messages/protos --go_out=../.. --go_opt=module=github.com/workadventure/workadventure/server-go --go_opt=Mroom-api.proto=github.com/workadventure/workadventure/server-go/internal/pb/roomapi --go-grpc_out=../.. --go-grpc_opt=module=github.com/workadventure/workadventure/server-go --go-grpc_opt=Mroom-api.proto=github.com/workadventure/workadventure/server-go/internal/pb/roomapi room-api.proto
