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
import { Statistics, Stream, StreamSettings } from "../Interfaces";
import { UserOptions } from "jspdf-autotable";
import { jsPDF } from "jspdf";
import translate from "../../components/translation/Translate";

const encapsulation: { [key: number]: string } = {
  0: "None",
  1: "VLAN (+4 byte)",
  2: "Q-in-Q (+8 byte)",
  3: "MPLS (+4 byte / LSE)",
};

const getPortAndChannelFromPid = (
  pid: number | string,
  ports: {
    pid: number;
    port: number;
    channel: number;
    loopback: string;
    status: boolean;
  }[]
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

export const createTableOfContents = (
  doc: jsPDF,
  subHeaders: string[][],
  startX = 15,
  buffer = 2
) => {
  doc.setFontSize(12);
  let currentPage = 1;

  // Start position for the page number with buffer accounted
  const targetX = 180 - buffer;

  for (let i = 0; i < subHeaders.length; i++) {
    // Skip Table of Contents in Table of Contents
    if (i > 0) {
      let yPosition = 40 + (i - 1) * 10;
      let title = subHeaders[i][0];
      let pageNumberText = "Seite " + (i + 1).toString();

      // Add the chapter title
      doc.textWithLink(title, startX, yPosition, {
        pageNumber: currentPage,
      });

      // Add the page number
      doc.setFont("helvetica", "bold");
      doc.textWithLink(pageNumberText, targetX + buffer, yPosition, {
        pageNumber: currentPage,
      });
      doc.setFont("helvetica", "normal");

      // Calculate and add the dots with buffer space
      let textWidth = doc.getTextWidth(title);
      let dots = addDots(doc, title, targetX, startX, buffer);
      doc.text(dots, startX + textWidth + buffer, yPosition);
    }
    currentPage++;
  }
};

export const createTestExplanation = (
  doc: jsPDF,
  text: string,
  startX = 20,
  startY = 35,
  maxWidth = 170
) => {
  const splitTextToSize = doc.splitTextToSize(text, maxWidth);
  doc.text(splitTextToSize, startX, startY);
};

export const addHeadersAndFooters = (doc: jsPDF, elapsed_time: number) => {
  const totalPages = doc.getNumberOfPages();

  for (let index = 1; index <= totalPages; index++) {
    doc.setPage(index);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Test duration and report generation time
    doc.text("Report was generated on: " + formatTime(), 5, 5, {
      align: "left",
    });
    doc.text(
      "Test duration: " + secondsToTime(elapsed_time),
      pageWidth - 5,
      5,
      {
        align: "right",
      }
    );

    // Footer Page Number
    doc.text(
      "Page " + index + " of " + totalPages,
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
    doc.text("P4TG Network Report", pageWidth / 2, 15, { align: "center" });
    doc.setFont("helvetica", "normal");
  }
};

export const addSubHeaders = (doc: jsPDF, subHeaders: string[][]) => {
  let currentPage = 1;

  // Add Subheaders to every page
  for (let i = 0; i < subHeaders.length; i++) {
    doc.setPage(currentPage);
    doc.setFontSize(12);

    doc.text(subHeaders[i], 105, 25, { align: "center" });

    currentPage++;
  }
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
  ports: {
    pid: number;
    port: number;
    channel: number;
    loopback: string;
    status: boolean;
  }[],
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
  ports: {
    pid: number;
    port: number;
    channel: number;
    loopback: string;
    status: boolean;
  }[]
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
      : ["0", "0"];
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

export const dummyText =
  "Lorem, ipsum dolor sit amet consectetur adipisicing elit. Laborum id ducimus dignissimos. Nam minus pariatur vel. Nesciunt, tenetur placeat temporibus aspernatur, asperiores eum voluptates facere cumque corporis sequi amet, necessitatibus minus voluptas autem. Necessitatibus recusandae et repellat, assumenda sunt maxime incidunt voluptatum? Ullam numquam eos animi atque culpa? Commodi rerum maiores, obcaecati vitae autem officiis consectetur vel beatae nemo suscipit repudiandae non cupiditate neque nulla animi voluptatem amet sapiente. Inventore consequuntur iure repudiandae est ex eos neque nihil quae! Harum nemo nostrum veniam enim obcaecati, quidem aliquam unde corporis eos commodi illum nisi sed laudantium consectetur maiores magnam odit quos blanditiis minus. Corrupti, explicabo labore? Laudantium recusandae eos magnam cum quidem a repellendus ea laboriosam aliquam fugiat numquam, distinctio deserunt inventore eius facilis quaerat illo? Harum rem nulla ipsam aspernatur architecto consequatur eum quo dolor soluta recusandae. Minus nulla in iure quia amet perferendis disati rem quaerat odit fugiat ipsam facilis doloribus perspiciatis quae voluptates dolorum earum perferendis natus magnam et modi enim sequi exercitationem. Minima laudantium doloremque repellat commodi pariatur molestiae?";

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

export const splitArrayIntoChunks = <T,>(
  array: T[],
  chunkSize: number
): T[][] => {
  if (array.length % chunkSize !== 0) {
    throw new Error(`Array length must be divisible by ${chunkSize}`);
  }

  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
};
