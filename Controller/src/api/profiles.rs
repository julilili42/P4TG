use crate::core::traffic_gen_core::types::*;
use std::sync::Mutex;
use std::collections::HashMap;
use crate::api::multiple_traffic_gen::{start_traffic_gen_with_duration, create_and_store_abort_sender, abort_current_test, reset_and_start_experiment, save_statistics, parse_response};
use crate::api::statistics::{Statistics, statistics};

use std::sync::Arc;
use log::{info, error};
use axum::extract::State;
use axum::http::StatusCode;
use crate::AppState;
use axum::response::{IntoResponse, Json, Response};
use crate::api::server::Error;


lazy_static::lazy_static! {
    static ref ProfilePayload: Mutex<HashMap<String, TrafficGenData>> = Mutex::new({
        let mut map = HashMap::new();

        let rfc2544 = TrafficGenData {
            mode: GenerationMode::Cbr,
            stream_settings: vec![
                StreamSetting {
                    port: 128,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 136,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 144,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 152,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 160,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 168,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 176,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 184,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 60,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 52,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
            ],
            streams: vec![
                Stream {
                    stream_id: 1,
                    app_id: 1,
                    frame_size: 1024,
                    encapsulation: Encapsulation::None,
                    number_of_lse: None,
                    traffic_rate: 1.0,
                    burst: 1,
                    n_packets: None,
                    timeout: None,
                    generation_accuracy: None,
                    n_pipes: None,
                    vxlan: false,
                },
            ],
            port_tx_rx_mapping: vec![(128, 136)].into_iter().collect(),
            duration: Some(10),
            name: Some("RFC2544".to_string()),
            all_test: None,
        };

        let imix = TrafficGenData {
            mode: GenerationMode::Cbr,
            stream_settings: vec![
                // Stream id 1
                StreamSetting {
                    port: 128,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 136,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 144,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 152,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 160,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 168,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 176,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 184,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 60,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 52,
                    stream_id: 1,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },

                // Stream id 2 
                StreamSetting {
                    port: 128,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 2,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 136,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 144,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 152,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 160,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 168,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 176,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 184,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 60,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 52,
                    stream_id: 2,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },

                // Stream id 3
                StreamSetting {
                    port: 128,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 136,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 144,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 152,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 160,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 168,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 176,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 184,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 60,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
                StreamSetting {
                    port: 52,
                    stream_id: 3,
                    vlan: Some(Vlan {
                        vlan_id: 1,
                        pcp: 0,
                        dei: 0,
                        inner_vlan_id: 1,
                        inner_pcp: 0,
                        inner_dei: 0,
                    }),
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
                    active: false,
                    vxlan: Some(VxLAN {
                        eth_src: "32:D5:42:2A:F6:92".to_string(),
                        eth_dst: "81:E7:9D:E3:AD:47".to_string(),
                        ip_src: "192.168.178.10".parse().unwrap(),
                        ip_dst: "192.168.178.11".parse().unwrap(),
                        ip_tos: 0,
                        udp_source: 49152,
                        vni: 1,
                    }),
                },
            ],
            streams: vec![
                Stream {
                    stream_id: 1,
                    app_id: 1,
                    frame_size: 64,
                    encapsulation: Encapsulation::None,
                    number_of_lse: None,
                    traffic_rate: 5.8,
                    burst: 1,
                    n_packets: None,
                    timeout: None,
                    generation_accuracy: None,
                    n_pipes: None,
                    vxlan: false,
                },
                Stream {
                    stream_id: 2,
                    app_id: 2,
                    frame_size: 512,
                    encapsulation: Encapsulation::None,
                    number_of_lse: None,
                    traffic_rate: 3.3,
                    burst: 1,
                    n_packets: None,
                    timeout: None,
                    generation_accuracy: None,
                    n_pipes: None,
                    vxlan: false,
                },
                Stream {
                    stream_id: 3,
                    app_id: 3,
                    frame_size: 1518,
                    encapsulation: Encapsulation::None,
                    number_of_lse: None,
                    traffic_rate: 0.83,
                    burst: 1,
                    n_packets: None,
                    timeout: None,
                    generation_accuracy: None,
                    n_pipes: None,
                    vxlan: false,
                },
            ],
            port_tx_rx_mapping: vec![(128, 136)].into_iter().collect(),
            duration: Some(60),
            name: Some("IMIX".to_string()),
            all_test: None,
        };

        map.insert("RFC 2544".to_string(), rfc2544);
        map.insert("IMIX".to_string(), imix);
        
        map
    });
}

pub async fn profiles_handler() -> Json<HashMap<String, TrafficGenData>> {
    let payload = ProfilePayload.lock().unwrap();
    Json(payload.clone())
}


pub async fn get_test_results(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let test_results = state.multi_test_state.test_results.lock().await;
    if test_results.running {
        Json(test_results.clone()).into_response()
    } else {
        Json(EmptyResponse{message: "Not running.".to_string()}).into_response()
    }
}



pub async fn run_all_tests(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Response {
    // Reset the results before starting the tests
    reset_results(Arc::clone(&state)).await;

    // RFC Test is running
    set_running_flag(&state, true).await;
    

    // Abort any currently running test
    abort_current_test(Arc::clone(&state)).await;

    let state_clone = Arc::clone(&state);
    let payload_clone = payload.clone();

    tokio::spawn(async move {
        info!("Starting throughput test");
        let throughput_result = match throughput_test(State(Arc::clone(&state_clone)), Json(payload_clone.clone())).await {
            Ok((status, Json(result))) if status == StatusCode::OK => result,
            Ok((status, _)) => {
                error!("Throughput test failed: {}", status);
                set_running_flag(&state, false).await;
                return;
            },
            Err(err) => {
                error!("Throughput test failed: {:?}", err);
                set_running_flag(&state, false).await;
                return;
            },
        };
        info!("Throughput test completed successfully: {}", throughput_result);

        // Latency test
        info!("Starting latency test");
        let latency_result = match latency_test(State(Arc::clone(&state_clone)), Json(payload_clone.clone())).await {
            Ok((status, Json(result))) if status == StatusCode::OK => result,
            Ok((status, _)) => {
                error!("Latency test failed: {}", status);
                set_running_flag(&state, false).await;
                return;
            },
            Err(err) => {
                error!("Latency test failed: {:?}", err);
                set_running_flag(&state, false).await;
                return;
            },
        };
        info!("Latency test completed successfully: {}", latency_result);

        // Frame Loss Rate test
        info!("Starting frame loss rate test");
        let frame_loss_rate_result = match frame_loss_rate_test(State(Arc::clone(&state_clone)), Json(payload_clone.clone())).await {
            Ok((status, Json(result))) if status == StatusCode::OK => result,
            Ok((status, _)) => {
                error!("Frame loss rate test failed {}", status);
                set_running_flag(&state, false).await;
                return;
            },
            Err(err) => {
                error!("Frame loss rate test failed: {:?}", err);
                set_running_flag(&state, false).await;
                return;
            },
        };
        info!("Frame loss rate test completed successfully: {}", frame_loss_rate_result);

        // Back-to-Back test
        info!("Starting back-to-back test");
        let back_to_back_result = match back_to_back_test(State(Arc::clone(&state_clone)), Json(payload_clone)).await {
            Ok((status, Json(result))) if status == StatusCode::OK => result,
            Ok((status, _)) => {
                error!("Back-to-back test failed: {}", status);
                set_running_flag(&state, false).await;
                return;
            },
            Err(err) => {
                error!("Back-to-back test failed: {:?}", err);
                set_running_flag(&state, false).await;
                return;
            },
        };
        info!("Back-to-back test completed successfully: {}", back_to_back_result);

        info!("All tests completed successfully");

        set_running_flag(&state, false).await;    
        // Set the running flag to false after all tests
        let mut experiment = state_clone.experiment.lock().await;
        experiment.running = false;
    });

    // Return an immediate response to the client
    StatusCode::OK.into_response()
}




pub async fn throughput_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f32>), Response> {
    abort_current_test(Arc::clone(&state)).await;

    info!("Starting traffic generation up to 10 times with 10 seconds each");

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;

    let payload_clone = vec![payload.clone(); 10];
    reset_and_start_experiment(Arc::clone(&state), payload_clone).await;

    let initial_tx_rate: Vec<f32> = payload.streams.iter().map(|s| s.traffic_rate).collect();
    let mut test_payload = payload.clone();
    let mut max_successful_rate = 0.0;

    for i in 0..10 {
        match start_traffic_gen_with_duration(Arc::clone(&state), test_payload.clone(), i, Some(10.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);

                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                if let Err(err) = save_statistics(Arc::clone(&state), i).await {
                    error!("Failed to save the statistics of the current test {}: {}", i, err);
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the current test {}: {}", i, err)))).into_response());
                }

                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_packet_loss: u64 = stats.packet_loss.values().sum();
                    info!("Test {}: Total packet loss: {}", i + 1, total_packet_loss);

                    if total_packet_loss == 0 {
                        info!("No packet loss detected, stopping Throughput test.");
                        max_successful_rate = test_payload.streams.iter().map(|s| s.traffic_rate).sum();
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

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;

    let payload_clone = vec![payload.clone(); 20];
    reset_and_start_experiment(Arc::clone(&state), payload_clone).await;

    let mut latencies = Vec::new();

    // 20 tests with 120 seconds each
    for i in 0..10 {
        // 20 tests with 120 seconds each
        match start_traffic_gen_with_duration(Arc::clone(&state), payload.clone(), i, Some(5.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);

                // Wait for a brief moment before saving statistics
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                // Save statistics after each test
                if let Err(err) = save_statistics(Arc::clone(&state), i).await {
                    error!("Failed to save the statistics of the current test {}: {}", i, err);
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the current test {}: {}", i, err)))).into_response());
                }

                // Retrieve and record latency statistics
                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_rtt: f64 = stats.rtts.values().map(|rtt| rtt.mean).sum();
                    let avg_rtt = total_rtt / stats.rtts.len() as f64;
                    let avg_latency_us = avg_rtt / 1000.0;  // Convert to microseconds
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

    // Calculate and log the overall average latency
    let overall_avg_latency: f64 = latencies.iter().sum::<f64>() / latencies.len() as f64;
    info!("Overall Average Latency after 20 tests: {:.4} µs", overall_avg_latency);

    let result = (StatusCode::OK, Json(overall_avg_latency));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.test_results.lock().await;
        test_result.latency = Some(overall_avg_latency);
    }
    Ok(result)
}

pub async fn frame_loss_rate_test(State(state): State<Arc<AppState>>, Json(mut payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f32>), Response> {
    abort_current_test(Arc::clone(&state)).await;

    info!("Starting frame loss rate test 10 times with 10 seconds each");

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;
    let mut previous_tx_rate = 1.0_f32;
    let mut consecutive_zero_loss_tests = 0;
    let mut max_rate = 0.0_f32;
    let initial_tx_rate: Vec<f32> = payload.streams.iter().map(|s| s.traffic_rate).collect();

    let payload_clone = vec![payload.clone(); 10];
    reset_and_start_experiment(Arc::clone(&state), payload_clone).await;

    for i in 0..10 {
        let mut adjusted_payload = payload.clone();
        for (stream, &initial_rate) in adjusted_payload.streams.iter_mut().zip(initial_tx_rate.iter()) {
            stream.traffic_rate = initial_rate * previous_tx_rate;
        }
        payload = adjusted_payload;
        info!("Test {}: Adjusted Transmission Rates:", i + 1);
        for stream in &payload.streams {
            info!("Stream {}: {:.2} Gbps", stream.stream_id, stream.traffic_rate);
        }
        match start_traffic_gen_with_duration(Arc::clone(&state), payload.clone(), i, Some(10.0), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);

                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                if let Err(err) = save_statistics(Arc::clone(&state), i).await {
                    error!("Failed to save the statistics of the current test {}: {}", i, err);
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the current test {}: {}", i, err)))).into_response());
                }

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
                            info!("Two consecutive tests with 0% frame loss detected. Maximum rate: {:.2}%", max_rate * 100.0);
                            break;
                        }
                    } else {
                        consecutive_zero_loss_tests = 0;
                        previous_tx_rate *= 0.9; // Reduce rate by 10%
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

    let result = (StatusCode::OK, Json(max_rate * 100.0));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.test_results.lock().await;
        test_result.frame_loss_rate = Some(max_rate * 100.0);
    }
    Ok(result)
}

pub async fn back_to_back_test(State(state): State<Arc<AppState>>, Json(payload): Json<TrafficGenData>) -> Result<(StatusCode, Json<f64>), Response> {
    // Abort any currently running test
    abort_current_test(Arc::clone(&state)).await;

    info!("Starting back-to-back test with 50 iterations");

    let mut abort_rx = create_and_store_abort_sender(Arc::clone(&state)).await;

    let mut burst_duration = 5.0_f64; // Start with 2 seconds
    let mut successful_bursts = Vec::new();

    // 50 tests with increasing burst duration
    for i in 0..10 {
        match start_traffic_gen_with_duration(Arc::clone(&state), payload.clone(), i, Some(burst_duration), &mut abort_rx).await {
            Ok(_) => {
                info!("Successfully completed traffic generation {}", i + 1);

                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                if let Err(err) = save_statistics(Arc::clone(&state), i).await {
                    error!("Failed to save the statistics of the current test {}: {}", i, err);
                    return Err((StatusCode::INTERNAL_SERVER_ERROR, Json(Error::new(format!("Failed to save the statistics of the current test {}: {}", i, err)))).into_response());
                }

                let stats_response = statistics(State(Arc::clone(&state))).await;
                if let Ok(stats) = parse_response::<Statistics>(stats_response).await {
                    let total_frames_lost: u64 = stats.packet_loss.values().sum();
                    info!("Test {}: Total Frames Lost: {}", i + 1, total_frames_lost);

                    if total_frames_lost == 0 {
                        successful_bursts.push(burst_duration);
                        burst_duration *= 1.05; // Increase duration by 5%
                        info!("Burst duration increased to {}", burst_duration);
                    } else {
                        burst_duration *= 0.95; // Decrease duration by 5%
                        info!("Burst duration decreased to {}", burst_duration);
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

    let average_successful_burst = if !successful_bursts.is_empty() {
        successful_bursts.iter().sum::<f64>() / successful_bursts.len() as f64
    } else {
        0.0
    };

    info!("Average successful burst duration after 50 tests: {:.2} seconds", average_successful_burst);

    let result = (StatusCode::OK, Json(average_successful_burst));
    if result.0 == StatusCode::OK {
        let mut test_result = state.multi_test_state.test_results.lock().await;
        test_result.back_to_back = Some(average_successful_burst);
    }
    Ok(result)
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

