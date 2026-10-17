//! Room and area variables, and the events of the scripting API.

use super::*;

impl RoomActor {
    pub(super) async fn variables(&mut self, cmd: RoomCmd) {
        match cmd {
            RoomCmd::SetAreaVariable { session, variable: v } => {
                let Some(wam) = self.map.as_ref().and_then(|m| m.wam.as_ref()) else { return };
                // A refusal is silent, as on the back.
                if areas::may_set(wam.areas(), &v.area_id, &v.property_id, &session.info.tags)
                    && self.variables.set(&v.area_id, &v.property_id, &v.key, &v.value)
                {
                    Fanout::new(&mut self.sessions)
                        .each_all(&variable_frame((v.area_id, v.property_id, v.key), v.value));
                }
            }
            RoomCmd::Event { sender, name, data, targets } => {
                self.event_listeners.send(&name, (data.clone(), sender));
                let frame = wire::sub(pb::sub_message::Message::ReceivedEventMessage(pb::ReceivedEventMessage {
                    name,
                    data,
                    sender_id: sender,
                }));
                let out = Fanout::new(&mut self.sessions);
                if targets.is_empty() {
                    out.each_all(&frame);
                } else {
                    out.each(&targets, &frame);
                }
            }
            RoomCmd::Variable { session, name, value } => {
                if !self.map_reload.is_empty() {
                    self.retries.push((session, name, value));
                    return;
                }
                let Err(e) = set_variable(
                    &mut self.room_vars,
                    &self.app,
                    &self.url,
                    &self.sessions,
                    &mut self.var_listeners,
                    player(&self.room, &session),
                    &name,
                    &value,
                ) else {
                    return;
                };
                if self.vars_loaded.elapsed() < std::time::Duration::from_secs(10) {
                    tracing::error!(%self.url, %name, "a variable was refused, and the self.map was read less than 10 seconds ago");
                    refuse(&session, &e);
                    return;
                }
                tracing::warn!(%self.url, %name, "a variable was refused: reading the self.map again");
                self.vars_loaded = std::time::Instant::now();
                self.retries.push((session, name, value));
                let (app2, url2) = (self.app.clone(), self.url.clone());
                let wam = self.map.as_ref().and_then(|m| Some((m.rel.clone(), m.wam.clone()?)));
                self.map_reload.spawn(async move {
                    room_map::variable_defs(&app2, &url2, wam.as_ref().map(|(rel, wam)| (rel.as_str(), wam))).await
                });
            }
            _ => {}
        }
    }
}
