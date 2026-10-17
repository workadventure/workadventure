//! The queries of a player (queryMessage), answered with the query's id.

use super::*;

impl Logic {
    pub(super) async fn query(&mut self, query: pb::QueryMessage) {
        use pb::answer_message::Answer as A;
        use pb::query_message::Query as Q;
        let session = self.parts_session.clone();
        let id = query.id;
        let Some(q) = query.query else {
            session.push(wire::answer_error(id, "Empty query"));
            return;
        };
        if let Some(admin) = self.app.admin.clone().filter(|a| crate::admin_queries::handles(&q, a)) {
            tokio::spawn(async move {
                session.push(match crate::admin_queries::answer(&admin, &session.info, q).await {
                    Ok(a) => wire::answer(id, a),
                    Err(e) => wire::answer_error(id, e),
                });
            });
            return;
        }
        if let Q::BanIpPreviewQuery(preview) = q {
            let app = self.app.clone();
            tokio::spawn(async move {
                let info = &session.info;
                if !info.tags.iter().any(|t| t == "admin") {
                    session.push(wire::answer_error(id, "Only an admin of the world can preview a ban"));
                    return;
                }
                let Some(users) = crate::room_actor::world_users(&app, &info.world).await else {
                    session.push(wire::answer_error(id, "A room did not answer"));
                    return;
                };
                let ip = users
                    .iter()
                    .find(|u| u.uuid == preview.ban_user_uuid)
                    .map(|u| u.ip.clone())
                    .filter(|ip| !ip.is_empty());
                let answer = match ip {
                    None => pb::BanIpPreviewAnswer { ip_known: false, includes_moderator: false, users: vec![] },
                    Some(ip) => pb::BanIpPreviewAnswer {
                        ip_known: true,
                        includes_moderator: ip == info.ip_address,
                        users: users
                            .into_iter()
                            .filter(|u| u.ip == ip && u.uuid != preview.ban_user_uuid && u.uuid != info.user_uuid)
                            .map(|u| pb::BanIpPreviewUser { name: u.name })
                            .collect(),
                    },
                };
                session.push(wire::answer(id, A::BanIpPreviewAnswer(answer)));
            });
            return;
        }
        let answer = match q {
            Q::IceServersQuery(_) => match session.user_id() {
                Some(user) => A::IceServersAnswer(pb::IceServersAnswer {
                    ice_servers: local_admin::ice_servers(&self.app.config, user),
                }),
                None => {
                    session.push(wire::answer_error(id, "Not joined yet"));
                    return;
                }
            },
            Q::JoinSpaceQuery(join) => {
                let Some(space_user_id) = session.space_user_id() else {
                    session.push(wire::answer_error(id, "Space user id not found"));
                    return;
                };
                let filter = match join.filter_type {
                    0 => FilterType::AllUsers,
                    1 => FilterType::LiveStreamingUsers,
                    2 => FilterType::LiveStreamingUsersWithFeedback,
                    _ => {
                        session.push(wire::answer_error(id, "Unknown filter type"));
                        return;
                    }
                };
                let space = space_actor::get_or_spawn(&self.app, &self.world_key(&join.space_name), &join.space_name);
                let user = self.space_user(space_user_id);
                // The space answers, then sends what follows the answer.
                let _ = space
                    .send(SpaceCmd::Join {
                        session,
                        user,
                        filter,
                        properties_to_sync: join.properties_to_sync,
                        query_id: id,
                    })
                    .await;
                self.recent_joins.retain(|_, (_, at)| at.elapsed() < ABORT_WINDOW);
                self.recent_joins.insert(id, (join.space_name.clone(), Instant::now()));
                self.spaces.insert(join.space_name, space);
                return;
            }
            Q::LeaveSpaceQuery(leave) => {
                if let (Some(space), Some(user)) = (self.spaces.remove(&leave.space_name), session.space_user_id()) {
                    let _ = space.send(SpaceCmd::Leave { session, id: user, query_id: Some(id) }).await;
                    return;
                }
                A::LeaveSpaceAnswer(pb::LeaveSpaceAnswer {})
            }
            Q::SpaceStateQuery(state) => {
                use pb::space_state_query::Query as S;
                let recording = matches!(
                    state.query.as_ref().and_then(|q| q.query.as_ref()),
                    Some(S::StartRecording(_) | S::StopRecording(_))
                );
                if recording && !session.info.can_record {
                    session.push(wire::answer_error(id, "You are not allowed to record"));
                    return;
                }
                if let (Some(space), Some(user)) = (self.spaces.get(&state.space_name), session.space_user_id()) {
                    let _ = space
                        .send(SpaceCmd::StateQuery {
                            session,
                            id: user,
                            query_id: id,
                            query: state.query.and_then(|q| q.query),
                        })
                        .await;
                    return;
                }
                session.push(wire::answer_error(id, "You are not part of this space"));
                return;
            }
            Q::SendEventQuery(e) => {
                self.to_room(RoomCmd::Event {
                    sender: session.user_id(),
                    name: e.name,
                    data: e.data,
                    targets: e.target_user_ids,
                })
                .await;
                A::SendEventAnswer(pb::SendEventAnswer {})
            }
            Q::RoomTagsQuery(_) => A::RoomTagsAnswer(pb::RoomTagsAnswer::default()),
            Q::SearchTagsQuery(_) => A::SearchTagsAnswer(pb::SearchTagsAnswer::default()),
            Q::ChatMembersQuery(_) => A::ChatMembersAnswer(pb::ChatMembersAnswer::default()),
            Q::GetRecordingsQuery(_)
            | Q::GetRecordingThumbnailsQuery(_)
            | Q::DeleteRecordingQuery(_)
            | Q::GetSignedUrlQuery(_) => {
                // S3 calls: off the message loop, the answer pushed when it comes.
                let (app, session, uuid) = (self.app.clone(), session.clone(), session.info.user_uuid.clone());
                tokio::spawn(async move {
                    let bucket = crate::s3::Bucket::from_config(&app.config);
                    let answer: Result<A, String> = match (q, bucket) {
                        (Q::GetRecordingsQuery(_), Some(b)) => crate::recordings::list(&b, &uuid)
                            .await
                            .map(|recordings| A::GetRecordingsAnswer(pb::GetRecordingsAnswer { recordings })),
                        (Q::GetRecordingThumbnailsQuery(t), Some(b)) => {
                            crate::recordings::thumbnails(&b, &uuid, &t.base_filename)
                                .await
                                .map(|urls| A::GetRecordingThumbnailsAnswer(pb::GetRecordingThumbnailsAnswer { urls }))
                        }
                        (Q::DeleteRecordingQuery(d), Some(b)) => {
                            let success = crate::recordings::delete(&b, &uuid, &d.recording_id).await;
                            Ok(A::DeleteRecordingAnswer(pb::DeleteRecordingAnswer { success, error_message: None }))
                        }
                        (Q::GetSignedUrlQuery(g), Some(b)) => crate::recordings::signed_url(&b, &uuid, &g.key)
                            .await
                            .map(|signed_url| A::GetSignedUrlAnswer(pb::GetSignedUrlAnswer { signed_url })),
                        // No bucket: empty lists, as the pusher answers.
                        (Q::GetRecordingsQuery(_), None) => {
                            Ok(A::GetRecordingsAnswer(pb::GetRecordingsAnswer::default()))
                        }
                        (Q::GetRecordingThumbnailsQuery(_), None) => {
                            Ok(A::GetRecordingThumbnailsAnswer(pb::GetRecordingThumbnailsAnswer::default()))
                        }
                        (Q::DeleteRecordingQuery(_), None) => Ok(A::DeleteRecordingAnswer(pb::DeleteRecordingAnswer {
                            success: false,
                            error_message: None,
                        })),
                        _ => Err("Recording storage is not configured".into()),
                    };
                    session.push(match answer {
                        Ok(a) => wire::answer(id, a),
                        Err(e) => {
                            tracing::warn!(error = %e, "recording query failed");
                            wire::answer_error(id, e)
                        }
                    });
                });
                return;
            }
            // Asking the site takes up to 5 s: not on this session's message loop.
            Q::EmbeddableWebsiteQuery(q) => {
                let config = self.app.config.clone();
                tokio::spawn(async move {
                    let whitelist = config.raw.get("EMBEDDED_DOMAINS_WHITELIST").cloned().unwrap_or_default();
                    let answer = crate::embed::check(q.url, &whitelist, &config.front_url).await;
                    session.push(wire::answer(id, A::EmbeddableWebsiteAnswer(answer)));
                });
                return;
            }
            // LocalAdmin.getUrlRoomsFromSameWorld: the maps of the map-storage, for a map-storage room.
            Q::RoomsFromSameWorldQuery(_) => {
                if crate::local_admin::wam_path(&self.parts_session.info.room_id).is_none() {
                    session.push(wire::answer_error(id, "No admin backoffice set!"));
                    return;
                }
                let base = self.app.config.raw.get("PUBLIC_MAP_STORAGE_URL").cloned().unwrap_or_default();
                let base = base.trim_end_matches('/');
                let text = |v: &serde_json::Value| v.as_str().map(str::to_owned);
                let rooms = self.app.storage.wam_list().await.into_iter().map(|(path, entry)| {
                    let m = &entry["metadata"];
                    pb::RoomShortDescription {
                        name: text(&m["name"]).unwrap_or_else(|| path.clone()),
                        room_url: format!("/~/{path}"),
                        wam_url: Some(format!("{base}/{path}")),
                        description: text(&m["description"]),
                        copyright: text(&m["copyright"]),
                        thumbnail: text(&m["thumbnail"]),
                        areas_searchable: m["areasSearchable"].as_i64().map(|n| n as i32),
                        entities_searchable: m["entitiesSearchable"].as_i64().map(|n| n as i32),
                    }
                });
                A::RoomsFromSameWorldAnswer(pb::RoomsFromSameWorldAnswer { room_descriptions: rooms.collect() })
            }
            // The token map-storage asks for a private file (pusher handleMapStorageJwtQuery): valid 1 h.
            Q::MapStorageJwtQuery(_) => {
                let info = &self.parts_session.info;
                let wam_url = match &self.app.admin {
                    // The admin's map details (A2); empty for a redirection or an error.
                    Some(admin) => admin.map_details(&info.room_id, None, None).await["wamUrl"]
                        .as_str()
                        .unwrap_or_default()
                        .to_owned(),
                    None => {
                        let base = self.app.config.raw.get("PUBLIC_MAP_STORAGE_URL").cloned().unwrap_or_default();
                        crate::local_admin::wam_path(&info.room_id)
                            .map_or_else(String::new, |rest| format!("{base}/{rest}"))
                    }
                };
                let claims =
                    serde_json::json!({"wamUrl": wam_url, "tags": info.tags, "exp": crate::jwt::now_secs() + 3600});
                A::MapStorageJwtAnswer(pb::MapStorageJwtAnswer {
                    jwt: crate::jwt::sign(&self.app.config.secret_key, &claims),
                })
            }
            Q::GetMemberQuery(_) => {
                session.push(wire::answer_error(id, "User not found, probably left"));
                return;
            }
            _ => {
                session.push(wire::answer_error(id, "Not supported by this server yet"));
                return;
            }
        };
        session.push(wire::answer(id, answer));
    }
}
