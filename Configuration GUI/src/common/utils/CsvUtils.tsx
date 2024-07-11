import {
  calculateWeightedIATs,
  calculateWeightedRTTs,
  get_lost_packets,
  get_out_of_order_packets,
  formatFrameCount,
  formatNanoSeconds,
  activePorts,
  get_frame_stats,
  get_frame_types,
  get_rtt,
} from "../../common/utils/StatisticUtils";
import { frameSizes } from "../../common/utils/PdfUtils";
import { generateLineData } from "../../common/utils/VisualUtils";
import { Statistics, TimeStatistics } from "../Interfaces";

export const get_csv_data = (
  data: TimeStatistics,
  stats: Statistics,
  port_mapping: { [name: number]: number },
  calculatedValues: {
    iat_tx: any;
    iat_rx: any;
    rtt: any;
    total_tx: number;
    total_rx: number;
    lost_packets: number;
    out_of_order_packets: number;
    labels_tx: string[];
    line_data_tx: any[];
    labels_rx: string[];
    line_data_rx: any[];
    labels_loss: string[];
    line_data_loss: any[];
    labels_out_of_order: string[];
    line_data_out_of_order: any[];
    labels_rtt: string[];
    line_data_rtt: any[];
  },
  testNumber: number
) => {
  const {
    iat_tx,
    iat_rx,
    rtt,
    total_tx,
    total_rx,
    lost_packets,
    out_of_order_packets,
    labels_tx,
    line_data_tx,
    labels_rx,
    line_data_rx,
    labels_loss,
    line_data_loss,
    labels_out_of_order,
    line_data_out_of_order,
    labels_rtt,
    line_data_rtt,
  } = calculatedValues;

  const get_csv_summary_data = () => {
    const csvSummary = [
      [""],
      ["Test " + testNumber],
      [""],
      ["Summary"],
      [""],
      ["IAT", "TX", "RX"],
      [
        "iat mean",
        formatNanoSeconds(iat_tx.mean),
        formatNanoSeconds(iat_rx.mean),
      ],
      ["iat std", formatNanoSeconds(iat_tx.std), formatNanoSeconds(iat_rx.std)],
      ["iat mae", formatNanoSeconds(iat_tx.mae), formatNanoSeconds(iat_rx.mae)],
      [""],
      ["RTT"],
      ["mean rtt", formatNanoSeconds(rtt.mean)],
      ["max rtt", formatNanoSeconds(rtt.max)],
      ["min rtt", formatNanoSeconds(rtt.min)],
      ["number of rtt", formatFrameCount(rtt.n)],
      ["jitter", formatNanoSeconds(rtt.jitter)],
      ["lost packets", formatFrameCount(lost_packets)],
      ["out of order packets", formatFrameCount(out_of_order_packets)],
      [""],
      ["Frame type", "TX Count", "RX Count"],
      [
        "Multicast",
        formatFrameCount(
          get_frame_types(stats, port_mapping, "multicast")["tx"]
        ),
        formatFrameCount(
          get_frame_types(stats, port_mapping, "multicast")["rx"]
        ),
      ],
      [
        "Broadcast",
        formatFrameCount(
          get_frame_types(stats, port_mapping, "broadcast")["tx"]
        ),
        formatFrameCount(
          get_frame_types(stats, port_mapping, "broadcast")["rx"]
        ),
      ],
      [
        "Unicast",
        formatFrameCount(get_frame_types(stats, port_mapping, "unicast")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "unicast")["rx"]),
      ],
      [
        "VxLan",
        formatFrameCount(get_frame_types(stats, port_mapping, "vxlan")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "vxlan")["rx"]),
      ],
      [
        "Non-Unicast",
        formatFrameCount(
          get_frame_types(stats, port_mapping, "non-unicast")["tx"]
        ),
        formatFrameCount(
          get_frame_types(stats, port_mapping, "non-unicast")["rx"]
        ),
      ],
      ["Total", formatFrameCount(total_tx), formatFrameCount(total_rx)],
      [""],
      ["Ethernet type", "TX Count", "RX Count"],
      [
        "VLAN",
        formatFrameCount(get_frame_types(stats, port_mapping, "vlan")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "vlan")["rx"]),
      ],
      [
        "QinQ",
        formatFrameCount(get_frame_types(stats, port_mapping, "qinq")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "qinq")["rx"]),
      ],
      [
        "IPv4",
        formatFrameCount(get_frame_types(stats, port_mapping, "ipv4")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "ipv4")["rx"]),
      ],
      [
        "IPv6",
        formatFrameCount(get_frame_types(stats, port_mapping, "ipv6")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "ipv6")["rx"]),
      ],
      [
        "MPLS",
        formatFrameCount(get_frame_types(stats, port_mapping, "mpls")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "mpls")["rx"]),
      ],
      [
        "ARP",
        formatFrameCount(get_frame_types(stats, port_mapping, "arp")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "arp")["rx"]),
      ],
      [
        "Unknown",
        formatFrameCount(get_frame_types(stats, port_mapping, "unknown")["tx"]),
        formatFrameCount(get_frame_types(stats, port_mapping, "unknown")["rx"]),
      ],
      [""],
      ["Frame size", "TX Count", "RX Count"],
      [
        "0 - 63",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[0][1]),
            Number(frameSizes[0][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[0][1]),
            Number(frameSizes[0][2])
          )
        ),
      ],
      [
        "64",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[1][1]),
            Number(frameSizes[1][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[1][1]),
            Number(frameSizes[1][2])
          )
        ),
      ],
      [
        "65 - 127",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[2][1]),
            Number(frameSizes[2][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[2][1]),
            Number(frameSizes[2][2])
          )
        ),
      ],
      [
        "128 - 255",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[3][1]),
            Number(frameSizes[3][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[3][1]),
            Number(frameSizes[3][2])
          )
        ),
      ],
      [
        "256 - 511",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[4][1]),
            Number(frameSizes[4][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[4][1]),
            Number(frameSizes[4][2])
          )
        ),
      ],
      [
        "512 - 1023",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[5][1]),
            Number(frameSizes[5][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[5][1]),
            Number(frameSizes[5][2])
          )
        ),
      ],
      [
        "1024 - 1518",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[6][1]),
            Number(frameSizes[6][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[6][1]),
            Number(frameSizes[6][2])
          )
        ),
      ],
      [
        "1518 - 21519",
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "tx",
            Number(frameSizes[7][1]),
            Number(frameSizes[7][2])
          )
        ),
        formatFrameCount(
          get_frame_stats(
            stats,
            port_mapping,
            "rx",
            Number(frameSizes[7][1]),
            Number(frameSizes[7][2])
          )
        ),
      ],
      ["Total", formatFrameCount(total_tx), formatFrameCount(total_rx)],
      [""],
      ["line data tx"],
      [["time"], ...labels_tx],
      [
        ["data in GBit/s"],
        ...line_data_tx.map((val) => (val * 10 ** -9).toFixed(4)),
      ],
      [""],
      ["line data rx"],
      [["time"], ...labels_rx],
      [
        ["data in GBit/s"],
        ...line_data_rx.map((val) => (val * 10 ** -9).toFixed(4)),
      ],
      [""],
      ["rtt"],
      [["time"], ...labels_rtt],
      [["rtt in μs"], line_data_rtt],
      [""],
      ["packet loss"],
      [["time"], ...labels_loss],
      [["lost packets"], line_data_loss],
      [""],
      ["out of order packets"],
      [["time"], ...labels_out_of_order],
      [["out of order packets"], line_data_out_of_order],
    ];
    return csvSummary;
  };

  const get_csv_ports_data = () => {
    const csvPorts: any = [];

    activePorts(port_mapping).map((v, i, array) => {
      let mapping = { [v.tx]: v.rx };

      let ret_tx = 0;
      let ret_rx = 0;

      Object.keys(stats.frame_size).forEach((v) => {
        if (Object.keys(mapping).includes(v)) {
          stats.frame_size[v]["tx"].forEach((f: any) => {
            ret_tx += f.packets;
          });
        }

        if (Object.values(mapping).map(Number).includes(parseInt(v))) {
          stats.frame_size[v]["rx"].forEach((f: any) => {
            ret_rx += f.packets;
          });
        }
      });

      const lost_packets = get_lost_packets(stats, mapping);
      const total_rx = ret_rx;
      const total_tx = ret_tx;
      const out_of_order_packets = get_out_of_order_packets(stats, mapping);
      const iat_tx = calculateWeightedIATs("tx", stats, mapping);
      const iat_rx = calculateWeightedIATs("rx", stats, mapping);
      const rtt = calculateWeightedRTTs(stats, mapping);

      const [labels_tx, line_data_tx] = generateLineData(
        "tx_rate_l1",
        true,
        data,
        mapping
      );
      const [labels_rx, line_data_rx] = generateLineData(
        "rx_rate_l1",
        false,
        data,
        mapping
      );

      const [labels_loss, line_data_loss] = generateLineData(
        "packet_loss",
        false,
        data,
        mapping
      );
      const [labels_out_of_order, line_data_out_of_order] = generateLineData(
        "out_of_order",
        false,
        data,
        mapping
      );
      const [labels_rtt, line_data_rtt] = get_rtt(data, port_mapping);

      csvPorts.push(
        [""],
        [""],
        ["port pair: " + v.tx + " --> " + v.rx],
        [""],
        ["IAT", "TX", "RX"],
        [
          "iat mean",
          formatNanoSeconds(iat_tx.mean),
          formatNanoSeconds(iat_rx.mean),
        ],
        [
          "iat std",
          formatNanoSeconds(iat_tx.std),
          formatNanoSeconds(iat_rx.std),
        ],
        [
          "iat mae",
          formatNanoSeconds(iat_tx.mae),
          formatNanoSeconds(iat_rx.mae),
        ],
        [""],
        ["RTT"],
        ["mean rtt", formatNanoSeconds(rtt.mean)],
        ["max rtt", formatNanoSeconds(rtt.max)],
        ["min rtt", formatNanoSeconds(rtt.min)],
        ["number of rtt", formatFrameCount(rtt.n)],
        ["jitter", formatNanoSeconds(rtt.jitter)],
        ["lost packets", formatFrameCount(lost_packets)],
        ["out of order packets", formatFrameCount(out_of_order_packets)],
        [""],
        ["Frame type", "TX Count", "RX Count"],
        [
          "Multicast",
          formatFrameCount(get_frame_types(stats, mapping, "multicast")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "multicast")["rx"]),
        ],
        [
          "Broadcast",
          formatFrameCount(get_frame_types(stats, mapping, "broadcast")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "broadcast")["rx"]),
        ],
        [
          "Unicast",
          formatFrameCount(
            get_frame_types(stats, port_mapping, "unicast")["tx"]
          ),
          formatFrameCount(
            get_frame_types(stats, port_mapping, "unicast")["rx"]
          ),
        ],
        [
          "VxLan",
          formatFrameCount(get_frame_types(stats, port_mapping, "vxlan")["tx"]),
          formatFrameCount(get_frame_types(stats, port_mapping, "vxlan")["rx"]),
        ],
        [
          "Non-Unicast",
          formatFrameCount(
            get_frame_types(stats, mapping, "non-unicast")["tx"]
          ),
          formatFrameCount(
            get_frame_types(stats, mapping, "non-unicast")["rx"]
          ),
        ],
        ["Total", formatFrameCount(total_tx), formatFrameCount(total_rx)],
        [""],
        ["Ethernet type", "TX Count", "RX Count"],
        [
          "VLAN",
          formatFrameCount(get_frame_types(stats, mapping, "vlan")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "vlan")["rx"]),
        ],
        [
          "QinQ",
          formatFrameCount(get_frame_types(stats, mapping, "qinq")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "qinq")["rx"]),
        ],
        [
          "IPv4",
          formatFrameCount(get_frame_types(stats, mapping, "ipv4")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "ipv4")["rx"]),
        ],
        [
          "IPv6",
          formatFrameCount(get_frame_types(stats, mapping, "ipv6")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "ipv6")["rx"]),
        ],
        [
          "MPLS",
          formatFrameCount(get_frame_types(stats, mapping, "mpls")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "mpls")["rx"]),
        ],
        [
          "ARP",
          formatFrameCount(get_frame_types(stats, mapping, "arp")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "arp")["rx"]),
        ],
        [
          "Unknown",
          formatFrameCount(get_frame_types(stats, mapping, "unknown")["tx"]),
          formatFrameCount(get_frame_types(stats, mapping, "unknown")["rx"]),
        ],
        [""],
        ["Frame size", "TX Count", "RX Count"],
        [
          "0 - 63",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[0][1]),
              Number(frameSizes[0][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[0][1]),
              Number(frameSizes[0][2])
            )
          ),
        ],
        [
          "64",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[1][1]),
              Number(frameSizes[1][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[1][1]),
              Number(frameSizes[1][2])
            )
          ),
        ],
        [
          "65 - 127",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[2][1]),
              Number(frameSizes[2][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[2][1]),
              Number(frameSizes[2][2])
            )
          ),
        ],
        [
          "128 - 255",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[3][1]),
              Number(frameSizes[3][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[3][1]),
              Number(frameSizes[3][2])
            )
          ),
        ],
        [
          "256 - 511",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[4][1]),
              Number(frameSizes[4][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[4][1]),
              Number(frameSizes[4][2])
            )
          ),
        ],
        [
          "512 - 1023",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[5][1]),
              Number(frameSizes[5][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[5][1]),
              Number(frameSizes[5][2])
            )
          ),
        ],
        [
          "1024 - 1518",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[6][1]),
              Number(frameSizes[6][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[6][1]),
              Number(frameSizes[6][2])
            )
          ),
        ],
        [
          "1518 - 21519",
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "tx",
              Number(frameSizes[7][1]),
              Number(frameSizes[7][2])
            )
          ),
          formatFrameCount(
            get_frame_stats(
              stats,
              mapping,
              "rx",
              Number(frameSizes[7][1]),
              Number(frameSizes[7][2])
            )
          ),
        ],
        ["Total", formatFrameCount(total_tx), formatFrameCount(total_rx)],
        [""],
        ["line data tx"],
        [["time"], ...labels_tx],
        [
          ["data in GBit/s"],
          ...line_data_tx.map((val) => (val * 10 ** -9).toFixed(4)),
        ],
        [""],
        ["line data rx"],
        [["time"], ...labels_rx],
        [
          ["data in GBit/s"],
          ...line_data_rx.map((val) => (val * 10 ** -9).toFixed(4)),
        ],
        [""],
        ["rtt"],
        [["time"], ...labels_rtt],
        [["rtt in μs"], line_data_rtt],
        [""],
        ["packet loss"],
        [["time"], ...labels_loss],
        [["lost packets"], line_data_loss],
        [""],
        ["out of order packets"],
        [["time"], ...labels_out_of_order],
        [["out of order packets"], line_data_out_of_order]
      );
    });
    return csvPorts;
  };

  const csvSummary = get_csv_summary_data();
  const csvPorts = get_csv_ports_data();
  const csvData = [...csvSummary, ...csvPorts];

  return csvData;
};
