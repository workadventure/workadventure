// Package admin answers the questions the server asks the administration: who is this member, what is this map.
// Local is the OSS mode, used when ADMIN_API_URL is empty (LocalAdmin of the pusher).
package admin

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/url"
	"path"
	"regexp"
	"slices"

	"github.com/workadventure/workadventure/server-go/internal/config"
)

// Texture is a woka layer or companion texture (WokaDetail / CompanionDetail).
type Texture struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type Application struct {
	Name        string `json:"name"`
	Doc         string `json:"doc,omitempty"`
	Image       string `json:"image,omitempty"`
	Description string `json:"description,omitempty"`
	Enabled     bool   `json:"enabled"`
	Default     bool   `json:"default"`
	ForceNewTab bool   `json:"forceNewTab"`
	AllowAPI    bool   `json:"allowAPI"`
}

// MemberData is the member as seen by the admin (FetchMemberDataByUuidResponse, status "ok"). Its JSON is part of
// the /me response.
type MemberData struct {
	Status                   string        `json:"status"`
	Email                    string        `json:"email"`
	UserUUID                 string        `json:"userUuid"`
	Tags                     []string      `json:"tags"`
	VisitCardURL             *string       `json:"visitCardUrl"`
	IsCharacterTexturesValid bool          `json:"isCharacterTexturesValid"`
	CharacterTextures        []Texture     `json:"characterTextures"`
	IsCompanionTextureValid  bool          `json:"isCompanionTextureValid"`
	CompanionTexture         *Texture      `json:"companionTexture,omitempty"`
	UserRoomToken            string        `json:"userRoomToken,omitempty"`
	ActivatedInviteUser      bool          `json:"activatedInviteUser"`
	CanEdit                  bool          `json:"canEdit"`
	World                    string        `json:"world"`
	Applications             []Application `json:"applications"`
	CanRecord                bool          `json:"canRecord"`
	AnalyticsEventsEnabled   bool          `json:"analyticsEventsEnabled"`
}

// MemberQuery is what the server knows about a client when it asks the admin for its member data.
type MemberQuery struct {
	Identifier, AccessToken, PlayURI, IPAddress, Locale, ChatID string
	CharacterTextureIDs                                         []string
	CompanionTextureID                                          string
	Tags                                                        []string
}

// Admin is the port to the administration. ponytail: only the OSS implementation (Local) exists; the HTTP admin
// API client comes with the SaaS milestone.
type Admin interface {
	MemberData(ctx context.Context, q MemberQuery) (MemberData, error)
	// MapDetails returns the JSON answer of /map: MapDetailsData, RoomRedirect or ErrorApiData.
	MapDetails(ctx context.Context, playURI string) (map[string]any, error)
	WokaList() json.RawMessage
	CompanionList() json.RawMessage
}

//go:embed data/woka.json
var wokaJSON []byte

//go:embed data/companions.json
var companionsJSON []byte

var wokaPartNames = []string{"woka", "body", "eyes", "hair", "clothes", "hat", "accessory"}

type textureList struct {
	Collections []struct {
		Textures []Texture `json:"textures"`
	} `json:"collections"`
}

type Local struct {
	cfg        *config.Config
	wokas      map[string]string // texture id → url, in part order
	companions map[string]string
}

func NewLocal(cfg *config.Config) (*Local, error) {
	l := &Local{cfg: cfg, wokas: map[string]string{}, companions: map[string]string{}}
	var parts map[string]textureList
	if err := json.Unmarshal(wokaJSON, &parts); err != nil {
		return nil, fmt.Errorf("woka.json: %w", err)
	}
	for _, p := range wokaPartNames {
		for _, c := range parts[p].Collections {
			for _, t := range c.Textures {
				if _, seen := l.wokas[t.ID]; !seen {
					l.wokas[t.ID] = t.URL
				}
			}
		}
	}
	var companions []struct {
		Textures []Texture `json:"textures"`
	}
	if err := json.Unmarshal(companionsJSON, &companions); err != nil {
		return nil, fmt.Errorf("companions.json: %w", err)
	}
	for _, c := range companions {
		for _, t := range c.Textures {
			if _, seen := l.companions[t.ID]; !seen {
				l.companions[t.ID] = t.URL
			}
		}
	}
	return l, nil
}

func (l *Local) WokaList() json.RawMessage      { return wokaJSON }
func (l *Local) CompanionList() json.RawMessage { return companionsJSON }

var editablePath = regexp.MustCompile(`/~/(.+)`)

func (l *Local) MemberData(_ context.Context, q MemberQuery) (MemberData, error) {
	roomURL, err := url.Parse(q.PlayURI)
	if err != nil || roomURL.Scheme == "" || roomURL.Host == "" {
		return MemberData{}, fmt.Errorf("invalid room URL %q", q.PlayURI)
	}
	canEdit := editablePath.MatchString(roomURL.Path) && l.cfg.EnableMapEditor &&
		(l.cfg.MapEditorAllowAllUsers || slices.Contains(l.cfg.MapEditorAllowedUsers, q.Identifier) ||
			slices.Contains(q.Tags, "admin") || slices.Contains(q.Tags, "editor"))

	textures := make([]Texture, 0, len(q.CharacterTextureIDs))
	valid := true
	for _, id := range q.CharacterTextureIDs {
		u, ok := l.wokas[id]
		if !ok {
			valid = false
			break
		}
		if !slices.ContainsFunc(textures, func(t Texture) bool { return t.ID == id }) {
			textures = append(textures, Texture{ID: id, URL: u})
		}
	}
	if !valid {
		textures = []Texture{}
	}
	var companion *Texture
	companionValid := true
	if q.CompanionTextureID != "" {
		if u, ok := l.companions[q.CompanionTextureID]; ok {
			companion = &Texture{ID: q.CompanionTextureID, URL: u}
		} else {
			companionValid = false
		}
	}
	tags := q.Tags
	if tags == nil {
		tags = []string{}
	}
	return MemberData{
		Status: "ok", Email: q.Identifier, UserUUID: q.Identifier, Tags: tags,
		IsCharacterTexturesValid: valid, CharacterTextures: textures,
		IsCompanionTextureValid: companionValid, CompanionTexture: companion,
		ActivatedInviteUser: true, CanEdit: canEdit, World: roomURL.Scheme + "://" + roomURL.Host,
		Applications: l.applications(),
		CanRecord:    l.cfg.RecordingConfigured && q.AccessToken != "",
		// No admin back office: nobody to report analytics to.
		AnalyticsEventsEnabled: false,
	}, nil
}

func (l *Local) applications() []Application {
	type app struct {
		flag string
		Application
	}
	all := []app{
		{"KLAXOON_ENABLED", Application{Name: "Klaxoon", Doc: "https://klaxoon.com", Image: "https://static.klaxoon.com/favicon.ico", Description: "Klaxoon (Brainstorming, Quiz, Survey)"}},
		{"YOUTUBE_ENABLED", Application{Name: "Youtube", Doc: "https://youtube.com", Image: "https://www.youtube.com/favicon.ico", Description: "Youtube (Video sharing)"}},
		{"GOOGLE_DRIVE_ENABLED", Application{Name: "Google Drive", Doc: "https://drive.google.com", Description: "Google Drive (Docs, Sheets, Slides)"}},
		{"GOOGLE_DOCS_ENABLED", Application{Name: "Google Docs", Doc: "https://docs.google.com", Description: "Google Docs (Word Processor)"}},
		{"GOOGLE_SHEETS_ENABLED", Application{Name: "Google Sheets", Doc: "https://sheets.google.com", Description: "Google Sheets (Spreadsheet)"}},
		{"GOOGLE_SLIDES_ENABLED", Application{Name: "Google Slides", Doc: "https://slides.google.com", Description: "Google Slides (Presentation)"}},
		{"ERASER_ENABLED", Application{Name: "Eraser", Doc: "https://workadventu.re", Description: "Eraser (White board)"}},
		{"EXCALIDRAW_ENABLED", Application{Name: "Excalidraw", Doc: "https://excalidraw.com", Description: "Excalidraw (White board)"}},
		{"CARDS_ENABLED", Application{Name: "Cards", Doc: "https://workadventu.re", Description: "Cards (learning tool)"}},
		{"TLDRAW_ENABLED", Application{Name: "tldraw", Doc: "https://tldraw.com", Description: "tldraw (White board)"}},
	}
	out := []Application{}
	for _, a := range all {
		if l.cfg.FrontEnv[a.flag] == true {
			a.Enabled, a.Default = true, true
			out = append(out, a.Application)
		}
	}
	return out
}

var publicMapPath = regexp.MustCompile(`/_/[^/]+/(.+)`)

func (l *Local) MapDetails(_ context.Context, playURI string) (map[string]any, error) {
	roomURL, err := url.Parse(playURI)
	if err != nil {
		return nil, err
	}
	if roomURL.Path == "/" || roomURL.Path == "" {
		redirect := *roomURL
		redirect.Path = l.cfg.StartRoomURL
		return map[string]any{"redirectUrl": redirect.String()}, nil
	}
	details := map[string]any{}
	if m := editablePath.FindStringSubmatch(roomURL.Path); m != nil {
		if path.Ext(roomURL.Path) == ".tmj" {
			return map[string]any{"redirectUrl": regexp.MustCompile(`\.tmj`).ReplaceAllString(roomURL.String(), ".wam")}, nil
		}
		details["wamUrl"] = l.cfg.PublicMapStorageURL + "/" + m[1]
		details["canEdit"] = l.cfg.EnableMapEditor
		details["group"] = "default"
	} else if m := publicMapPath.FindStringSubmatch(roomURL.Path); m != nil {
		details["mapUrl"] = roomURL.Scheme + "://" + m[1]
		details["canEdit"] = false
		details["group"] = nil
	} else {
		return map[string]any{
			"status": "error", "type": "error", "code": "UNSUPPORTED_URL_FORMAT", "title": "Unsupported URL format",
			"details": "Unsupported path: " + roomURL.Path, "subtitle": "",
		}, nil
	}
	c := l.cfg
	buttonState := "hidden"
	if c.RecordingConfigured {
		buttonState = "enabled"
	}
	for k, v := range map[string]any{
		"authenticationMandatory":          c.DisableAnonymous,
		"contactPage":                      nil,
		"opidLogoutRedirectUrl":            nil,
		"opidUsernamePolicy":               c.OpidWokaNamePolicy,
		"loadingLogo":                      nil,
		"loginSceneLogo":                   nil,
		"errorSceneLogo":                   nil,
		"showPoweredBy":                    true,
		"loadingCowebsiteLogo":             nil,
		"enableChat":                       c.EnableChat,
		"enableChatUpload":                 c.EnableChatUpload,
		"enableChatOnlineList":             c.EnableChatOnlineList,
		"enableChatDisconnectedList":       c.EnableChatDisconnectedList,
		"enableSay":                        c.EnableSay,
		"enableIssueReport":                c.EnableIssueReport,
		"enableMatrixChat":                 c.MatrixEnabled,
		"skipCameraPage":                   c.SkipCameraPage,
		"defaultCameraPrivacySettings":     c.DefaultCameraPrivacySettings,
		"defaultMicrophonePrivacySettings": c.DefaultMicrophonePrivacySettings,
		"bypassPwa":                        c.BypassPWA,
		"metatags":                         DefaultMetaTags(),
		"recording":                        map[string]any{"buttonState": buttonState, "disabledReason": nil},
		"metadata":                         map[string]any{"enableTutorial": c.EnableTutorial},
	} {
		details[k] = v
	}
	for k, v := range map[string]string{
		"defaultWokaName":           c.DefaultWokaName,
		"defaultWokaTexture":        c.DefaultWokaTexture,
		"provideDefaultWokaName":    c.ProvideDefaultWokaName,
		"provideDefaultWokaTexture": c.ProvideDefaultWokaTexture,
	} {
		if v != "" {
			details[k] = v
		}
	}
	return details, nil
}

// DefaultMetaTags is MetaTagsDefaultValue.
func DefaultMetaTags() map[string]any {
	return map[string]any{
		"title":         "WorkAdventure",
		"description":   "Organize your online event in WorkAdventure to recreate spontaneous social interactions. Connect, collaborate and have fun with your teammates and attendees.",
		"author":        "WorkAdventure team",
		"provider":      "WorkAdventure",
		"favIcons":      []map[string]string{{"rel": "icon", "sizes": "512x512", "src": "/static/images/favicons/favicon-512x512.svg"}},
		"manifestIcons": []map[string]string{{"src": "/static/images/favicons/icon-512x512.png", "sizes": "512x512", "type": "image/png"}},
		"appName":       "WorkAdventure",
		"shortAppName":  "WA",
		"themeColor":    "#1B2A41",
		"cardImage":     "https://workadventu.re/images/general/logo-og.png",
	}
}
