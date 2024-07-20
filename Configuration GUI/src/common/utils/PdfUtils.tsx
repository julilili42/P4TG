import {
  get_frame_types,
  formatFrameCount,
  get_frame_stats,
  formatNanoSeconds,
  activePorts,
  getStreamIDsByPort,
  formatTime,
  secondsToTime,
} from "./StatisticUtils";
import {
  Statistics,
  Stream,
  StreamSettings,
  TestMode,
  TrafficGenList,
  RFCTestResults,
  Port,
} from "../Interfaces";
import autoTable, { UserOptions } from "jspdf-autotable";
import { jsPDF } from "jspdf";
import translate from "../../components/translation/Translate";

const encapsulation: { [key: number]: string } = {
  0: "None",
  1: "VLAN (+4 byte)",
  2: "Q-in-Q (+8 byte)",
  3: "MPLS (+4 byte / LSE)",
};

export const getPortAndChannelFromPid = (
  pid: number | string,
  ports: Port[]
) => {
  const numericPid = typeof pid === "string" ? parseInt(pid) : pid;
  const pidData = ports.find((p) => p.pid === numericPid);
  return pidData
    ? { port: pidData.port, channel: pidData.channel }
    : { port: "N/A", channel: "N/A" };
};

export const addDots = (
  doc: jsPDF,
  text: string,
  targetX: number,
  startX: number,
  buffer: number
) => {
  let textWidth = doc.getTextWidth(text);
  let dots = "";
  while (doc.getTextWidth(dots) < targetX - startX - textWidth - buffer * 2) {
    dots += ".";
  }
  return dots;
};

export const addHeadersAndFooters = (
  doc: jsPDF,
  elapsed_time: number,
  testName: string,
  currentLanguage: string
) => {
  const totalPages = doc.getNumberOfPages();

  for (let index = 1; index <= totalPages; index++) {
    doc.setPage(index);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Test duration and report generation time
    doc.text(
      translate("Test duration:", currentLanguage) +
        " " +
        secondsToTime(elapsed_time),
      pageWidth - 5,
      5,
      {
        align: "right",
      }
    );

    // Footer Page Number
    doc.text(
      translate("Page", currentLanguage) +
        " " +
        index +
        " " +
        translate("of", currentLanguage) +
        " " +
        totalPages,
      pageWidth - 5,
      pageHeight - 5,
      {
        align: "right",
      }
    );

    // Github Link
    doc.textWithLink("P4TG@Github", pageWidth / 2, pageHeight - 5, {
      url: "https://github.com/uni-tue-kn/P4TG",
      align: "center",
    });

    // P4TG Network Report Header
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text("P4TG Network Report - " + testName, pageWidth / 2, 15, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
  }
};

export const addSubHeaders = (doc: jsPDF, subHeaders: string[]) => {
  let currentPage = 1;

  // Add Subheaders to every page
  for (let i = 0; i < subHeaders.length; i++) {
    doc.setPage(currentPage);
    doc.setFontSize(12);

    doc.text(subHeaders[i], 105, 25, { align: "center" });

    currentPage++;
  }
};

export const createToC = (
  doc: jsPDF,
  subHeadersMap: { [key: number]: string[] },
  testList: TrafficGenList,
  currentLanguage: string
) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  const startX = 15;
  const buffer = 2;
  const targetX = 180 - buffer;
  let currentPage = 1;
  let yPosition = 40;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  const numberOfRows = Object.values(subHeadersMap).reduce(
    (sum, array) => sum + array.length,
    0
  );

  const addExtraPage = numberOfRows > 23 ? 1 : 0;

  doc.setFont("helvetica", "normal");
  doc.text("Test explanation", startX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.text(
    translate("Page ", currentLanguage) + String(2 + addExtraPage),
    targetX + buffer,
    yPosition
  );
  doc.setFont("helvetica", "normal");

  const textWidthTestExplanation = doc.getTextWidth("Test explanation");
  const dotsTestExplanation = addDots(
    doc,
    "Test explanation",
    targetX,
    startX,
    buffer
  );
  doc.text(
    dotsTestExplanation,
    startX + textWidthTestExplanation + buffer,
    yPosition
  );

  yPosition += 10;

  doc.setFont("helvetica", "normal");
  doc.text("Term explanation", startX, yPosition);
  doc.setFont("helvetica", "bold");
  doc.text(
    translate("Page ", currentLanguage) + String(3 + addExtraPage),
    targetX + buffer,
    yPosition
  );
  doc.setFont("helvetica", "normal");
  const textWidthTermExplanation = doc.getTextWidth("Term explanation");
  const dotsTermExplanation = addDots(
    doc,
    "Term explanation",
    targetX,
    startX,
    buffer
  );
  doc.text(
    dotsTermExplanation,
    startX + textWidthTermExplanation + buffer,
    yPosition
  );

  yPosition += 10;

  Object.keys(subHeadersMap).forEach((testNumber, index) => {
    const testId = parseInt(testNumber);
    const testName = testList[testId].name || `Test ${testId}`;

    if (yPosition > 290) {
      yPosition = 40;
      doc.addPage();
    }

    doc.setFont("helvetica", "bold");
    doc.text(testName, startX, yPosition);
    doc.setFont("helvetica", "normal");
    yPosition += 10;

    const subHeaders = subHeadersMap[testNumber as any];
    subHeaders.forEach((header, subIndex) => {
      const title = header;
      const pageNumberText =
        translate("Page", currentLanguage) +
        " " +
        (currentPage + subIndex + addExtraPage + 3).toString();

      doc.text(title, startX, yPosition);

      doc.setFont("helvetica", "bold");
      doc.text(pageNumberText, targetX + buffer, yPosition);
      doc.setFont("helvetica", "normal");

      const textWidth = doc.getTextWidth(title);
      const dots = addDots(doc, title, targetX, startX, buffer);
      doc.text(dots, startX + textWidth + buffer, yPosition);

      yPosition += 10;
      if (yPosition > 300) {
        yPosition = 40;
        doc.addPage();
        currentPage += subIndex + 1;
      }
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text("P4TG Network Report", pageWidth / 2, 15, { align: "center" });
    doc.setFont("helvetica", "normal");

    doc.setFontSize(12);
    doc.text("Table of Contents", 105, 25, { align: "center" });

    currentPage += subHeaders.length;

    doc.setFontSize(8);
    doc.text(
      translate("Report was generated on:", currentLanguage) +
        " " +
        formatTime(),
      5,
      5,
      {
        align: "left",
      }
    );
    doc.setFontSize(12);
  });

  doc.setFontSize(8);

  doc.textWithLink("P4TG@Github", pageWidth / 2, pageHeight - 5, {
    url: "https://github.com/uni-tue-kn/P4TG",
    align: "center",
  });

  return doc;
};

const glossary = [
  [
    "CBR (Constant Bit Rate)",
    "A transmission mode where the data rate remains constant regardless of the amount of data being transmitted.",
  ],
  [
    "Poisson Mode",
    "A traffic generation mode where packets are sent according to a Poisson distribution, which is used to model random traffic arrivals.",
  ],
  [
    "Monitor Mode",
    "A mode in which the network traffic is monitored without injecting any additional traffic, used for passive analysis.",
  ],
  [
    "P4TG (P4-based 1 Tb/s traffic generator)",
    "A traffic generator based on the P4 programming model capable of generating data at a rate of 1 Terabit per second.",
  ],
  [
    "Packet Loss",
    "The failure of one or more transmitted packets to arrive at their destination, indicating network inefficiency.",
  ],
  [
    "RTT (Round-Trip Time)",
    "The time it takes for a signal to travel from the source to the destination and back again, used to measure network latency.",
  ],
  [
    "IAT (Inter-Arrival Time)",
    "The time interval between the arrivals of consecutive packets, used to assess the consistency of packet delivery.",
  ],
  [
    "Jitter",
    "The variation in packet arrival times, which can impact the quality of real-time communications like voice and video.",
  ],
  [
    "TX (Transmit)",
    "Refers to the transmission of data packets from a source port.",
  ],
  [
    "RX (Receive)",
    "Refers to the reception of data packets at a destination port.",
  ],
  [
    "VxLan (Virtual Extensible LAN)",
    "A network virtualization technology that improves scalability by encapsulating Ethernet frames within UDP packets.",
  ],
  ["Frame Size", "The size of a data packet or frame measured in bytes."],
  [
    "Frame Loss Ratio",
    "The ratio of lost frames to the total transmitted frames, indicating the efficiency of data transmission.",
  ],
  [
    "MAE (Mean Absolute Error)",
    "A measure of the average absolute difference between the transmitted and received inter-arrival times, indicating timing precision.",
  ],
  [
    "Multicast",
    "The transmission of data to multiple recipients simultaneously within a network.",
  ],
  [
    "Unicast",
    "The transmission of data to a single specific recipient within a network.",
  ],
  [
    "VLAN (Virtual Local Area Network)",
    "A network configuration that allows multiple distinct networks to coexist on a single physical network infrastructure.",
  ],
  [
    "QinQ (802.1ad)",
    "A network protocol that allows for multiple VLANs to be nested within each other, providing increased scalability.",
  ],
  [
    "MPLS (Multiprotocol Label Switching)",
    "A technique for directing data packets through a network based on short path labels rather than long network addresses.",
  ],
  [
    "IAT Precision",
    "A mode where the traffic generator aims to maintain precise inter-arrival times between packets.",
  ],
  [
    "Rate Precision",
    "A mode where the traffic generator aims to maintain a precise data rate for packet transmission.",
  ],
];

const ReportExplanation =
  "This report provides a comprehensive overview of the network performance tests conducted using the P4-based 1 Tb/s traffic generator (P4TG). The P4TG is utilized to generate high-speed network traffic, enabling the evaluation of various network parameters under controlled conditions. These tests are designed to measure the network's ability to handle high-speed data transfer, ensuring both efficiency and reliability. Key metrics such as packet loss, round-trip time (RTT), inter-arrival times (IAT), and jitter were recorded to provide insights into the network's performance. The following sections summarize the recorded statistics in the form of data and corresponding graphs, highlighting the network's strengths and identifying potential areas for improvement.";

const rfcExplanation =
  "The Request for Comments (RFC) 2544, titled 'Benchmarking Methodology for Network Interconnect Devices', provides standardized testing procedures to evaluate the performance metrics of network devices at Layer 2. This methodology enables consistent comparison across manufacturers and devices. In this test run, all (or some) of the RFC 2544 tests were conducted. The throughput test measures the maximum data rate at which no frames are lost. Latency is defined as the time it takes for a frame to travel through the device under test (DUT). Specifically, the one-way latency is used, which measures the time interval between the transmission of a frame by the source and its reception at the destination. The frame loss rate quantifies the percentage of frames that were not forwarded by the DUT under constant load conditions.The back - to - back frames test assesses the device's capability to handle consecutive frames with minimal inter-frame gaps. The system recovery test determines how quickly the DUT returns to normal operation after experiencing an overload condition. Lastly, the reset test measures the time it takes for the DUT to resume normal operation after a device or software reset. In the following table the results of the RFC 2544 tests are summarized.";

export const createTestExplanation = (
  doc: jsPDF,
  test_mode: TestMode,
  rfc_results: RFCTestResults,
  traffic_gen_list: TrafficGenList,
  startX = 20,
  startY = 35,
  maxWidth = 170
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const p4tgExplanation = doc.splitTextToSize(ReportExplanation, maxWidth);
  doc.text("Test explanation", pageWidth / 2, 25, { align: "center" });
  doc.text(p4tgExplanation, startX, startY);

  if (test_mode === TestMode.PROFILE) {
    const frame_size = traffic_gen_list[1].streams[0].frame_size ?? "N/A";

    doc.setFontSize(12);
    doc.text("RFC explanation", pageWidth / 2, 3 * startY - 10, {
      align: "center",
    });
    const rfcExplenation = doc.splitTextToSize(rfcExplanation, maxWidth);
    doc.text(rfcExplenation, startX, 3 * startY);

    doc.text(
      "Used frame sized for RFC2544: " + frame_size + " bytes",
      pageWidth / 2,
      5.3 * startY,
      {
        align: "center",
      }
    );
    autoTable(doc, {
      startY: 5.5 * startY,
      head: [
        [
          "Test",
          "Throughput",
          "Latency",
          "Frame-Loss",
          "Back-To-Back Frames",
          "Reset",
        ],
      ],
      body: [
        [
          "Value",
          rfc_results.throughput == null
            ? "N/A"
            : rfc_results.throughput.toFixed(3) + " Gbps",
          rfc_results.latency == null
            ? "N/A"
            : rfc_results.latency.toFixed(3) + " Gbps",
          rfc_results.frame_loss_rate == null
            ? "N/A"
            : rfc_results.frame_loss_rate.toFixed(3) + " Gbps",
          rfc_results.back_to_back == null
            ? "N/A"
            : rfc_results.back_to_back.toFixed(3) + " Gbps",
          rfc_results.reset == null
            ? "N/A"
            : rfc_results.reset.toFixed(3) + " Gbps",
        ],
      ],
      theme: "plain",
      styles: { fontSize: 10 },
      margin: { left: startX },
      columnStyles: {},
    });
  }

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("P4TG Network Report", pageWidth / 2, 15, { align: "center" });
  doc.setFont("helvetica", "normal");

  doc.setFontSize(12);
  doc.text("Test explanation", 105, 25, { align: "center" });

  doc.setFontSize(8);

  doc.textWithLink("P4TG@Github", pageWidth / 2, pageHeight - 5, {
    url: "https://github.com/uni-tue-kn/P4TG",
    align: "center",
  });

  doc.addPage();

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text("P4TG Network Report", pageWidth / 2, 15, { align: "center" });
  doc.setFont("helvetica", "normal");

  doc.setFontSize(12);
  doc.text("Term explanation", 105, 25, { align: "center" });

  autoTable(doc, {
    startY: startY,
    head: [["Term", "Explanation"]],
    body: glossary,
    theme: "plain",
    styles: { fontSize: 10 },
    margin: { left: startX },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 110 },
    },
  });

  doc.setFontSize(8);

  doc.textWithLink("P4TG@Github", pageWidth / 2, pageHeight - 5, {
    url: "https://github.com/uni-tue-kn/P4TG",
    align: "center",
  });
};

export const shouldDrawLine = (
  columnIndex: number,
  indicesToDraw: number[]
): boolean => {
  return indicesToDraw.includes(columnIndex);
};

export const createAutoTableConfig = (
  doc: jsPDF,
  columns: string[],
  rows: (string | number | boolean)[][],
  columnStyles: { [key: number]: { cellWidth: number } },
  indicesToDraw: number[],
  options?: any,
  applyRttRowColSkip: boolean = false
): UserOptions => {
  const modifiedOptions: UserOptions = {
    ...options,
    head: [columns],
    body: rows,
    theme: "plain",
    columnStyles: columnStyles,
    didDrawCell: (data: any) => {
      const shouldDraw =
        !applyRttRowColSkip ||
        (applyRttRowColSkip &&
          ((data.column.index != 3 && data.column.index != 4) ||
            data.row.index <= 3));

      if (shouldDraw && shouldDrawLine(data.column.index, indicesToDraw)) {
        doc.setDrawColor(0);
        doc.setLineWidth(0.1);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
  };

  return modifiedOptions;
};

export const generateStreamStatusArray = (
  indices: number[],
  arraySize: number
): string[] =>
  Array.from({ length: arraySize }, (_, i) =>
    indices.includes(i + 1) ? "on" : "off"
  );

export const formatPortStreamCols = (streams: Stream[]): string[] => {
  const cols = ["TX Port", "RX Port"].concat(
    streams.map((stream) => `Stream ${stream.app_id}`)
  );
  return cols;
};

export const formatPortStreamRows = (
  port_mapping: { [name: number]: number },
  ports: Port[],
  stream_settings: StreamSettings[],
  streams: Stream[],
  portStreamCols: string[]
) => {
  return activePorts(port_mapping).map((stream) => {
    const portInfo = [
      `${getPortAndChannelFromPid(stream.tx, ports).port} (${stream.tx})`,
      `${getPortAndChannelFromPid(stream.rx, ports).port} (${stream.rx})`,
    ];

    const streamIDs = getStreamIDsByPort(stream.tx, stream_settings, streams);
    const streamStatus = generateStreamStatusArray(
      streamIDs,
      portStreamCols.length - 2
    );

    return portInfo.concat(streamStatus);
  });
};

export const formatActivePortsRows = (
  port_mapping: { [name: number]: number },
  ports: Port[]
): (string | number)[][] => {
  const rows = [];

  for (const [txPid, rxPid] of Object.entries(port_mapping)) {
    const txData = getPortAndChannelFromPid(txPid, ports);
    const rxData = getPortAndChannelFromPid(rxPid, ports);

    rows.push([
      txData.port,
      txData.channel,
      txPid,
      rxData.port,
      rxData.channel,
      rxPid,
    ]);
  }
  return rows;
};

export const formatActiveStreamRows = (
  streams: Stream[]
): (string | number | boolean)[][] => {
  const row = streams.map((stream) => [
    stream.app_id,
    stream.frame_size + " bytes",
    stream.traffic_rate + " Gbps",
    stream.burst == 1 ? "IAT Precision" : "Rate Precision",
    stream.vxlan,
    encapsulation[stream.encapsulation],
    stream.number_of_lse,
  ]);
  return row;
};

export const activePortsCols = [
  "Port TX",
  "Channel TX",
  "PID TX",
  "Port RX",
  "Channel RX",
  "PID RX",
];

export const frameEthernetCols = [
  "Frame Type",
  "#TX Count",
  "#RX Count",
  "",
  "Ethernet Type",
  "#TX Count",
  "#RX Count",
];

export const frameEthernetRow = (
  stats: Statistics,
  mapping: { [name: number]: number },
  label1: string,
  label2: string,
  total_tx: number,
  total_rx: number
) => {
  const emptyCell = [""];
  let frameData1;

  if (label1 === "Total") {
    frameData1 = [formatFrameCount(total_tx), formatFrameCount(total_rx)];
  } else {
    frameData1 = label1
      ? [
          formatFrameCount(
            get_frame_types(stats, mapping, label1.toLowerCase())["tx"]
          ),
          formatFrameCount(
            get_frame_types(stats, mapping, label1.toLowerCase())["rx"]
          ),
        ]
      : ["", ""];
  }

  const frameData2 = label2
    ? [
        formatFrameCount(
          get_frame_types(stats, mapping, label2.toLowerCase())["tx"]
        ),
        formatFrameCount(
          get_frame_types(stats, mapping, label2.toLowerCase())["rx"]
        ),
      ]
    : ["0", "0"];

  return [
    label1 ?? "",
    ...frameData1,
    ...emptyCell,
    label2 ?? "",
    ...frameData2,
  ];
};

export const frameTypes = [
  {
    label1: "Multicast",
    label2: "VLAN",
  },
  {
    label1: "Broadcast",
    label2: "QinQ",
  },
  { label1: "Unicast", label2: "IPv4" },
  { label1: "VxLan", label2: "IPv6" },
  {
    label1: "Non-Unicast",
    label2: "MPLS",
  },
  { label1: null, label2: "ARP" },
  { label1: "Total", label2: "Unknown" },
];

export const frameSizes = [
  ["0 - 63", 0, 63],
  ["64", 64, 64],
  ["65 - 127", 65, 127],
  ["128 - 255", 128, 255],
  ["256 - 511", 256, 511],
  ["512 - 1023", 512, 1023],
  ["1024 - 1518", 1024, 1518],
  ["1518 - 21519", 1518, 21519],
  ["Total"],
];

export const frameSizeCountCols = [
  "Frame Size",
  "#TX Count",
  "%",
  "",
  "Frame Size",
  "#RX Count",
  "%",
];

export const frameSizeCountRow = (
  stats: Statistics,
  mapping: { [name: number]: number },
  label: string,
  low: number,
  high: number,
  total_tx: number,
  total_rx: number
) => {
  const emptyFields = new Array(1).fill("");
  const absolute_tx = get_frame_stats(stats, mapping, "tx", low, high);
  const relative_tx =
    absolute_tx > 0
      ? ((absolute_tx * 100) / total_tx).toFixed(2) + "%"
      : 0 + "%";
  const absolute_rx = get_frame_stats(stats, mapping, "rx", low, high);
  const relative_rx =
    absolute_rx > 0
      ? ((absolute_rx * 100) / total_rx).toFixed(2) + "%"
      : 0 + "%";
  return [
    label,
    formatFrameCount(absolute_tx),
    relative_tx,
    ...emptyFields,
    label,
    formatFrameCount(absolute_rx),
    relative_rx,
  ];
};

export const modes: { [key: number]: string } = {
  0: "Generation Mode",
  1: "CBR",
  2: "Mpps",
  3: "Poisson",
  4: "Monitor",
};

export const activeStreamCols = [
  "Stream ID",
  "Frame Size",
  "Rate",
  "Mode",
  "VxLan",
  "Encapsulation",
  "Options",
];

export const frameStatsRTTCols = ["Type", "", "", "Type", ""];

export const formatFrameStatsRTTRows = (data: any) => {
  const {
    lost_packets,
    total_rx,
    out_of_order_packets,
    iat_tx,
    iat_rx,
    rtt,
    currentLanguage,
  } = data;

  const frameLossRatio =
    lost_packets > 0
      ? ((lost_packets * 100) / (lost_packets + total_rx)).toFixed(2) + " %"
      : "0.00 %";

  const rows = [
    [
      "Lost Frames",
      formatFrameCount(lost_packets),
      "",
      "TX IAT",
      formatNanoSeconds(iat_tx.mean),
    ],
    [
      "Frame Loss Ratio",
      frameLossRatio,
      "",
      "MAE (TX IAT)",
      formatNanoSeconds(iat_tx.mae),
    ],
    [
      "Out of Order",
      formatFrameCount(out_of_order_packets),
      "",
      "RX IAT",
      formatNanoSeconds(iat_rx.mean),
    ],
    [
      "Current RTT",
      formatNanoSeconds(rtt.current),
      "",
      "MAE (RX IAT)",
      formatNanoSeconds(iat_rx.mae),
    ],
    ["RTT", formatNanoSeconds(rtt.mean), "", "", ""],
    ["Minimum RTT", formatNanoSeconds(rtt.min), "", "", ""],
    [
      translate("Maximum", currentLanguage) + " RTT",
      formatNanoSeconds(rtt.max),
      "",
      "",
      "",
    ],
    ["Jitter", formatNanoSeconds(rtt.jitter), "", "", ""],
    ["#RTT", rtt.n, "", "", ""],
  ];

  return rows;
};
