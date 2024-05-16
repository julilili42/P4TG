import React, { useCallback, useEffect, useRef, useState } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { Statistics, TimeStatistics } from "../../common/Interfaces";
import {
  get_rtt,
  secondsToTime,
  get_frame_types,
  get_frame_stats,
} from "../StatisticUtils";

interface HiddenGraphsProps {
  data: TimeStatistics;
  stats: Statistics;
  port_mapping: { [name: number]: number };
  onConvert: (data: string[]) => void;
}

const generateLineData = (
  data_key: string,
  use_key: boolean,
  data: TimeStatistics,
  port_mapping: { [name: number]: number }
): [string[], number[]] => {
  let cum_data: { [name: number]: number }[] = [];

  if (data_key in data) {
    if (use_key) {
      Object.keys(port_mapping).map((v) => {
        // @ts-ignore
        if (v in data[data_key]) {
          // @ts-ignore
          cum_data.push(data[data_key][v]);
        }
      });
    } else {
      Object.values(port_mapping).map((v) => {
        // @ts-ignore
        if (v in data[data_key]) {
          // @ts-ignore
          cum_data.push(data[data_key][v]);
        }
      });
    }
  }

  let ret_data = cum_data.reduce((acc, current) => {
    const key = Object.keys(current);
    const found = Object.keys(acc);

    key.forEach((k) => {
      if (Object.keys(acc).includes(k)) {
        // @ts-ignore
        acc[k] += current[k];
      } else {
        // @ts-ignore
        acc[k] = current[k];
      }
    });

    return acc;
  }, {});

  return [
    Object.keys(ret_data).map((v) => secondsToTime(parseInt(v))),
    Object.values(ret_data),
  ];
};

const HiddenGraphs: React.FC<HiddenGraphsProps> = ({
  data,
  stats,
  port_mapping,
  onConvert,
}) => {
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const chartRef3 = useRef(null);
  const chartRef4 = useRef(null);
  const chartRef5 = useRef(null);
  const chartRef6 = useRef(null);

  const download = useCallback(() => {
    const refs = [
      chartRef1,
      chartRef2,
      chartRef3,
      chartRef4,
      chartRef5,
      chartRef6,
    ];
    const data: string[] = [];

    refs.forEach((ref, index) => {
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
  }, []);

  /*
  Problem mit Generirung der Graphen, ein Datenpunkt fehlt? 
  */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      download();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

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

  const loss_options = {
    responsive: true,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "#Packets",
        },
        suggestedMin: 0,
        beginAtZero: true,
      },
      x: {
        title: {
          display: true,
          text: "Time",
        },
        ticks: {
          source: "auto",
          autoSkip: true,
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
        text: "",
      },
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

  const rate_options = {
    responsive: true,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "Gbit/s",
        },
        suggestedMin: 0,
        beginAtZero: true,
      },
      x: {
        title: {
          display: true,
          text: "Time",
        },
        ticks: {
          source: "auto",
          autoSkip: true,
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
        text: "",
      },
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

  const rtt_options = {
    responsive: true,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "μs",
        },
        suggestedMin: 0,
        beginAtZero: true,
      },
      x: {
        title: {
          display: true,
          text: "Time",
        },
        ticks: {
          source: "auto",
          autoSkip: true,
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
        text: "",
      },
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

  const frame_options = {
    responsive: true,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
        text: "Frame type",
      },
    },
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
      <Line data={rtt_data} options={rtt_options} ref={chartRef1} />
      <Line options={rate_options} data={rate_data} ref={chartRef2} />
      <Line options={loss_options} data={loss_data} ref={chartRef3} />
      <Doughnut
        data={frame_type_data}
        options={frame_options}
        title={"Frame types"}
        ref={chartRef4}
      />
      <Doughnut
        data={ethernet_type_data}
        options={frame_options}
        ref={chartRef5}
      />
      <Doughnut
        data={frame_size_data}
        options={frame_options}
        ref={chartRef6}
      />
    </div>
  );
};

export default HiddenGraphs;
