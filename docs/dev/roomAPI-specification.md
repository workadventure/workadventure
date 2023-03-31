## Room API Proto File Documentation

The following documentation provides an overview of the `roomApi.proto` Protobuf file.

### Syntax

The `proto3` syntax is used in this file.

### Package

The Protobuf file belongs to the `roomApi` package.

### Imports

The Protobuf file imports the following files:

- `google/protobuf/struct.proto`
- `google/protobuf/empty.proto`

### Messages

The file defines the following messages:

#### `VariableRequest`

This message is used to request a variable by room and name.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `room` | `string` | The room url. |
| `name` | `string` | The name of the variable. |

#### `SaveVariableRequest`

This message is used to save a variable by room, name, and value.

| Field | Type | Description |
| ----- | ---- | ----------- |
| `room` | `string` | The room urm. |
| `name` | `string` | The name of the variable. |
| `value` | `google.protobuf.Value` | The value of the variable. |

### Services

The file defines the following service:

#### `RoomApi`

This service provides three RPC methods to read, listen, and save variables.

##### `readVariable`

This RPC method returns the current value of the given variable.

| Request | Response |
| ------- | -------- |
| `VariableRequest` | `google.protobuf.Value` |

##### `listenVariable`

This RPC method returns a stream of value updates for the given variable.

| Request | Response |
| ------- | -------- |
| `VariableRequest` | `stream google.protobuf.Value` |

##### `saveVariable`

This RPC method sets the value of the given variable.

| Request | Response |
| ------- | -------- |
| `SaveVariableRequest` | `google.protobuf.Empty` |
