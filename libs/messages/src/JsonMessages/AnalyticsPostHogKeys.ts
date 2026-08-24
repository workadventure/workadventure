import type { AnalyticsEventName } from "./AnalyticsEventCatalog";

/**
 * The name each event travels under in PostHog, the sink that predates this
 * pipeline and is still the only one on a world whose pusher does not advertise
 * `api/analytics/events-batch`.
 *
 * ## Why this is not a field on the catalog entry
 *
 * It was, briefly, and the entry is the more obvious home: one event, one place,
 * nothing to keep in step. But `ANALYTICS_EVENTS` is ~166 live Zod schemas, and
 * the front is the only thing that needs these names — reading them off the
 * catalog meant importing all of it into the browser bundle to look up a table of
 * strings. Here, the sole import is a *type*, which is erased: the front gets 117
 * strings and no Zod.
 *
 * The type is what keeps the two in step. Every key must be a real event name, so
 * a renamed or deleted event is a compile error rather than a mapping that
 * silently stops matching anything.
 *
 * ## Absent means "not a PostHog event", which covers two things
 *
 * - An event added with this pipeline, which PostHog never knew. Adding a key here
 *   would invent volume rather than migrate it, so leave it out.
 * - An interval, whose PostHog counterpart is not one event: `cowebsite.closed`,
 *   `area.dwell` and `megaphone.ended` are opened and closed by the user, and
 *   PostHog counts both ends while the admin gets one row when it finishes.
 *   AnalyticsClient captures those itself, where the interval is opened and closed
 *   — and it has to, because the two do not coincide: a stale area handle closing
 *   is not someone leaving, and a broadcast reopened after a reconnect is not
 *   someone pressing start.
 *
 * The events two UI paths reach under two names are NOT in that list: they used to
 * be, and they are now ordinary entries in the discriminated form below.
 *
 * ## What PostHog receives
 *
 * `trackAdminEvent` captures with the event's own properties, so the payload is
 * whatever the catalog declares — not the ad-hoc object each call site used to
 * build before the two sinks were folded into one call.
 *
 * `Partial` rather than a total `Record` on purpose: most of the catalog has no
 * PostHog counterpart, and requiring a key for every event would mean inventing
 * one for each new event added.
 */
/**
 * What an event travels under in PostHog: one name, or the several it takes
 * depending on one of its own declared properties.
 *
 * The discriminated form is for the events two UI paths reach under two names.
 * `profile.opened` is one event to this pipeline and two to PostHog — the profile
 * opened from the menu, and from the profile button — which a bare event→name map
 * cannot say. What can say it is the event's own property: the value the caller
 * already passes picks the name, so nothing at the call site has to know a PostHog
 * name exists at all.
 *
 * `whenAbsent` covers an optional discriminator — walking into a meeting area with
 * no `meetingProvider` is the LiveKit room, which PostHog has always counted under
 * a name of its own. A value with no entry in `byValue` is simply not a PostHog
 * event: `feedback.opened` from the Sentry dialog never was one.
 */
type PostHogEventKey =
  | string
  | {
      /** The declared property whose value picks the name. */
      on: string;
      byValue: Record<string, string>;
      /** Used when the property is absent, for the optional discriminators. */
      whenAbsent?: string;
    };

export const POSTHOG_EVENT_KEYS: Partial<
  Record<AnalyticsEventName, PostHogEventKey>
> = {
  "auth.logged_sso": "wa-logged-sso",
  "auth.logged_token": "wa-logged-token",
  "auth.login_clicked": "wa_login",
  "auth.logout_clicked": "wa_logout",

  "bubble.lock.toggled": "wa_lockroom",
  "bubble.say.opened": "wa_say_bubble_open",
  "bubble.think.opened": "wa_think_bubble_open",

  "chat.matrix_encryption_configuration.started":
    "wa_start_matrix_encryption_configuration",
  "chat.matrix_folder.created": "wa_create_matrix_folder",
  "chat.matrix_room.created": "wa_create_matrix_room",
  "chat.message_from_user_list_clicked": "wa_send_message_from_user_list",
  "chat.message_list_opened": "wa_open_message_list",
  "chat.opened": "wa-opened-chat",

  "conversation.participant_added": "wa_spontaneous_discussion",

  "cowebsite.fullscreen_opened": "wa_fullscreen_cowebsite",
  "cowebsite.link_copied": "wa_copy_cowebsite_link",
  "cowebsite.opened_in_new_tab": "wa_open_cowebsite_in_new_tab",
  "cowebsite.switched": "wa_switch_cowebsite",

  "custom_button.clicked": "wa-custom-button",

  "emote.edit_opened": "wa-emote-edit",
  "emote.launched": "wa-emote-launch",

  "external_module.calendar_opened": "wa-opened-external-module-calendar",
  "external_module.chat_band.clicked": "wa_external_module_chat_band_click",
  "external_module.opened": "wa-opened-external-module",
  "external_module.todo_list_opened": "wa-opened-external-module-todolist",

  "feedback.opened": {
    on: "feedbackSource",
    byValue: { external_report_url: "wa_menu_report" },
  },

  "file.drag_dropped": "wa_drag_drop_file",

  "global_audio.opened": "wa_action_globalaudio",

  "global_message.opened": {
    on: "source",
    byValue: { menu: "wa_menu_globalmessage", action_bar: "wa_action_globalmessage" },
  },
  "global_message.sound_sent": "wa_menu_globalmessage_sound",
  "global_message.text_sent": "wa_menu_globalmessage_send",

  "invite.opened": "wa-opened-invite",
  "invite.sent": {
    on: "inviteType",
    byValue: { copy_link: "wa_menu_invite_copylink" },
  },
  "invite.walk_link_option_changed": "wa_menu_invite_copylink_walk",

  "map_editor.application.opened": "wa_map-editor_open_application",
  "map_editor.application_picker.opened": "wa_map-editor_open_picker",
  "map_editor.closed": "wa_mapeditor_close",
  "map_editor.opened": "wa_mapeditor_open",
  "map_editor.property.added": "wa_map-editor_add_property",
  "map_editor.property.clicked": "wa_map-editor_click_property",
  "map_editor.property.removed": "wa_map-editor_remove_property",
  "map_editor.tool.opened": "wa_map-editor_open_tool",

  "map_explorer.center_to_user_clicked": "wa_click_center_to_user",
  "map_explorer.closed": "wa_map-exploration-close",
  "map_explorer.filtered": "wa_filter_in_map_explorer",
  "map_explorer.opened": "wa_map-exploration-open",
  "map_explorer.top_button_clicked": "wa_click_top_open_map_explorer",
  "map_explorer.zoom_in_clicked": "wa_click_to_zoom_in",
  "map_explorer.zoom_out_clicked": "wa_click_to_zoom_out",

  "media.camera.toggled": "wa_camera",
  "media.connection_retry": {
    on: "meetingProvider",
    byValue: {
      webrtc: "wa_retry_connection_webrtc",
      livekit: "wa_retry_connection_livekit",
    },
  },
  "media.microphone.toggled": "wa_microphone",
  "media.turn_test.failed": "wa_turn_test_failure",
  "media.turn_test.succeeded": "wa_turn_test_success",
  "media.turn_test.timeout": "wa_turn_test_timeout",
  "media.video_stream_missing": "wa_no_video_stream_received",

  "meeting.actions.opened": "wa_more_meeting_action",
  "meeting.area_entered": {
    on: "meetingProvider",
    byValue: { jitsi: "wa-entered-jitsi" },
    whenAbsent: "wa-entered-meeting-room",
  },
  "meeting.camera_layout_resized": "wa_resize_camera_layout",
  "meeting.layout_changed": "wa_layout_present",
  "meeting.microphone.muted": "wa_mute_microphone_meeting_action",
  "meeting.microphone.muted_for_everybody":
    "wa_mute_microphone_everybody_meeting_action",
  "meeting.participant.kicked": "wa_kickoff_meeting_action",
  "meeting.participant.pinned": "wa_pin_meeting_action",
  "meeting.picture_in_picture.toggled": "wa_click_picture_in_picture",
  "meeting.private_message.clicked": "wa_send_private_message_meeting_action",
  "meeting.report.clicked": "wa_report_meeting_action",
  "meeting.screenshare.toggled": "wa-screensharing",
  "meeting.video.muted": "wa_mute_video_meeting_action",
  "meeting.video.muted_for_everybody": "wa_mute_video_everybody_meeting_action",

  "megaphone.opened": "wa_action_megaphone",

  "menu.chat.opened": "wa_menu_chat",
  "menu.contact.opened": "wa_menu_contact",
  "menu.credit.opened": "wa_menu_credit",
  "menu.custom.opened": "wa_menu_custom",
  "menu.opened": "wa-opened-menu",
  "menu.shortcuts.opened": "wa_menu_shortcuts",

  "onboarding.companion_selected": "wa_companionscene_select",
  "onboarding.custom_woka_selected": "wa_wokascene_custom",
  "onboarding.name_validated": "wa-name-validation",
  "onboarding.video_validated": "wa-video-validation",
  "onboarding.woka_selected": "wa_wokascene_select",
  "onboarding.woka_validated": "wa-woka-validation",

  "personal_desk.entered": "wa_go_to_personal_desk",
  "personal_desk.unclaimed": "wa_unclaim_personal_desk",

  "popup.opened": "wa_opened_popup",

  "profile.camera_edit_opened": "wa_edit_camera",
  "profile.companion_edit_opened": "wa_edit_companion",
  "profile.name_edit_opened": "wa_edit_name",
  "profile.opened": {
    on: "source",
    byValue: { menu: "wa_menu_profile", profile_button: "wa_open_profile_menu" },
  },
  "profile.woka_edit_opened": "wa_edit_woka",

  "pwa.continue_in_browser_clicked": "wa_pwa_continue_in_browser_click",
  "pwa.install_clicked": "wa_pwa_install_click",
  "pwa.install_from_profile_menu_clicked":
    "wa_pwa_install_from_profile_menu_click",
  "pwa.install_outcome": "wa_pwa_install_outcome",
  "pwa.install_prompt_shown": "wa_pwa_install_prompt_shown",

  "recording.list_opened": "wa_opened_recording_list",
  "recording.started": "wa_recording_start",
  "recording.stopped": "wa_recording_stop",

  "room.visited": "$pageView",

  "room_list.opened": "wa-opened-room-list",

  "scripting.website_opened": "wa_opened_website",

  "settings.ask_website.changed": "wa_setting_ask_website",
  "settings.audio_volume.opened": "wa_setting_audio_volume",
  "settings.background.changed": "wa_setting_background",
  "settings.background.opened": "wa_open_background_settings",
  "settings.camera.changed": "wa_setting_camera",
  "settings.camera.selected": "wa_select_camera",
  "settings.decrease_audio_volume.changed": "wa_setting_decrease_audio_volume",
  "settings.fullscreen.changed": "wa_setting_fullscreen",
  "settings.microphone.changed": "wa_setting_microphone",
  "settings.microphone.selected": "wa_select_microphone",
  "settings.notification.changed": "wa_setting_notification",
  "settings.opened": "wa_menu_setting",
  "settings.picture_in_picture.changed": "wa_setting_picture_in_picture",
  "settings.request_follow.changed": "wa_setting_request_follow",
  "settings.speaker.selected": "wa_select_speaker",

  "user.business_card.opened": "wa_show_business_card",
  "user.follow_requested": "wa_follow",
  "user.go_to_clicked": "wa_go_to_user",
  "user.report.clicked": "wa_report_user",
  "user.woka_menu.opened": "wa_open_woka_menu",

  "user_list.opened": "wa_open_user_list",
};

/**
 * The PostHog name for one reported event, or undefined when it has none.
 *
 * Takes the properties, not just the name, because for the discriminated entries
 * that is where the answer lives — see PostHogEventKey. Callers pass what they were
 * going to send anyway, so no site has to know which shape its event uses.
 */
export function postHogEventKey(
  eventName: AnalyticsEventName,
  properties: Record<string, unknown>,
): string | undefined {
  const key = POSTHOG_EVENT_KEYS[eventName];
  if (key === undefined || typeof key === "string") {
    return key;
  }

  const discriminator = properties[key.on];
  return discriminator === undefined
    ? key.whenAbsent
    : key.byValue[String(discriminator)];
}
