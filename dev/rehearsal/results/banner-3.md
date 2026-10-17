# Rehearsal banner-3

Date: 2026-10-17 09:16:22 CEST  |  host: Darwin arm64  |  minikube v1.34.0, Kubernetes v1.31.0, helm v3.16.4+g7877b45

## Versions

| Component | Version |
|---|---|
| dev-socle (this rehearsal) | a79cbf1c7 + uncommitted changes in dev/rehearsal |
| TypeScript images (play, back, map-storage, uploader, maps) | `master-6f4d02319eddbf46a51cb99ffd38e2d75273593c` |
| &nbsp;&nbsp;ghcr.io/workadventure/play | sha256:9ad1fd72d970 |
| &nbsp;&nbsp;ghcr.io/workadventure/back | sha256:2ab9d535a329 |
| &nbsp;&nbsp;ghcr.io/workadventure/map-storage | sha256:3a0a93c04eaf |
| &nbsp;&nbsp;ghcr.io/workadventure/uploader | sha256:5bb8e117cbc8 |
| &nbsp;&nbsp;ghcr.io/workadventure/maps | sha256:b4d269e55a01 |
| Front (assets, template) | wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c, sha256:c30e17584916 |
| Go server | `wa-server-go:rehearsal` sha256:8f8b2711adfe, built from lang-go `04713cbdc` (0 uncommitted file(s) at build time), API_VERSION `b82fc568`, built 2026-10-17T07:06:21Z |
| lang-go worktree now | de6512ec3, 0 uncommitted file(s) |
| Helm chart | name: workadventure version: 0.0.9-dev1  |
| Playwright / browser | 1.63.0 / Chromium 153.0.8010.12 |

Setup: one node, one play replica, Redis of the chart, ingress nginx, self-signed certificate, map-storage volume (PVC) mounted by the Go pod at /maps.

## Measures

| Measure | -> go | -> ts |
|---|---|---|
| helm upgrade --wait | 4 s | 14 s |
| /ping through the ingress | 8 s after the start | 18 s after the start |
| first failed probe | 2.559 s | 12.883 s |
| both see each other moving | 10.218 s | 21.244 s |
| outage (first failed probe -> recovered) | 7.659 s | 8.361 s |
| after the end of deploy.sh | 1.976 s | 2.843 s |
| 'Connection to server lost' banner | never seen | never seen |
| manual reload needed | no | no |
| rejoin from scratch needed | no | no |

## Results

| Check | Result | Detail |
|---|---|---|
| ts: the two see each other moving (baseline) | OK |  |
| ts: bubble formed again | OK | after 0.006 s |
| ts: Alice sees Bob, Carol | OK |  |
| ts: Bob sees Alice, Carol | OK |  |
| ts: Carol (new) sees Alice, Bob | OK |  |
| ts: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 2 |
| ts: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 2 |
| ts: new variable written by ts | OK | Bob reads "ts-banner-3" |
| ts: ... a fresh user reads it | OK | got "ts-banner-3" |
| ts: map ts written | OK | WRITE map ts rehearsal-banner-3-ts.wam HTTP 200 |
| ts: shared-map ts written | OK | WRITE shared-map ts rehearsal-banner-3-shared.wam HTTP 200 |
| ts: file ts written | OK | WRITE file ts id=98d0d65b-9983-40a5-a20a-8ee06f0a361b.txt |
| ts: map written by ts read back | OK | OK |
| ts: file written by ts read back | OK | OK |
| ts: shared map edited by ts (last writer) | OK | OK |
| go: the tabs recovered | OK | reload needed: false, rejoin needed: false |
| go: bubble formed again | OK | after 0.007 s |
| go: Alice sees Bob, Carol | OK |  |
| go: Bob sees Alice, Carol | OK |  |
| go: Carol (new) sees Alice, Bob | OK |  |
| go: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 3 |
| go: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 3 |
| go: variable written by ts read by a fresh user | OK | got "ts-banner-3", expected "ts-banner-3" |
| go: ... and by Alice's tab | OK | got "ts-banner-3" |
| go: new variable written by go | OK | Bob reads "go-banner-3" |
| go: ... a fresh user reads it | OK | got "go-banner-3" |
| go: map written by ts read back | OK | OK |
| go: file written by ts read back | OK | OK |
| go: shared map edited by ts (last writer) | OK | OK |
| go: map go written | OK | WRITE map go rehearsal-banner-3-go.wam HTTP 200 |
| go: shared-map go written | OK | WRITE shared-map go rehearsal-banner-3-shared.wam HTTP 200 |
| go: file go written | OK | WRITE file go id=01ed1546-7cde-43c3-b6fe-e76a955999a6.txt |
| ts again: the tabs recovered | OK | reload needed: false, rejoin needed: false |
| ts2: bubble formed again | OK | after 0.009 s |
| ts2: Alice sees Bob, Carol | OK |  |
| ts2: Bob sees Alice, Carol | OK |  |
| ts2: Carol (new) sees Alice, Bob | OK |  |
| ts2: Alice's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 4 |
| ts2: Bob's document never reloaded | OK | marker kept, main-frame navigations (pushState included): 4 |
| ts2: variable written by go read by a fresh user | OK | got "go-banner-3", expected "go-banner-3" |
| ts2: ... and by Alice's tab | OK | got "go-banner-3" |
| ts2: new variable written by ts2 | OK | Bob reads "ts2-banner-3" |
| ts2: ... a fresh user reads it | OK | got "ts2-banner-3" |
| ts2: map written by ts read back | OK | OK |
| ts2: file written by ts read back | OK | OK |
| ts2: map written by go read back | OK | OK |
| ts2: file written by go read back | OK | OK |
| ts2: shared map edited by go (last writer) | OK | OK |
| ts2: map ts2 written | OK | WRITE map ts2 rehearsal-banner-3-ts2.wam HTTP 200 |
| ts2: shared-map ts2 written | OK | WRITE shared-map ts2 rehearsal-banner-3-shared.wam HTTP 200 |
| ts2: file ts2 written | OK | WRITE file ts2 id=c5cddc84-1eca-451e-b89e-771104c1aa9b.txt |

## Timeline

- +0.1s room https://play-rehearsal.localhost/_/rhbanner-3/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json
- +8.6s Alice and Bob joined on TypeScript
- +22.4s redis (ts):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-1"
    KEY https://play-rehearsal.localhost/_/rhbanner-3/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts-banner-3"
    KEY https://play-rehearsal.localhost/_/rhbanner-2/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-2"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 7
- +22.7s data.sh write ts:
    WRITE map ts rehearsal-banner-3-ts.wam HTTP 200
    WRITE shared-map ts rehearsal-banner-3-shared.wam HTTP 200
    WRITE file ts id=98d0d65b-9983-40a5-a20a-8ee06f0a361b.txt
- +22.9s deploy.sh go: start
- +25.5s first failed probe (go)
- +31.1s deploy.sh go: finished (exit 0)
- +33.1s both see each other moving again (no reload)
- +33.1s trace (go): 0.512s:ok 1.022s:ok 1.532s:ok 2.041s:ok 2.559s:ko 9.138s:half 9.701s:ok 10.218s:ok
- +33.1s deploy.sh go output:
    09:16:47 start go
    Release "rehearsal" has been upgraded. Happy Helming!
    NAME: rehearsal
    LAST DEPLOYED: Sat Oct 17 09:16:47 2026
    NAMESPACE: wa
    STATUS: deployed
    REVISION: 26
    TEST SUITE: None
    == go: helm --wait 4s, /ping through the ingress 8s after start
    NAME                                             IMAGE                                                                        READY
    rehearsal-redis-master-0                         docker.io/bitnamilegacy/redis:7.0.11-debian-11-r20                           true
    rehearsal-workadventure-front-5c6f9fbb7c-b8kd4   wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c               true
    rehearsal-workadventure-icon-6f9bb75f8b-xjf4g    matthiasluedtke/iconserver:v3.21.0                                           true
    rehearsal-workadventure-maps-58cdc54cdc-xqt96    ghcr.io/workadventure/maps:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c   true
    rehearsal-workadventure-play-588ffd9445-ttbl4    wa-server-go:rehearsal                                                       true
- +46.0s redis (go):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-1"
    KEY https://play-rehearsal.localhost/_/rhbanner-3/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "go-banner-3"
    KEY https://play-rehearsal.localhost/_/rhbanner-2/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-2"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 7
- +46.5s data.sh write go:
    WRITE map go rehearsal-banner-3-go.wam HTTP 200
    WRITE shared-map go rehearsal-banner-3-shared.wam HTTP 200
    WRITE file go id=01ed1546-7cde-43c3-b6fe-e76a955999a6.txt
- +46.5s deploy.sh ts: start
- +59.3s first failed probe (ts)
- +64.9s deploy.sh ts: finished (exit 0)
- +67.7s both see each other moving again (no reload)
- +67.7s trace (ts): 0.512s:ok 1.026s:ok 1.536s:ok 2.049s:ok 2.564s:ok 3.084s:ok 3.611s:ok 4.126s:ok 4.641s:ok 5.16s:ok 5.678s:ok 6.205s:ok 6.719s:ok 7.232s:ok 7.745s:ok 8.257s:ok 8.771s:ok 9.284s:ok 9.798s:ok 10.311s:ok 10.827s:ok 11.342s:ok 11.856s:ok 12.369s:ok 12.883s:ko 13.398s:ok 13.913s:ko 14.425s:ok 14.94s:ko 15.455s:ok 15.969s:ko 16.483s:ok 16.998s:ko 17.51s:ok 18.024s:ko 18.536s:ok 19.051s:ko 19.565s:ok 20.208s:ko 20.732s:ok 21.244s:ok
- +67.7s deploy.sh ts output:
    09:17:10 start ts
    Release "rehearsal" has been upgraded. Happy Helming!
    NAME: rehearsal
    LAST DEPLOYED: Sat Oct 17 09:17:11 2026
    NAMESPACE: wa
    STATUS: deployed
    REVISION: 27
    TEST SUITE: None
    == ts: helm --wait 14s, /ping through the ingress 18s after start
    NAME                                                  IMAGE                                                                               READY
    rehearsal-redis-master-0                              docker.io/bitnamilegacy/redis:7.0.11-debian-11-r20                                  true
    rehearsal-workadventure-back-0                        ghcr.io/workadventure/back:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-front-5c6f9fbb7c-b8kd4        wa-socle-front:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c                      true
    rehearsal-workadventure-icon-6f9bb75f8b-xjf4g         matthiasluedtke/iconserver:v3.21.0                                                  true
    rehearsal-workadventure-maps-58cdc54cdc-xqt96         ghcr.io/workadventure/maps:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-mapstorage-79dd6f6777-ch4vr   ghcr.io/workadventure/map-storage:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c   true
    rehearsal-workadventure-play-7f968b974b-nmhtz         ghcr.io/workadventure/play:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c          true
    rehearsal-workadventure-uploader-6b7456fdb-lhrq2      ghcr.io/workadventure/uploader:master-6f4d02319eddbf46a51cb99ffd38e2d75273593c      true
- +81.1s redis (ts2):
    KEY https://play-rehearsal.localhost/_/rh20261017-0906/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0906"
    KEY https://play-rehearsal.localhost/_/rhbanner-1/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-1"
    KEY https://play-rehearsal.localhost/_/rhbanner-3/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-3"
    KEY https://play-rehearsal.localhost/_/rhbanner-2/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-banner-2"
    KEY https://play-rehearsal.localhost/_/rh20261017-0902/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0902"
    KEY https://play-rehearsal.localhost/_/rh20261017-0910/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json (hash)
    textField
    "ts2-20261017-0910"
    DBSIZE 7
- +81.7s data.sh write ts2:
    WRITE map ts2 rehearsal-banner-3-ts2.wam HTTP 200
    WRITE shared-map ts2 rehearsal-banner-3-shared.wam HTTP 200
    WRITE file ts2 id=c5cddc84-1eca-451e-b89e-771104c1aa9b.txt
- +81.7s Alice: socket pusher-rehearsal.localhost open +3.808s, closed +25.42s
- +81.7s Alice: socket pusher-rehearsal.localhost open +25.488s, closed +25.502s
- +81.7s Alice: socket pusher-rehearsal.localhost open +26.745s, closed +58.854s
- +81.7s Alice: socket pusher-rehearsal.localhost open +59.376s, closed +66.405s
- +81.7s Bob: socket pusher-rehearsal.localhost open +7.97s, closed +25.421s
- +81.7s Bob: socket pusher-rehearsal.localhost open +25.492s, closed +25.505s
- +81.7s Bob: socket pusher-rehearsal.localhost open +26.996s, closed +58.854s
- +81.7s Bob: socket pusher-rehearsal.localhost open +59.376s, closed +66.405s
