use axum::Json;
use crate::core::traffic_gen_core::types::*;
use std::collections::HashMap;
use std::sync::Mutex;

lazy_static::lazy_static! {
    static ref ProfilePayload: Mutex<Vec<TrafficGenData>> = Mutex::new(vec![
        TrafficGenData {
            mode: GenerationMode::Cbr,
            stream_settings: vec![
                StreamSetting {
                    port: 128,
                    stream_id: 1,
                    vlan: None,
                    mpls_stack: None,
                    ethernet: Ethernet {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                    },
                    ip: IPv4 {
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        ip_src_mask: "0.0.0.0".parse().unwrap(),
                        ip_dst_mask: "0.0.0.0".parse().unwrap(),
                    },
                    active: true,
                    vxlan: None,
                }],
            streams: vec![],
            port_tx_rx_mapping: HashMap::new(),
            duration: None,
            all_test: None,
            name: None,
        },
    ]);
}

pub async fn profiles_handler() -> Json<Vec<TrafficGenData>> {
    let payload = ProfilePayload.lock().unwrap();
    Json(payload.clone())
}

    

    
    

