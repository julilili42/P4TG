use crate::core::traffic_gen_core::types::*;
use crate::api::multiple_traffic_gen::{start_traffic_gen_with_duration, create_and_store_abort_sender, abort_current_test, save_statistics, parse_response};
use crate::api::traffic_gen::stop_traffic_gen;
use crate::api::statistics::{Statistics, statistics};

use std::sync::Arc;
use log::{error, info};
use axum::extract::State;
use axum::http::StatusCode;
use crate::AppState;
use axum::response::{IntoResponse, Json, Response};
use serde::Deserialize;
use crate::api::server::Error;

#[derive(Clone, Debug, Deserialize)]
pub struct TestRequest {
    pub test_id: u8,
    pub payload: TrafficGenData,
}
/// Method called on GET /profiles
pub async fn get_test_results(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let test_results = state.multi_test_state.test_results.lock().await;
    Json(test_results.clone()).into_response()
}
/// Method called on POST /profiles
pub async fn run_tests(State(state): State<Arc<AppState>>, Json(request): Json<TestRequest>) -> Response {
    // Reset results before starting tests
    reset_results(Arc::clone(&state)).await;

    // Abort any currently running test
    abort_current_test(Arc::clone(&state)).await;
    
    let state_clone = Arc::clone(&state);
    let payload = request.payload.clone();
    
    // Clear collected statistics and traffic generators
   reset_collected_statistics(Arc::clone(&state)).await;
 
    tokio::spawn(async move {
        if request.test_id == 0 {
            // Run all tests
            if run_all_tests_inner(state_clone, payload).await.is_err() {
                set_running_flag(&state, false).await;
            }
        } else {
            // Run a specific test
            if run_single_test(state_clone, request.test_id, payload).await.is_err() {
                set_running_flag(&state, false).await;
            }
        }
    });


    // Return an immediate response to the client
    StatusCode::OK.into_response()
}

/// Method called on DELETE /profiles

pub async fn abort_test_profile(State(state): State<Arc<AppState>>) -> Response {
    info!("Abort RFC2544 test profile");
    
    abort_current_test(Arc::clone(&state)).await;

    stop_traffic_gen(State(Arc::clone(&state))).await;

    (StatusCode::OK, Json("RFC2544 aborted")).into_response()
}




async fn run_all_tests_inner(state: Arc<AppState>, payload: TrafficGenData) -> Result<(), ()> {
    // Set the running flag to true
    set_running_flag(&state, true).await;

    // Run all tests sequentially
    if run_throughput_test(Arc::clone(&state), payload.clone()).await.is_err() {
        return Err(());
    }
    if run_latency_test(Arc::clone(&state), payload.clone()).await.is_err() {
        return Err(());
    }
    if run_frame_loss_rate_test(Arc::clone(&state), payload.clone()).await.is_err() {
        return Err(());
    }
    if run_back_to_back_test(Arc::clone(&state), payload).await.is_err() {
        return Err(());
    }


    // Set the running flag to false
    set_running_flag(&state, false).await;
    Ok(())
}

async fn run_single_test(state: Arc<AppState>, test_id: u8, payload: TrafficGenData) -> Result<(), ()> {
    // Set the running flag to true
    set_running_flag(&state, true).await;

    let result = match test_id {
        1 => run_throughput_test(Arc::clone(&state), payload).await,
        2 => run_latency_test(Arc::clone(&state), payload).await,
        3 => run_frame_loss_rate_test(Arc::clone(&state), payload).await,
        4 => run_back_to_back_test(Arc::clone(&state), payload).await,
        _ => Err(()),
    };

    // Set the running flag to false
    set_running_flag(&state, false).await;

    result
}

async fn run_throughput_test(state: Arc<AppState>, payload: TrafficGenData) -> Result<(), ()> {
    info!("Starting throughput test");
    let result = throughput_test(State(Arc::clone(&state)), Json(payload)).await;
    handle_test_result(result, "Throughput").await
}

async fn run_latency_test(state: Arc<AppState>, payload: TrafficGenData) -> Result<(), ()> {
    info!("Starting latency test");
    let result = latency_test(State(Arc::clone(&state)), Json(payload)).await;
    handle_test_result(result, "Latency").await
}

async fn run_frame_loss_rate_test(state: Arc<AppState>, payload: TrafficGenData) -> Result<(), ()> {
    info!("Starting frame loss rate test");
    let result = frame_loss_rate_test(State(Arc::clone(&state)), Json(payload)).await;
    handle_test_result(result, "Frame Loss Rate").await
}

async fn run_back_to_back_test(state: Arc<AppState>, payload: TrafficGenData) -> Result<(), ()> {
    info!("Starting back-to-back test");
    let result = back_to_back_test(State(Arc::clone(&state)), Json(payload)).await;
    handle_test_result(result, "Back-to-back frames").await
}

pub async fn throughput_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f32>), Response> {
    abort_current_test(Arc::clone(&state)).await;
    info!("Starting traffic generation up to 10 times with 10 seconds each");

    save_tg(Arc::clone(&state), payload.clone(), "Throughput".to_string()).await;

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;
    let initial_tx_rate: Vec<f32> = payload.streams.iter().map(|s| s.traffic_rate).collect();
    let mut test_payload = payload.clone();
    let mut max_successful_rate = 0.0;

    for i in 0..10 {
        match start_traffic_gen_with_duration(Arc::clone(&state), test_payload.clone(), i, Some(10.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);

                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_packet_loss: u64 = stats.packet_loss.values().sum();
                    info!("Test {}: Total packet loss: {}", i + 1, total_packet_loss);

                    if total_packet_loss == 0 {
                        info!("No packet loss detected, stopping Throughput test.");
                        max_successful_rate = test_payload.streams.iter().map(|s| s.traffic_rate).sum();
                        
                        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                        if let Err(err) = save_statistics(Arc::clone(&state), 1).await {
                            error!("Failed to save the statistics of the throughput test: {}", err);
                            return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the throughput test: {}", err)))).into_response());
                        }

                        break;
                    } else {
                        for (stream, &initial_rate) in test_payload.streams.iter_mut().zip(initial_tx_rate.iter()) {
                            stream.traffic_rate -= initial_rate * 0.05;
                            info!("Reduced traffic rate of stream {}: {}", stream.app_id, stream.traffic_rate);
                        }
                    }
                } else {
                    error!("Failed to retrieve statistics for test {}", i + 1);
                }
            },
            Err(err) => {
                error!("Error in traffic generation {}: {}", i + 1, err);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Error in traffic generation {}: {}", i + 1, err)))).into_response());
            }
        }
    }

    let result = (StatusCode::OK, Json(max_successful_rate));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.test_results.lock().await;
        test_result.throughput = Some(max_successful_rate);
    }
    Ok(result)
}

pub async fn latency_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f64>), Response> {
    abort_current_test(Arc::clone(&state)).await;
    info!("Starting latency test 20 times with 120 seconds each");
    
    
    // Check if throughput is set and use it if present
    let throughput_result = {
        let test_results = state.multi_test_state.test_results.lock().await;
        test_results.throughput
    };
    
    let mut adjusted_payload = payload.clone();
    if let Some(throughput) = throughput_result {
        let stream_count = adjusted_payload.streams.len() as f32;
        for stream in &mut adjusted_payload.streams {
            stream.traffic_rate = throughput / stream_count;
        }
    }
    
    save_tg(Arc::clone(&state), adjusted_payload.clone(), "Latency".to_string()).await;

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;
    let mut latencies = Vec::new();

    for i in 0..5 {
        match start_traffic_gen_with_duration(Arc::clone(&state), adjusted_payload.clone(), i, Some(5.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);
                
                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_rtt: f64 = stats.rtts.values().map(|rtt| rtt.mean).sum();
                    let avg_rtt = total_rtt / stats.rtts.len() as f64;
                    let avg_latency_us = (avg_rtt / 2.0) / 1000.0;
                    latencies.push(avg_latency_us);
                    info!("Test {}: Average Latency: {:.4} µs", i + 1, avg_latency_us);
                } else {
                    error!("Failed to retrieve statistics for test {}", i + 1);
                }
            },
            Err(err) => {
                error!("Error in traffic generation {}: {}", i + 1, err);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Error in traffic generation {}: {}", i + 1, err)))).into_response());
            }
        }
    }
    // Ich kann hier den namen einstellen. Payload name setzen in save_tg

    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    if let Err(err) = save_statistics(Arc::clone(&state), 2).await {
        error!("Failed to save the statistics of the latency test: {}", err);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the latency test: {}", err)))).into_response());
    }
                

    let overall_avg_latency = latencies.iter().sum::<f64>() / latencies.len() as f64;
    info!("Overall Average Latency after 20 tests: {:.4} µs", overall_avg_latency);

    let result = (StatusCode::OK, Json(overall_avg_latency));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.test_results.lock().await;
        test_result.latency = Some(overall_avg_latency);
    }
    Ok(result)
}

pub async fn frame_loss_rate_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f32>), Response> {
    abort_current_test(Arc::clone(&state)).await;
    info!("Starting frame loss rate test 10 times with 10 seconds each");


    save_tg(Arc::clone(&state), payload.clone(), "Frame Loss Rate".to_string()).await;


    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;
    let initial_tx_rate: Vec<f32> = payload.streams.iter().map(|s| s.traffic_rate).collect();
    let mut test_payload = payload.clone();
    let mut previous_tx_rate = 1.0_f32;
    let mut consecutive_zero_loss_tests = 0;
    let mut max_rate = 0.0_f32;

    for i in 0..5 {
        adjust_traffic_rate(&mut test_payload, &initial_tx_rate, previous_tx_rate);

        match start_traffic_gen_with_duration(Arc::clone(&state), test_payload.clone(), i, Some(5.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);
                
                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_frames_lost: u64 = stats.packet_loss.values().sum();
                    let total_rx: u64 = stats.frame_size.values().map(|f| f.rx.iter().map(|v| v.packets).sum::<u128>() as u64).sum();
                    let frame_loss_rate = if total_rx + total_frames_lost > 0 {
                        total_frames_lost as f64 * 100.0 / (total_frames_lost + total_rx) as f64
                    } else {
                        0.0
                    };

                    info!("Test {}: Frame Loss Rate: {:.2}%", i + 1, frame_loss_rate);

                    if frame_loss_rate == 0.0 {
                        consecutive_zero_loss_tests += 1;
                        max_rate = previous_tx_rate.max(max_rate);
                        previous_tx_rate *= 0.9;
                        if consecutive_zero_loss_tests == 2 {
                            info!("Two consecutive tests with 0% frame loss detected. Maximum rate: {:.2} Gbps", max_rate);


                            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                            if let Err(err) = save_statistics(Arc::clone(&state), 3).await {
                                error!("Failed to save the statistics of the frame_loss_rate_test test: {}", err);
                                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the frame_loss_rate_test test: {}", err)))).into_response());
                            }
                            break;
                        }
                    } else {
                        consecutive_zero_loss_tests = 0;
                        previous_tx_rate *= 0.9;
                    }
                } else {
                    error!("Failed to retrieve statistics for test {}", i + 1);
                }
            },
            Err(err) => {
                error!("Error in traffic generation {}: {}", i + 1, err);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Error in traffic generation {}: {}", i + 1, err)))).into_response());
            }
        }
    }

    let result = (StatusCode::OK, Json(max_rate));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.test_results.lock().await;
        test_result.frame_loss_rate = Some(max_rate);
    }
    Ok(result)
}

pub async fn back_to_back_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<u16>), Response> {
    abort_current_test(Arc::clone(&state)).await;
    info!("Starting back-to-back test with 10 iterations");

    save_tg(Arc::clone(&state), payload.clone(), "Back-to-back frames".to_string()).await;

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;
    let mut burst_length = 1000_u16;
    let mut successful_bursts = Vec::new();

    for i in 0..10 {
        let mut adjusted_payload = payload.clone();
        for stream in adjusted_payload.streams.iter_mut() {
            stream.burst = burst_length;
        }

        match start_traffic_gen_with_duration(Arc::clone(&state), adjusted_payload.clone(), i, Some(5.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);

                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_frames_sent: u64 = stats.frame_size.values().map(|f| f.tx.iter().map(|v| v.packets).sum::<u128>() as u64).sum();
                    let total_frames_forwarded: u64 = stats.frame_size.values().map(|f| f.rx.iter().map(|v| v.packets).sum::<u128>() as u64).sum();
                    info!("Test {}: Total Frames Sent: {}, Total Frames Forwarded: {}", i + 1, total_frames_sent, total_frames_forwarded);

                    if total_frames_forwarded == total_frames_sent {
                        successful_bursts.push(burst_length);
                        burst_length = (burst_length as f64 * 1.05).round() as u16;
                        info!("Burst length increased to {}", burst_length);
                    } else {
                        burst_length = (burst_length as f64 * 0.95).round() as u16;
                        info!("Burst length decreased to {}", burst_length);
                    }
                } else {
                    error!("Failed to retrieve statistics for test {}", i + 1);
                }
            },
            Err(err) => {
                error!("Error in traffic generation {}: {}", i + 1, err);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Error in traffic generation {}: {}", i + 1, err)))).into_response());
            }
        }
    }

    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    if let Err(err) = save_statistics(Arc::clone(&state), 4).await {
        error!("Failed to save the statistics of the back_to_back_test: {}", err);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the back_to_back_test: {}", err)))).into_response());
    }
    

    let average_successful_burst = if !successful_bursts.is_empty() {
        successful_bursts.iter().sum::<u16>() / successful_bursts.len() as u16
    } else {
        0
    };

    info!("Average successful burst length after 10 tests: {} frames", average_successful_burst);

    let result = (StatusCode::OK, Json(average_successful_burst));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.test_results.lock().await;
        test_result.back_to_back = Some(average_successful_burst as f64);
    }
    Ok(result)
}

async fn handle_test_result<T: std::fmt::Debug>(result: Result<(StatusCode, Json<T>), Response>, test_name: &str) -> Result<(), ()> {
    match result {
        Ok((status, Json(result))) if status == StatusCode::OK => {
            info!("{} test completed successfully: {:?}", test_name, result);
            Ok(())
        },
        Ok((status, _)) => {
            error!("{} test failed: {}", test_name, status);
            Err(())
        },
        Err(err) => {
            error!("{} test failed: {:?}", test_name, err);
            Err(())
        }
    }
}

pub async fn reset_results(state: Arc<AppState>) {
    let mut res = state.multi_test_state.test_results.lock().await;
    *res = TestResult {
        throughput: None,
        latency: None,
        frame_loss_rate: None,
        back_to_back: None,
        running: false,
    };
}

async fn set_running_flag(state: &Arc<AppState>, running: bool) {
    let mut test_results = state.multi_test_state.test_results.lock().await;
    test_results.running = running;
}

fn adjust_traffic_rate(payload: &mut TrafficGenData, initial_tx_rate: &[f32], previous_tx_rate: f32) {
    for (stream, &initial_rate) in payload.streams.iter_mut().zip(initial_tx_rate.iter()) {
        stream.traffic_rate = initial_rate * previous_tx_rate;
    }
}


pub async fn save_tg(state_clone: Arc<AppState>, payload: TrafficGenData, name: String) {
    let mut multiple_traffic_generators = state_clone.multi_test_state.multiple_traffic_generators.lock().await;
    let mut named_payload = payload.clone();
    named_payload.name = Some(name);
    multiple_traffic_generators.push(named_payload);
}


pub async fn reset_collected_statistics(state_clone: Arc<AppState>) {
    let mut collected_statistics = state_clone.multi_test_state.collected_statistics.lock().await;
    collected_statistics.clear();

    let mut collected_time_statistics = state_clone.multi_test_state.collected_time_statistics.lock().await; 
    collected_time_statistics.clear();
}


