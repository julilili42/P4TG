use std::sync::Arc;
use std::thread;
use std::time::Duration;
use axum::debug_handler;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Json, Response};
use serde::{Serialize, Deserialize};
use crate::api::server::Error;
use crate::AppState;
use crate::core::traffic_gen_core::types::*;
use crate::api::traffic_gen::{configure_traffic_gen, stop_traffic_gen};
use crate::api::statistics::{Statistics, statistics};
use axum::body::{self};
use log::info;



#[derive(Serialize, Deserialize, Clone)]
pub struct TrafficGenList {
    pub traffic_generations: Vec<TrafficGenData>,
    pub durations: Vec<u64>
} 

#[debug_handler]
pub async fn configure_multiple_traffic_gen(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenList>) -> Response {
    if payload.traffic_generations.len() != payload.durations.len() {
        return (StatusCode::BAD_REQUEST, Json(Error::new("Each TrafficGenData must have a corresponding duration."))).into_response();
    }

    info!("Starting multiple traffic generations");

    // Klonen des States und Payloads für den Thread
    let state_clone = Arc::clone(&state);
    let payload_clone = payload.clone();

    // Statistik-Speicher zurücksetzen
    {
        let mut collected_statistics = state_clone.collected_statistics.lock().await;
        collected_statistics.clear();
    }

    // Starten eines neuen Threads zur Durchführung der Tests
    thread::spawn(move || {
        // Erstellen einer neuen Tokio-Laufzeit, um async-Code im Thread auszuführen
        tokio::runtime::Runtime::new().unwrap().block_on(async move {
            // Iterieren über die Traffic-Generationen und deren Dauer
            for (i, (tg_data, duration)) in payload_clone.traffic_generations.iter().zip(payload_clone.durations.iter()).enumerate() {
                info!("Starting test {} with duration {} seconds", i + 1, duration);

                let configure_response = configure_traffic_gen(State(Arc::clone(&state_clone)), Json(tg_data.clone())).await;

                if configure_response.status() != StatusCode::OK {
                    eprintln!("Failed to configure traffic generation: {:?}", configure_response);
                    return;
                }

                tokio::time::sleep(Duration::from_secs(*duration)).await;

                let stop_response = stop_traffic_gen(State(Arc::clone(&state_clone))).await;

                if stop_response.status() != StatusCode::OK {
                    eprintln!("Failed to stop traffic generation: {:?}", stop_response);
                    return;
                }
                
                let stats_response = statistics(State(Arc::clone(&state_clone))).await;
                if let Ok(stats) = parse_stats_response(stats_response).await {
                    let test_result = TestResult {
                        test_number: i + 1,
                        duration: *duration,
                        statistics: stats,
                    };

                    // Hinzufügen der gesammelten Statistiken zur globalen Speicherstruktur
                    state_clone.collected_statistics.lock().await.push(test_result.clone());
                } else {
                    println!("Failed to retrieve statistics for test {}", i + 1);
                }
            }
        });
    });


    StatusCode::OK.into_response()
}


async fn parse_stats_response(stats_response: Response<axum::body::Body>) -> Result<Statistics, serde_json::Error> {
    let body_bytes = body::to_bytes(stats_response.into_body(), 1024 * 1024).await.unwrap();
    serde_json::from_slice(&body_bytes)
}

pub async fn get_collected_statistics(State(state): State<Arc<AppState>>) -> Response {
    let collected_statistics = state.collected_statistics.lock().await;
    (StatusCode::OK, Json(collected_statistics.clone())).into_response()
}