/* Copyright 2022-present University of Tuebingen, Chair of Communication Networks
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * Steffen Lindner (steffen.lindner@uni-tuebingen.de)
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ArcElement,
} from "chart.js";

import { Doughnut, Line } from "react-chartjs-2";
import { Statistics, TimeStatistics } from "../common/Interfaces";
import { useState } from "react";
import { Col, Form, Row } from "react-bootstrap";

import {
  generateLineData,
  loss_options,
  rate_options,
  rtt_options,
  frame_options,
} from "../common/VisualUtils";

import {
  get_frame_types,
  get_frame_stats,
  get_rtt,
} from "../common/StatisticUtils";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const Visuals = ({
  data,
  stats,
  port_mapping,
}: {
  data: TimeStatistics;
  stats: Statistics;
  port_mapping: { [name: number]: number };
}) => {
  const [labels_tx, line_data_tx] = generateLineData(
    "tx_rate_l1",
    true,
    data,
    port_mapping
  );
  const [labels_rx, line_data_rx] = generateLineData(
    "rx_rate_l1",
    false,
    data,
    port_mapping
  );
  const [labels_loss, line_data_loss] = generateLineData(
    "packet_loss",
    false,
    data,
    port_mapping
  );
  const [labels_out_of_order, line_data_out_of_order] = generateLineData(
    "out_of_order",
    false,
    data,
    port_mapping
  );
  const [labels_rtt, line_data_rtt] = get_rtt(data, port_mapping);

  const [visual_select, set_visual_select] = useState("rate");

  const rate_data = {
    labels: labels_tx,
    datasets: [
      {
        fill: true,
        label: "TX rate",
        data: line_data_tx.map((val) => val * 10 ** -9),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        fill: true,
        label: "RX rate",
        data: line_data_rx.map((val) => val * 10 ** -9),
        borderColor: "rgb(183,85,40)",
        backgroundColor: "rgb(250,122,64, 0.5)",
      },
    ],
  };

  const loss_data = {
    labels: labels_loss,
    datasets: [
      {
        fill: true,
        label: "Packet loss",
        data: line_data_loss,
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        fill: true,
        label: "Out of order",
        data: line_data_out_of_order,
        borderColor: "rgb(183,85,40)",
        backgroundColor: "rgb(250,122,64, 0.5)",
      },
    ],
  };

  const rtt_data = {
    labels: labels_rtt,
    datasets: [
      {
        fill: true,
        label: "RTT",
        data: line_data_rtt.map((val) => val * 10 ** -3),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  };

  let frame_type_label = ["Multicast", "Broadcast", "Unicast", "VxLAN"];

  const frame_type_data = {
    labels: frame_type_label,
    datasets: [
      {
        label: "TX frame types",
        data: [
          get_frame_types(stats, port_mapping, "multicast").tx,
          get_frame_types(stats, port_mapping, "broadcast").tx,
          get_frame_types(stats, port_mapping, "unicast").tx,
          get_frame_types(stats, port_mapping, "vxlan").tx,
        ],
        backgroundColor: [
          "rgb(255, 99, 132)",
          "rgb(54, 162, 235)",
          "rgb(255, 205, 86)",
          "rgb(125,62,37)",
        ],
        hoverOffset: 4,
      },
      {
        label: "RX frame types",
        data: [
          get_frame_types(stats, port_mapping, "multicast").rx,
          get_frame_types(stats, port_mapping, "broadcast").rx,
          get_frame_types(stats, port_mapping, "unicast").rx,
          get_frame_types(stats, port_mapping, "vxlan").rx,
        ],
        backgroundColor: [
          "rgb(255, 99, 132)",
          "rgb(54, 162, 235)",
          "rgb(255, 205, 86)",
          "rgb(125,62,37)",
        ],
        hoverOffset: 4,
      },
    ],
  };

  let ethernet_type_label = [
    "VLAN",
    "QinQ",
    "IPv4",
    "IPv6",
    "MPLS",
    "ARP",
    "Unknown",
  ];

  const ethernet_type_data = {
    labels: ethernet_type_label,
    datasets: [
      {
        label: "TX ethernet types",
        data: [
          get_frame_types(stats, port_mapping, "vlan").tx,
          get_frame_types(stats, port_mapping, "qinq").tx,
          get_frame_types(stats, port_mapping, "ipv4").tx,
          get_frame_types(stats, port_mapping, "ipv6").tx,
          get_frame_types(stats, port_mapping, "mpls").tx,
          get_frame_types(stats, port_mapping, "arp").tx,
          get_frame_types(stats, port_mapping, "unknown").tx,
        ],
        backgroundColor: [
          "rgb(255, 99, 132)",
          "rgb(54, 162, 235)",
          "rgb(255, 205, 86)",
          "rgb(18,194,0)",
          "rgb(178,0,255)",
          "rgb(131,63,14)",
          "rgb(255,104,42)",
        ],
        hoverOffset: 4,
      },
      {
        label: "RX ethernet types",
        data: [
          get_frame_types(stats, port_mapping, "vlan").rx,
          get_frame_types(stats, port_mapping, "qinq").rx,
          get_frame_types(stats, port_mapping, "ipv4").rx,
          get_frame_types(stats, port_mapping, "ipv6").rx,
          get_frame_types(stats, port_mapping, "mpls").rx,
          get_frame_types(stats, port_mapping, "arp").tx,
          get_frame_types(stats, port_mapping, "unknown").rx,
        ],
        backgroundColor: [
          "rgb(255, 99, 132)",
          "rgb(54, 162, 235)",
          "rgb(255, 205, 86)",
          "rgb(18,194,0)",
          "rgb(178,0,255)",
          "rgb(131,63,14)",
          "rgb(255,104,42)",
        ],
        hoverOffset: 4,
      },
    ],
  };

  const frame_size_label = [
    "0-63",
    "64",
    "65-127",
    "128-255",
    "256-511",
    "512-1023",
    "1024-1518",
    "1519-21519",
  ];

  const frame_size_data = {
    labels: frame_size_label,
    datasets: [
      {
        label: "TX frame sizes",
        data: [
          [0, 63],
          [64, 64],
          [65, 127],
          [128, 255],
          [256, 511],
          [512, 1023],
          [1024, 1518],
          [1519, 21519],
        ].map((v, i) => {
          return get_frame_stats(stats, port_mapping, "tx", v[0], v[1]);
        }),
        backgroundColor: [
          "rgb(255, 99, 132)",
          "rgb(54, 162, 235)",
          "rgb(255, 205, 86)",
          "rgb(18,194,0)",
          "rgb(178,0,255)",
          "rgb(255,104,42)",
          "rgb(0,0,0)",
          "rgb(164,0,0)",
        ],
        hoverOffset: 4,
      },
      {
        label: "RX frame sizes",
        data: [
          [0, 63],
          [64, 64],
          [65, 127],
          [128, 255],
          [256, 511],
          [512, 1023],
          [1024, 1518],
          [1519, 21519],
        ].map((v, i) => {
          return get_frame_stats(stats, port_mapping, "rx", v[0], v[1]);
        }),
        backgroundColor: [
          "rgb(255, 99, 132)",
          "rgb(54, 162, 235)",
          "rgb(255, 205, 86)",
          "rgb(18,194,0)",
          "rgb(178,0,255)",
          "rgb(255,104,42)",
          "rgb(0,0,0)",
          "rgb(164,0,0)",
        ],
        hoverOffset: 4,
      },
    ],
  };

  // @ts-ignore
  return (
    <>
      {visual_select == "rate" ? (
        <Line options={rate_options} data={rate_data} />
      ) : null}

      {visual_select == "loss" ? (
        <Line options={loss_options} data={loss_data} />
      ) : null}

      {visual_select == "frame" ? (
        <Row>
          <Col className={"col-4"}>
            <Doughnut
              data={frame_type_data}
              options={frame_options}
              title={"Frame types"}
            />
          </Col>
          <Col className={"col-4"}>
            <Doughnut data={ethernet_type_data} options={frame_options} />
          </Col>
          <Col className={"col-4"}>
            <Doughnut data={frame_size_data} options={frame_options} />
          </Col>
        </Row>
      ) : null}

      {visual_select == "rtt" ? (
        <Line options={rtt_options} data={rtt_data} />
      ) : null}

      <Row className={"text-center mb-3 mt-3"}>
        <Form onChange={(event: any) => set_visual_select(event.target.id)}>
          <Form.Check
            inline
            label="Traffic rates"
            type="radio"
            name={"visuals"}
            checked={visual_select == "rate"}
            id={`rate`}
          />
          <Form.Check
            inline
            label="Packet loss/Out of order"
            type="radio"
            name={"visuals"}
            checked={visual_select == "loss"}
            id={`loss`}
          />
          <Form.Check
            inline
            label="RTT"
            type="radio"
            name={"visuals"}
            checked={visual_select == "rtt"}
            id={`rtt`}
          />
          <Form.Check
            inline
            label="Frames"
            type="radio"
            name={"visuals"}
            checked={visual_select == "frame"}
            id={`frame`}
          />
        </Form>
      </Row>
    </>
  );
};

export default Visuals;
