import React, { act, useCallback, useEffect, useRef } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { Statistics, TimeStatistics } from "../../common/Interfaces";

import {
  get_rtt,
  get_frame_types,
  get_frame_stats,
  activePorts,
} from "../../common/StatisticUtils";
import {
  generateLineData,
  rtt_options,
  frame_options,
  loss_options,
  rate_options,
} from "../../common/VisualUtils";

type ChartRef = React.RefObject<HTMLDivElement>;

const createRefArray = (length: number): ChartRef[] => {
  return Array.from({ length }, () => React.createRef<HTMLDivElement>());
};

const HiddenGraphs = ({
  data,
  stats,
  port_mapping,
  onConvert,
}: {
  data: TimeStatistics;
  stats: Statistics;
  port_mapping: { [name: number]: number };
  onConvert: (data: string[]) => void;
}) => {
  // References to the summary graphs
  const refsSummary = useRef<ChartRef[]>(createRefArray(6));

  // References to the active port graphs, Object
  const activePortRefs = activePorts(port_mapping).reduce(
    (acc, port, index) => {
      acc[port.tx] = createRefArray(6);
      return acc;
    },
    {} as { [key: number]: ChartRef[] }
  );

  const download = useCallback(
    (refs: ChartRef[]) => {
      const data: string[] = [];

      refs.forEach((ref: any, index: number) => {
        const link = document.createElement("a");
        link.download = `chart-${index + 1}.png`;
        if (ref.current) {
          // @ts-ignore
          link.href = ref.current.toBase64Image();
          data.push(link.href);
        } else {
          console.error("Error in rendering" + index + 1 + "th chart");
        }
      });

      onConvert(data);
    },
    [onConvert]
  );

  useEffect(() => {
    const allRefs = [
      ...Object.values(activePortRefs).flat(),
      ...refsSummary.current,
    ];
    download(allRefs);
  }, []);

  return (
    <>
      {activePorts(port_mapping).map((v, i) => {
        return (
          <HiddenGraph
            data={data}
            stats={stats}
            port_mapping={{ [v.tx]: v.rx }}
            chartRefs={activePortRefs[v.tx]}
          />
        );
      })}
      <HiddenGraph
        data={data}
        stats={stats}
        port_mapping={port_mapping}
        chartRefs={refsSummary.current}
      />
    </>
  );
};

const HiddenGraph = ({
  data,
  stats,
  port_mapping,
  chartRefs,
}: {
  data: TimeStatistics;
  stats: Statistics;
  port_mapping: { [name: number]: number };
  chartRefs: any[];
}) => {
  const [
    rateChartRef,
    lossChartRef,
    rttChartRef,
    frameTypeChartRef,
    ethernetTypeChartRef,
    frameSizeChartRef,
  ] = chartRefs;

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

  const loss_options_hidden = {
    ...loss_options,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
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

  const rate_options_hidden = {
    ...rate_options,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
  };
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

  const [labels_rtt, line_data_rtt] = get_rtt(data, port_mapping);

  const rtt_options_hidden = {
    ...rtt_options,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
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

  const frame_options_hidden = {
    ...frame_options,
    aspectRatio: 5,
  };

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

  return (
    <div className="hidden-div">
      <Line options={rate_options_hidden} data={rate_data} ref={rateChartRef} />
      <Line options={loss_options_hidden} data={loss_data} ref={lossChartRef} />
      <Line data={rtt_data} options={rtt_options_hidden} ref={rttChartRef} />
      <Doughnut
        data={frame_type_data}
        options={frame_options_hidden}
        title={"Frame types"}
        ref={frameTypeChartRef}
      />
      <Doughnut
        data={ethernet_type_data}
        options={frame_options_hidden}
        ref={ethernetTypeChartRef}
      />
      <Doughnut
        data={frame_size_data}
        options={frame_options_hidden}
        ref={frameSizeChartRef}
      />
    </div>
  );
};

export default HiddenGraphs;
