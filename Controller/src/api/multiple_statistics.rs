use std::sync::Arc;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{Json, IntoResponse, Response};
use crate::AppState;

/// Method called on GET /multiple_statistics
/// Returns the current list of statistics
pub async fn multiple_statistics(State(state): State<Arc<AppState>>) -> Response {
    let collected_statistics = state.collected_statistics.lock().await;
    (StatusCode::OK, Json(collected_statistics.clone())).into_response()
}

/// Method called on GET /multiple_time_statistics
/// Returns the current list of time-statistics
pub async fn multiple_time_statistics(State(state): State<Arc<AppState>>) -> Response {
    let collected_time_statistics = state.collected_time_statistics.lock().await;
    (StatusCode::OK, Json(collected_time_statistics.clone())).into_response()
}
