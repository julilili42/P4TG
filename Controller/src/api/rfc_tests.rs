use crate::core::traffic_gen_core::types::*;
use crate::api::multiple_traffic_gen::{
    start_traffic_gen_with_duration, create_and_store_abort_sender, abort_current_test, 
    save_statistics, parse_response,
};
use crate::api::statistics::{Statistics, statistics};
use crate::AppState;

use std::sync::Arc;
use axum::extract::State;
use axum::http::StatusCode;
use crate::api::server::Error;
use axum::response::{IntoResponse, Json, Response};
use log::{error, info, warn};
use tokio::time::{sleep, Duration};
use std::time::Instant;


// Throughput test defined in RFC 2544 section 25.1
// Uses Exponential and Binary search to find the optimal throughput
pub async fn throughput_test(
    State(state): State<Arc<AppState>>, 
    Json(payload): Json<TrafficGenData>
) -> Result<(StatusCode, Json<f32>), Response> {
    abort_current_test(Arc::clone(&state)).await;
    info!("Starting throughput test");

    save_tg(Arc::clone(&state), payload.clone(), "Throughput".to_string()).await;

    let initial_tx_rate = payload.streams[0].traffic_rate; // Assume only one stream
    let test_payload = payload.clone();

    // Perform exponential search to find the interval
    let (lower_bound, upper_bound) = exponential_search_for_max_rate(
        Arc::clone(&state),
        test_payload.clone(),
        initial_tx_rate,
    ).await?;

    warn!("Interval of Exponential search: [{}, {}]", lower_bound, upper_bound);

    // Perform binary search within the found interval, to find the maximum successful rate
    let max_successful_rate = binary_search_for_rate(
        Arc::clone(&state),
        test_payload,
        lower_bound,
        upper_bound,
    ).await?;

    // Save the results
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    if let Err(err) = save_statistics(Arc::clone(&state), 2).await {
        error!("Failed to save the statistics of the throughput test: {}", err);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the throughput test: {}", err)))).into_response());
    }

    let result = (StatusCode::OK, Json(max_successful_rate));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.rfc_results.lock().await;
        test_result.throughput = Some(max_successful_rate);
    }
    Ok(result)
}

async fn binary_search_for_rate(
    state: Arc<AppState>,
    mut test_payload: TrafficGenData,
    mut lower_bound: f32,
    mut upper_bound: f32,
) -> Result<f32, Response> {
    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;
    let mut max_successful_rate = 0.0;

    for _ in 0..10 {
        let current_rate = (lower_bound + upper_bound) / 2.0;

        info!("current_rate: {}, [{},{}] ", current_rate, lower_bound, upper_bound);

        // Adjusting traffic rate for single stream
        test_payload.streams[0].traffic_rate = current_rate;
        
        match start_traffic_gen_with_duration(Arc::clone(&state), test_payload.clone(), 0, Some(10.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation with current rate: {}", current_rate);

                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_packets_sent: u64 = stats.frame_size.values()
                        .flat_map(|f| f.tx.iter())
                        .map(|v| v.packets as u64)
                        .sum();
                    
                    let packet_loss: u64 = stats.packet_loss.values().sum();

                    let packet_loss_percent = if total_packets_sent > 0 {
                        round_to_three_places((packet_loss as f64 / total_packets_sent as f64) * 100.0)
                    } else {
                        0.0
                    };

                    info!("Total packets sent: {}", total_packets_sent);
                    info!("Packet loss: {} packets", packet_loss);
                    info!("Packet loss percentage: {:.2}%", packet_loss_percent);

                    if packet_loss_percent == 0.0 {
                        lower_bound = current_rate;
                        max_successful_rate = current_rate;
                    } else {
                        upper_bound = current_rate;
                    }
                } else {
                    error!("Failed to retrieve statistics for current rate: {}", current_rate);
                }
            },
            Err(err) => {
                error!("Error in traffic generation with current rate: {}: {}", current_rate, err);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Error in traffic generation with current rate: {}: {}", current_rate, err)))).into_response());
            }
        }

        if (upper_bound - lower_bound).abs() < 0.01 {
            break;
        }
    }

    Ok(max_successful_rate)
}

async fn exponential_search_for_max_rate(
    state: Arc<AppState>,
    mut test_payload: TrafficGenData,
    initial_tx_rate: f32,
) -> Result<(f32, f32), Response> {
    let mut k = 0;
    let mut current_rate = initial_tx_rate;

    // Limiting k to avoid infinite loop in case of errors
    while k < 10 {
        let test_rate = initial_tx_rate * 2f32.powi(k);

        if test_rate > 100.0 {
            info!("Test rate exceeds 100 Gbps, stopping search");
            break;
        }

        info!("Exponential search iteration {}: testing rate {}", k, test_rate);

        // Adjust the traffic rate for the single stream
        test_payload.streams[0].traffic_rate = test_rate;

        match start_traffic_gen_with_duration(Arc::clone(&state), test_payload.clone(), 0, Some(10.0), &mut create_and_store_abort_sender(Arc::clone(&state)).await).await {
            Ok(_) => {
                info!("Successfully completed traffic generation with test rate: {}", test_rate);

                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_packets_sent: u64 = stats.frame_size.values()
                        .flat_map(|f| f.tx.iter())
                        .map(|v| v.packets as u64)
                        .sum();

                    let packet_loss: u64 = stats.packet_loss.values().sum();
                    let packet_loss_percent = if total_packets_sent > 0 {
                        round_to_three_places((packet_loss as f64 / total_packets_sent as f64) * 100.0)
                    } else {
                        0.0
                    };

                    info!("Total packets sent: {}", total_packets_sent);
                    info!("Packet loss: {} packets", packet_loss);
                    info!("Packet loss percentage: {:.3}%", packet_loss_percent);

                    if packet_loss_percent == 0.0 {
                        current_rate = test_rate;
                        k += 1;
                    } else {
                        let lower_bound = if k == 0 { 0.0 } else { initial_tx_rate * 2f32.powi(k - 1) };
                        info!("Packet loss detected: {}%, returning interval [{}, {}]", packet_loss_percent, lower_bound, test_rate);
                        return Ok((lower_bound, test_rate));
                    }
                } else {
                    error!("Failed to retrieve statistics for test rate: {}", test_rate);
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to retrieve statistics for test rate: {}", test_rate)))).into_response());
                }
            },
            Err(err) => {
                error!("Error in traffic generation with test rate: {}: {}", test_rate, err);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Error in traffic generation with test rate: {}: {}", test_rate, err)))).into_response());
            }
        }
    }

    let lower_bound = current_rate / 2.0;
    let upper_bound = current_rate;
    Ok((lower_bound, upper_bound))
}



// Latency test defined in RFC 2544 section 25.2
// Uses One-Way Latency to measure the average latency

// TO CHANGE: Duration 120s, 20 tests
pub async fn latency_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f64>), Response> {
    abort_current_test(Arc::clone(&state)).await;
    info!("Starting latency test 20 times with 120 seconds each");

    // If throughput test has not been run, use the initial rate
    let max_successful_rate = {
        let test_results = state.multi_test_state.rfc_results.lock().await;
        test_results.throughput.unwrap_or_else(|| {
            payload.streams[0].traffic_rate
        })
    };

    let mut adjusted_payload = payload.clone();
    adjusted_payload.streams[0].traffic_rate = max_successful_rate;

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

    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    if let Err(err) = save_statistics(Arc::clone(&state), 2).await {
        error!("Failed to save the statistics of the latency test: {}", err);
        return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the latency test: {}", err)))).into_response());
    }

    let overall_avg_latency = latencies.iter().sum::<f64>() / latencies.len() as f64;
    info!("Overall Average Latency after 20 tests: {:.4} µs", overall_avg_latency);

    let result = (StatusCode::OK, Json(overall_avg_latency));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.rfc_results.lock().await;
        test_result.latency = Some(overall_avg_latency);
    }
    Ok(result)
}


// Frame loss rate test defined in RFC 2544 section 25.3
pub async fn frame_loss_rate_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f32>), Response> {
    abort_current_test(Arc::clone(&state)).await;
    info!("Starting frame loss rate test 10 times with 10 seconds each");

    save_tg(Arc::clone(&state), payload.clone(), "Frame Loss Rate".to_string()).await;

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;
    
    // If throughput test has not been run, use the initial rate
    let throughput_rate = {
        let test_results = state.multi_test_state.rfc_results.lock().await;
        test_results.throughput.unwrap_or(payload.streams[0].traffic_rate)
    };
    
    let initial_tx_rate: f32 = throughput_rate;
    let mut test_payload = payload.clone();
    let mut consecutive_zero_loss_tests = 0;
    let mut max_rate = 0.0_f32;

    for i in 0..10 {
        // Adjust traffic rate for single stream
        let reduction_factor = 1.0 - 0.1 * i as f32;
        test_payload.streams[0].traffic_rate = initial_tx_rate * reduction_factor;

        match start_traffic_gen_with_duration(Arc::clone(&state), test_payload.clone(), i, Some(10.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);

                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_packets_sent: u64 = stats.frame_size.values()
                        .flat_map(|f| f.tx.iter())
                        .map(|v| v.packets as u64)
                        .sum();

                    
                    let packet_loss: u64 = stats.packet_loss.values().sum();

                    // Calculate packet loss percentage
                    // This is better then absolute number of packets, since very low amount of packet loss will be ignored
                    let packet_loss_percent = if total_packets_sent > 0 {
                        round_to_three_places((packet_loss as f64 / total_packets_sent as f64) * 100.0)
                    } else {
                        0.0
                    };

                    info!("Total packets sent: {}", total_packets_sent);
                    info!("Packet loss: {} packets", packet_loss);
                    info!("Packet loss percentage: {:.2}%", packet_loss_percent);

                    if packet_loss_percent == 0.0 {
                        consecutive_zero_loss_tests += 1;
                        if consecutive_zero_loss_tests == 2 {
                            max_rate = test_payload.streams[0].traffic_rate;
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
        let mut test_result = state.multi_test_state.rfc_results.lock().await;
        test_result.frame_loss_rate = Some(max_rate);
    }
    Ok(result)
}


// Back-to-Back test defined in RFC 2544 section 25.4
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
        let mut test_result = state.multi_test_state.rfc_results.lock().await;
        test_result.back_to_back = Some(average_successful_burst as f64);
    }
    Ok(result)
}

// Reset test definend in RFC 2544 section 25.6
pub async fn reset_test(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TrafficGenData>
) -> Result<(StatusCode, Json<f64>), Response> {
    info!("Starting reset test");
    set_name_flag(&state, "Reset Test".to_string()).await;

    let throughput_rate = {
        let test_results = state.multi_test_state.rfc_results.lock().await;
        test_results.throughput.unwrap_or(payload.streams[0].traffic_rate)
    };

    let mut adjusted_payload = payload.clone();
    adjusted_payload.streams[0].traffic_rate = throughput_rate;
    save_tg(Arc::clone(&state), adjusted_payload.clone(), "Reset Test".to_string()).await;

    let state_clone = Arc::clone(&state);
    let mut abort_rx = create_and_store_abort_sender(state_clone.clone()).await;

    // Duration for monitioring and traffic generation
    let duration = Duration::from_secs(12);

    // Traffic gen task
    let tg_task = tokio::spawn(async move {
        start_traffic_gen_with_duration(
            state_clone,
            adjusted_payload,
            0,
            Some(duration.as_secs_f64()),
            &mut abort_rx
        ).await
    });

    // Monitoring task
    let state_clone = Arc::clone(&state);
    let monitor_task = tokio::spawn(async move {
        monitor_packet_loss(&state_clone, 5.0, duration).await
    });

    // Wait for either the traffic generation or monitoring to complete
    let (tg_result, monitor_result) = tokio::join!(tg_task, monitor_task);

    // Check results of traffic generation
    match tg_result {
        Ok(Ok(())) => info!("Traffic generation completed successfully"),
        Ok(Err(err)) => {
            error!("Error starting traffic generator: {}", err);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Error starting traffic generator: {}", err)))).into_response());
        },
        Err(err) => {
            error!("Traffic generation task panicked: {:?}", err);
            return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new("Traffic generation task panicked".to_string()))).into_response());
        }
    }

    // Check results of monitoring
    match monitor_result {
        Ok(Ok((duration_a, duration_b))) => {
            if duration_a.is_none() {
                info!("No significant packet loss detected within 120 seconds.");
                return Ok((StatusCode::OK, Json(0.0)));
            }
            let duration_a = duration_a.unwrap();
            info!("Duration A: {:?}", duration_a);

            if duration_b.is_none() {
                info!("No packet loss recovery detected.");
                return Ok((StatusCode::OK, Json(0.0)));
            }
            let duration_b = duration_b.unwrap();
            info!("Duration B: {:?}", duration_b);

            // Recovery interval
            let recovery_time = duration_b - duration_a;
            let recovery_time_secs = recovery_time.as_secs_f64();
            info!("Recovery time after reset: {:.3} seconds", recovery_time_secs);

            // Save results
            if let Err(err) = save_statistics(Arc::clone(&state), 5).await {
                error!("Failed to save the statistics of the reset test: {}", err);
                return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the reset test: {}", err)))).into_response());
            }

            let mut test_result = state.multi_test_state.rfc_results.lock().await;
            test_result.reset = Some(recovery_time_secs);

            Ok((StatusCode::OK, Json(recovery_time_secs)))
        },
        Ok(Err(err)) => {
            error!("Error in packet loss monitoring: {:?}", err);
            Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new("Error in packet loss monitoring".to_string()))).into_response())
        },
        Err(err) => {
            error!("Packet loss monitoring task panicked: {:?}", err);
            Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new("Packet loss monitoring task panicked".to_string()))).into_response())
        }
    }
}

async fn monitor_packet_loss(state: &Arc<AppState>, threshold: f64, monitoring_duration: Duration) -> Result<(Option<Duration>, Option<Duration>), Response> {
    let start_time = Instant::now();

    let mut duration_a: Option<Duration> = None;

    while Instant::now().duration_since(start_time) < monitoring_duration {
        
        info!("{:?} - {:?}", Instant::now().duration_since(start_time), monitoring_duration);

        sleep(Duration::from_millis(100)).await; 

        let stats_response = statistics(State(Arc::clone(state))).await;
        if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
            let total_packets_sent: u64 = stats.frame_size.values()
                .flat_map(|f| f.tx.iter())
                .map(|v| v.packets as u64)
                .sum();

            let packet_loss: u64 = stats.packet_loss.values().sum();
            let packet_loss_percent = if total_packets_sent > 0 {
                (packet_loss as f64 / total_packets_sent as f64) * 100.0
            } else {
                0.0
            };

            info!("Packet loss percentage: {:.2}%", packet_loss_percent);

            if packet_loss_percent > threshold && duration_a.is_none() {
                duration_a = Some(Instant::now().duration_since(start_time));
                info!("Duration A: {:?}", duration_a);
            }

            if packet_loss_percent == 0.0 && duration_a.is_some() {
                let duration_b = Some(Instant::now().duration_since(start_time));
                info!("Duration B: {:?}", duration_b);
                return Ok((duration_a, duration_b));
            }
        } else {
            error!("Failed to retrieve statistics");
        }
    }

    Ok((duration_a, None))
}

pub async fn handle_test_result<T: std::fmt::Debug>(result: Result<(StatusCode, Json<T>), Response>, test_name: &str) -> Result<(), ()> {
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
    let mut res = state.multi_test_state.rfc_results.lock().await;
    *res = TestResult {
        throughput: None,
        latency: None,
        frame_loss_rate: None,
        back_to_back: None,
        reset: None,
        running: false,
        current_test: None,
    };
}

pub async fn set_running_flag(state: &Arc<AppState>, running: bool) {
    let mut test_results = state.multi_test_state.rfc_results.lock().await;
    test_results.running = running;
}

pub async fn set_name_flag(state: &Arc<AppState>, name: String) {
    let mut test_results = state.multi_test_state.rfc_results.lock().await;
    test_results.current_test = Some(name);
}

async fn save_tg(state_clone: Arc<AppState>, payload: TrafficGenData, name: String) {
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

    let mut multiple_traffic_generators = state_clone.multi_test_state.multiple_traffic_generators.lock().await;
    multiple_traffic_generators.clear(); 
}

fn round_to_three_places(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}


