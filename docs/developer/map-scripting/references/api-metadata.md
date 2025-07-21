---
sidebar_position: 1
---

# Metadata

### Getting metadata

```ts
WA.metadata: unknown | undefined
```

The metadata is an object generated from the administration. The play service and the front must be agnostic of the data on this object.

In the SAAS case we send the list of NFTS own by the user:

```ts
{
    "player" {
        "nfts" [
            {
                "contractAddress": string,
                "nfts": [
                    {
                        "tokenId": string,
                        "spriteUrl": string|undefined
                    },
                    ...
                ]
            },
            ...
        ]
    }
}
```

Example:

```ts
WA.onInit().then(() => {
  console.log("Current metadata: ", WA.metadata);
});
```
