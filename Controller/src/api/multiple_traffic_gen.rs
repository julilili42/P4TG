use std::sync::Arc;
use std::thread;
use std::time::Duration;
use axum::debug_handler;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Json, Response};
use crate::api::helper::validate::validate_request;
use std::time::SystemTime;
use crate::api::server::Error;
use crate::AppState;
use crate::core::traffic_gen_core::types::*;
use crate::api::traffic_gen::stop_traffic_gen;
use crate::api::statistics::{Statistics, statistics, time_statistics};
use axum::extract::Query;
use crate::core::statistics::TimeStatistic;
use axum::body::{self};
use log::info;

/// Method called on POST /multiple_trafficgen
/// Starts the tests of multiple traffic generations with the specified settings and durations in the POST body
#[debug_handler]
pub async fn configure_multiple_traffic_gen(State(state): State<Arc<AppState>>, Json(payload): Json<MultipleTrafficGen>) -> Response {
    if !validate_payload(&payload) {
        return (StatusCode::BAD_REQUEST, Json(Error::new("Each TrafficGenData must have a corresponding duration."))).into_response();
    }

    info!("Starting multiple traffic generations");

    let state_clone = Arc::clone(&state);
    let payload_clone = payload.clone();

    // Reset of statistics and traffic_generators in Appstate 
    {
        let mut collected_statistics = state_clone.collected_statistics.lock().await;
        collected_statistics.clear();

        let mut collected_time_statistics = state_clone.collected_time_statistics.lock().await; 
        collected_time_statistics.clear();

        let mut multiple_traffic_generators = state_clone.multiple_traffic_generators.lock().await;
        multiple_traffic_generators.clear(); 
        multiple_traffic_generators.push(payload_clone.clone());
    }


    thread::spawn(move || {
        tokio::runtime::Runtime::new().unwrap().block_on(async move {
            // Iterate over all traffic_generations and their durations, which were included in the payload
            for (i, (tg_data, duration)) in payload_clone.traffic_generations.iter().zip(payload_clone.durations.iter()).enumerate() {

                info!("Starting test {} with duration {:?} seconds", i + 1, duration);

                let mut test_completed = true;
            // Starting the traffic generation
                let configure_response = start_traffic_gen(State(Arc::clone(&state_clone)), Json(tg_data.clone())).await;

                if configure_response.status() != StatusCode::OK {
                    eprintln!("Failed to configure traffic generation: {:?}", configure_response);
                    return;
                }
            
            // Check if user wants to skip a traffic generation
                match duration {
                    Some(d) => {
                        for _ in 0..*d {
                            {
                                let experiment = state_clone.experiment.lock().await;
                                if !experiment.running {
                                    info!("Skipping test {}", i + 1);
                                    test_completed = false;
                                    break;
                                }
                            }
                            tokio::time::sleep(Duration::from_secs(1)).await;
                        }
                    },
                    None => {
                        loop {
                            {
                                let experiment = state_clone.experiment.lock().await;
                                if !experiment.running {
                                    info!("Ending single test");
                                    test_completed = true;
                                    break;
                                }
                            }
                            tokio::time::sleep(Duration::from_secs(1)).await;
                        }
                    }
                }
                
                let stop_response = stop_traffic_gen(State(Arc::clone(&state_clone))).await;

                if stop_response.status() != StatusCode::OK {
                    // change
                    eprintln!("Failed to stop traffic generation: {:?}", stop_response);
                    return;
                }
                
                // Using statistics endpoint to retrieve the statistics of the current test
                let stats_response = statistics(State(Arc::clone(&state_clone))).await;
                if let Ok(stats) = parse_stats_response(stats_response).await {
                    let test_result = MultipleStatistics {
                        test_number: i + 1,
                        completed: test_completed,
                        duration: duration.unwrap_or(u64::MAX),
                        statistics: stats,
                    };

                // Storing the statistics in the AppState
                    state_clone.collected_statistics.lock().await.push(test_result.clone());
                } else {
                    println!("Failed to retrieve statistics for test {}", i + 1);
                }

                // Using time_statistics endpoint to retrieve the statistics of the current test
                let time_stats_response = time_statistics(State(Arc::clone(&state_clone)), Query(Default::default())).await;
                if let Ok(time_stats) = parse_time_stats_response(time_stats_response).await {
                let time_statistics_result = MultipleTimeStatistics {
                    test_number: i + 1,
                    completed: test_completed,
                    duration: duration.unwrap_or(u64::MAX),
                    time_statistics: time_stats,
                };

                // Storing the time_statistics in the AppState
                state_clone.collected_time_statistics.lock().await.push(time_statistics_result);
            } else {
                println!("Failed to retrieve time statistics for test {}", i + 1);
            }
            }

        });
    });


    StatusCode::OK.into_response()
}



/// Method called on GET /multiple_trafficgen
/// Returns a list of currently configured traffic generations
#[debug_handler]
pub async fn multiple_traffic_gen(State(state): State<Arc<AppState>>) -> Response {
    let configs = state.multiple_traffic_generators.lock().await;
    (StatusCode::OK, Json(configs.clone())).into_response()
}







// Extracts the HTTP Response body of the statistics endpoint
async fn parse_stats_response(stats_response: Response<axum::body::Body>) -> Result<Statistics, serde_json::Error> {
    let body_bytes = body::to_bytes(stats_response.into_body(), 1024 * 1024).await.unwrap();
    serde_json::from_slice(&body_bytes)
}

// Extracts the HTTP Response body of the time_statistics endpoint
async fn parse_time_stats_response(time_stats_response: Response<axum::body::Body>) -> Result<TimeStatistic, serde_json::Error> {
    let body_bytes = axum::body::to_bytes(time_stats_response.into_body(), 1024 * 1024).await.unwrap();
    serde_json::from_slice(&body_bytes)
}

// Checks Payload if the format is correct 
fn validate_payload(payload: &MultipleTrafficGen) -> bool {
    if payload.traffic_generations.len() != payload.durations.len() {
        return false;
    }

    for duration in &payload.durations {
        match duration {
            Some(d) if *d > 0 => continue,
            None => continue,
            _ => return false,
        }
    }

    true
}

// Starts single traffic generation
async fn start_traffic_gen(State(state): State<Arc<AppState>>, payload: Json<TrafficGenData>) -> Response {
    let tg = &mut state.traffic_generator.lock().await;

    // contains the description of the stream, i.e., packet size and rate
    // only look at active stream settings
    let active_stream_settings: Vec<StreamSetting> = payload.stream_settings.clone().into_iter().filter(|s| s.active).collect();
    let active_stream_ids: Vec<u8> = active_stream_settings.iter().map(|s| s.stream_id).collect();
    let active_streams: Vec<Stream> = payload.streams.clone().into_iter().filter(|s| active_stream_ids.contains(&s.stream_id)).collect();

    // Poisson traffic is only allowed to have a single stream
    if payload.mode == GenerationMode::Poisson && active_streams.len() != 1 {
        return (StatusCode::BAD_REQUEST, Json(Error::new("Poisson generation mode only allows for one stream."))).into_response()
    }

    // no streams should be generated in monitor/analyze mode
    if payload.mode == GenerationMode::Analyze && !active_streams.is_empty() {
        return (StatusCode::BAD_REQUEST, Json(Error::new("No stream definition in analyze mode allowed."))).into_response();
    }

    // contains the mapping of Send->Receive ports
    // required for analyze mode
    let port_mapping = &payload.port_tx_rx_mapping;

    // validate request
    match validate_request(&active_streams, &active_stream_settings, &payload.mode) {
        Ok(_) => {},
        Err(e) => return (StatusCode::BAD_REQUEST, Json(e)).into_response()
    }

    match tg.start_traffic_generation(&state, active_streams, payload.mode, active_stream_settings, port_mapping).await {
        Ok(streams) => {
            // store the settings for synchronization between multiple
            // GUI clients
            tg.port_mapping = payload.port_tx_rx_mapping.clone();
            tg.stream_settings = payload.stream_settings.clone();
            tg.streams = payload.streams.clone();
            tg.mode = payload.mode;

            // experiment starts now
            // these values are used to show how long the experiment is running at the GUI
            state.experiment.lock().await.start = SystemTime::now();
            state.experiment.lock().await.running = true;

            info!("Traffic generation started.");
            (StatusCode::OK, Json(streams)).into_response()
        }
        Err(err) => (StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("{:#?}", err)))).into_response()
    }
}
