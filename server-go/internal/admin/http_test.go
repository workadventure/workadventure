package admin

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/workadventure/workadventure/server-go/internal/config"
)

// A fake SaaS admin, answering as dev/contracts/admin-api.md says.
func fakeAdmin(t *testing.T, handle func(w http.ResponseWriter, r *http.Request)) (*HTTP, *int32) {
	t.Helper()
	var capabilityCalls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/capabilities" {
			if atomic.AddInt32(&capabilityCalls, 1) == 1 {
				http.NotFound(w, r) // not ready yet: the server tries again
				return
			}
			if r.Header.Get("Authorization") != "" {
				t.Error("the capabilities are asked without the admin token")
			}
			_ = json.NewEncoder(w).Encode(map[string]string{"api/woka/list": "v1", "api/domain/verify": "v1", "api/ice-servers": "v1"})
			return
		}
		if r.Header.Get("Authorization") != "admin-token" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		handle(w, r)
	}))
	t.Cleanup(srv.Close)
	cfg := &config.Config{AdminAPIURL: srv.URL, AdminURL: srv.URL, AdminAPIToken: "admin-token", AdminAPIRetryDelay: 10 * time.Millisecond,
		PusherURL: "http://play.test", FrontEnv: config.FrontEnv{}}
	local, err := NewLocal(cfg)
	if err != nil {
		t.Fatal(err)
	}
	a, err := NewHTTP(context.Background(), cfg, local)
	if err != nil {
		t.Fatal(err)
	}
	return a, &capabilityCalls
}

func TestTheServerWaitsForTheAdminsCapabilities(t *testing.T) {
	a, calls := fakeAdmin(t, func(http.ResponseWriter, *http.Request) {})
	if *calls != 2 || a.Capabilities()["api/woka/list"] != "v1" {
		t.Fatalf("a 404 is tried again: %d calls, %v", *calls, a.Capabilities())
	}
}

func TestTheAdminLetsAMemberIn(t *testing.T) {
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		if r.URL.Path != "/api/room/access" || q.Get("playUri") != "https://world.test/@/org/w/r" || q["characterTextureIds[]"][0] != "male1" ||
			q.Get("isLogged") != "1" || r.Header.Get("Accept-Language") != "fr" {
			t.Errorf("request: %s %v %v", r.URL.Path, q, r.Header)
		}
		_, _ = w.Write([]byte(`{"status":"ok","email":null,"userUuid":"u-1","tags":["admin"],"visitCardUrl":null,"isCharacterTexturesValid":true,` +
			`"characterTextures":[{"id":"male1","url":"x.png"}],"isCompanionTextureValid":true,"world":"org/w","canEdit":true,"unknown":1}`))
	})
	m, err := a.MemberData(context.Background(), MemberQuery{Identifier: "a@b.c", AccessToken: "tok", PlayURI: "https://world.test/@/org/w/r",
		Locale: "fr", CharacterTextureIDs: []string{"male1"}})
	if err != nil || m.UserUUID != "u-1" || m.World != "org/w" || !m.CanEdit || !m.AnalyticsEventsEnabled {
		t.Fatalf("analytics on unless the admin says otherwise: %+v %v", m, err)
	}
}

func TestTheAdminsRefusalReachesTheFrontAsIs(t *testing.T) {
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"status":"error","type":"unauthorized","code":"WORLD_FULL","title":"World is full","subtitle":"","details":"","buttonTitle":"Back"}`))
	})
	_, err := a.MemberData(context.Background(), MemberQuery{PlayURI: "https://world.test/@/org/w/r"})
	var refused *Refusal
	if !errors.As(err, &refused) || refused.Data["code"] != "WORLD_FULL" || refused.Data["buttonTitle"] != "Back" {
		t.Fatalf("%v", err)
	}
}

func TestAnUnreachableOrConfusedAdminIsAnErrorScreenNotACrash(t *testing.T) {
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/room/access" {
			http.Error(w, "boom", http.StatusInternalServerError)
			return
		}
		_, _ = w.Write([]byte(`{"what":"ever"}`))
	})
	_, err := a.MemberData(context.Background(), MemberQuery{PlayURI: "https://world.test/@/org/w/r"})
	var refused *Refusal
	if !errors.As(err, &refused) || refused.Data["code"] != "ROOM_ACCESS_ERROR" {
		t.Fatalf("transport error: %v", err)
	}
	if d, _ := a.MapDetails(context.Background(), MapQuery{PlayURI: "https://world.test/@/org/w/r"}); d.Raw["code"] != "MAP_VALIDATION" {
		t.Fatalf("an answer that is neither a map, a redirection nor an error: %v", d)
	}
}

func TestTheAdminDescribesTheMap(t *testing.T) {
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("userId") != "a@b.c" || r.Header.Get("Accept-Language") != "en" {
			t.Errorf("%v %v", r.URL.Query(), r.Header)
		}
		_, _ = w.Write([]byte(`{"group":"org/w","wamUrl":"https://w-1.ms.test/office.wam","thirdParty":{"jitsi":{"url":"https://jitsi.test","secret":"s"}}}`))
	})
	d, _ := a.MapDetails(context.Background(), MapQuery{PlayURI: "https://world.test/@/org/w/r", UserID: "a@b.c"})
	if d.Raw["wamUrl"] != "https://w-1.ms.test/office.wam" || d.Raw["thirdParty"] == nil {
		t.Fatalf("thirdParty stays for the server (the /map route drops it): %v", d)
	}
}

func TestCapabilitiesChooseBetweenTheAdminAndTheServer(t *testing.T) {
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/woka/list":
			_, _ = w.Write([]byte(`{"woka":{"collections":[]}}`))
		case "/api/domain/verify":
			if r.URL.Query().Get("uri") == "https://custom.test/r" {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			http.Error(w, "no", http.StatusForbidden)
		case "/api/ice-servers":
			_, _ = w.Write([]byte(`[{"urls":["turn:t.test"],"username":"u","credential":"c"}]`))
		}
	})
	ctx := context.Background()
	if l, err := a.WokaList(ctx, "https://world.test/r", "u-1"); err != nil || string(l) != `{"woka":{"collections":[]}}` {
		t.Fatalf("api/woka/list: the admin's list: %s %v", l, err)
	}
	if l, _ := a.CompanionList(ctx, "https://world.test/r", "u-1"); len(l) < 100 {
		t.Fatal("no api/companion/list: the local list")
	}
	if !a.VerifyDomain(ctx, "https://custom.test/r") || a.VerifyDomain(ctx, "https://evil.test/r") {
		t.Fatal("the admin decides which domains the login may return to")
	}
	if ice, err := a.IceServers(ctx, "https://world.test/r", "u-1", 3); err != nil || ice[0].Username != "u" {
		t.Fatalf("ICE: %v %v", ice, err)
	}
}

func TestModerationAndTheMapEditorAskTheAdmin(t *testing.T) {
	var reported, banBody map[string]any
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/report":
			_ = json.NewDecoder(r.Body).Decode(&reported)
		case "/api/ban":
			_ = json.NewDecoder(r.Body).Decode(&banBody)
			if banBody["uuidToBan"] == "vip" {
				_, _ = w.Write([]byte(`{"status":"error"}`))
				return
			}
			_, _ = w.Write([]byte(`{}`))
		case "/api/room/tags":
			_, _ = w.Write([]byte(`["staff","guest"]`))
		case "/api/room/sameWorld":
			if q := r.URL.Query(); q.Get("tags") != "admin" || q.Get("bypassTagFilter") != "false" {
				t.Errorf("sameWorld query: %v", q)
			}
			_, _ = w.Write([]byte(`[{"name":"Hall","roomUrl":"https://w.test/@/o/w/hall","description":"The hall"}]`))
		}
	})
	ctx := context.Background()
	if err := a.Report(ctx, Report{ReportedUUID: "bad", Comment: "spam", ReporterUUID: "me", RoomURL: "https://w.test/r"}); err != nil ||
		reported["reportWorldSlug"] != "https://w.test/r" {
		t.Fatalf("report: %v %v", reported, err)
	}
	if a.Ban(ctx, Ban{UUID: "bad", Message: "spam"}) != nil || !errors.Is(a.Ban(ctx, Ban{UUID: "vip"}), ErrBanRefused) {
		t.Fatal("a 2xx records the ban, unless it says status error")
	}
	if tags := a.RoomTags(ctx, "https://w.test/r"); len(tags) != 2 {
		t.Fatal(tags)
	}
	rooms, ok, err := a.SameWorld(ctx, "https://w.test/r", []string{"admin"}, false)
	if !ok || err != nil || len(rooms) != 1 || *rooms[0].Description != "The hall" {
		t.Fatalf("%v %v %v", rooms, ok, err)
	}
}

func TestTheChatAndTheMapEditorSearchTheMembersOfTheAdmin(t *testing.T) {
	var saved map[string]string
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		switch r.Method + " " + r.URL.Path {
		case "GET /api/chat/members":
			if q.Get("playUri") != "http://play.test/@/o/w/r" || q.Get("searchText") != "jo" {
				t.Errorf("A12 query: %v", q)
			}
			_, _ = w.Write([]byte(`{"total":1,"members":[{"uuid":"u1","email":null,"chatId":"@jo:d","tags":["admin"]}]}`))
		case "GET /api/members":
			_, _ = w.Write([]byte(`[{"id":"u1","name":"Jo","email":"jo@x.test"}]`))
		case "GET /api/members/u1":
			_, _ = w.Write([]byte(`{"id":"u1","name":"Jo","email":null,"visitCardUrl":"http://card"}`))
		case "GET /api/world/tags":
			_, _ = w.Write([]byte(`["admin","member"]`))
		case "PUT /api/members/jo@x.test/chatId":
			_ = json.NewDecoder(r.Body).Decode(&saved)
		default:
			http.NotFound(w, r)
		}
	})
	ctx := context.Background()
	m, err := a.ChatMembers(ctx, "http://play.test/@/o/w/r", "jo")
	if err != nil || m.Total != 1 || m.Members[0].Email != nil || *m.Members[0].ChatID != "@jo:d" {
		t.Fatalf("A12: %+v %v", m, err)
	}
	if l, err := a.SearchMembers(ctx, "r", "jo"); err != nil || len(l) != 1 || *l[0].Name != "Jo" {
		t.Fatalf("A13: %v %v", l, err)
	}
	if tags, err := a.SearchTags(ctx, "r", ""); err != nil || len(tags) != 2 {
		t.Fatalf("A14: %v %v", tags, err)
	}
	if mb, err := a.GetMember(ctx, "u1"); err != nil || *mb.VisitCardURL != "http://card" {
		t.Fatalf("A15: %v %v", mb, err)
	}
	if _, err := a.GetMember(ctx, "gone"); err == nil {
		t.Fatal("A15: a member the admin does not know is an error")
	}
	if err := a.UpdateChatID(ctx, "jo@x.test", "@jo:d", "r"); err != nil || saved["chatId"] != "@jo:d" || saved["userIdentifier"] != "jo@x.test" || saved["roomUrl"] != "r" {
		t.Fatalf("A16: %v %v", saved, err)
	}
	local, _ := NewLocal(&config.Config{FrontEnv: config.FrontEnv{}})
	if _, err := local.SearchMembers(ctx, "r", ""); err == nil {
		t.Fatal("without an admin, searching members is an error, as in LocalAdmin")
	}
}

func TestTheAdminsChallengeAndChoicesWithoutCapability(t *testing.T) {
	var saved int32
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/save") {
			atomic.AddInt32(&saved, 1)
		}
		w.WriteHeader(http.StatusNoContent)
	})
	if err := a.SaveUser(context.Background(), SaveName, "jo@x.test", "r", "Jo"); err != nil || saved != 0 {
		t.Fatal("without api/save-name, nothing is sent and the player gets its 204")
	}
}

func TestTheEndOfARecordingIsToldAgainUntilTheAdminHearsIt(t *testing.T) {
	var calls atomic.Int32
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/recordings/events" || r.Header.Get("Accept") != "application/json" {
			http.NotFound(w, r)
			return
		}
		if calls.Add(1) == 1 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.WriteHeader(http.StatusAccepted)
	})
	a.caps["api/recordings/events"] = "v1"
	if err := a.RecordingEvent(context.Background(), map[string]string{"phase": "ended"}); err != nil || calls.Load() != 2 {
		t.Fatalf("a 502 is tried again: %v, %d calls", err, calls.Load())
	}
}

func TestTheAdminGivesEachWorldItsLiveKit(t *testing.T) {
	a, _ := fakeAdmin(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Query().Get("playUri") {
		case "http://play.test/@/o/w/r":
			_, _ = w.Write([]byte(`{"livekitHost":"https://lk.w.test","livekitApiKey":"k","livekitApiSecret":"s"}`))
		default:
			_, _ = w.Write([]byte(`{"livekitHost":"https://lk.test"}`))
		}
	})
	host, key, secret, err := a.LiveKitCredentials(context.Background(), "http://play.test/@/o/w/r")
	if err != nil || host != "https://lk.w.test" || key != "k" || secret != "s" {
		t.Fatal(host, key, secret, err)
	}
	if _, _, _, err := a.LiveKitCredentials(context.Background(), "other"); err == nil {
		t.Fatal("incomplete credentials are an error: the space stays on WebRTC")
	}
}

// WorldChatMembersData's email: .transform(null → undefined). A JSON null is a nil pointer here, an absent field in
// the protobuf answer: the front's undefined.
func TestAChatMemberWithoutEmailHasNone(t *testing.T) {
	var m ChatMembers
	if err := checked([]byte(`{"total":1,"members":[{"uuid":"u","email":null,"tags":[]}]}`), "WorldChatMembers", false, &m); err != nil {
		t.Fatal(err)
	}
	if len(m.Members) != 1 || m.Members[0].Email != nil {
		t.Fatalf("members: %+v", m.Members)
	}
	if checked([]byte(`{"total":1,"members":[{"uuid":"u","tags":[]}]}`), "WorldChatMembers", false, &m) == nil {
		t.Fatal("email is required (nullable, not optional)")
	}
}
