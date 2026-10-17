//! Analytics of the connection: its context, its intervals, the reports of the front.

use super::*;
use pb::client_to_server_message::Message as M;

impl Logic {
    /// The connection's analytics context, once the room has given the user an id.
    fn analytics(&self) -> Option<(std::sync::Arc<crate::analytics::Analytics>, crate::analytics::Context<'_>)> {
        let session = &self.parts_session;
        let a = self.app.analytics.clone()?;
        let space_user_id = session.space_user_id()?;
        Some((a, crate::analytics::Context { info: &session.info, user_id: session.user_id(), space_user_id }))
    }

    /// Opens the connection's session as soon as the user joined (the pusher does on roomJoined).
    pub(super) fn analytics_connected(&mut self) {
        let Some(at) = self.parts_session.joined_at() else { return };
        let mut timed = self.timed.take();
        if let (Some(t), Some((a, ctx))) = (&mut timed, self.analytics()) {
            t.connected(&a, &ctx, at);
        }
        self.timed = timed;
    }

    pub(super) fn end_intervals(&mut self, reason: &str) {
        self.analytics_connected();
        if let (Some(mut t), Some((a, ctx))) = (self.timed.take(), self.analytics()) {
            t.close_all(&a, &ctx, reason);
        }
    }

    pub(super) fn analytics_message(&mut self, message: M) {
        match message {
            M::AnalyticsEventReportMessage(report) => {
                let mut timed = self.timed.take();
                if let (Some(t), Some((a, ctx))) = (&mut timed, self.analytics()) {
                    t.report(&a, &ctx, report);
                }
                self.timed = timed;
            }
            M::VideoQualityReportMessage(report) => {
                if let Some((a, ctx)) = self.analytics() {
                    a.video_quality(&ctx, report, |space| self.spaces.contains_key(space));
                }
            }
            _ => {}
        }
    }
}
