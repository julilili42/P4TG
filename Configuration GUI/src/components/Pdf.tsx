import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "react-bootstrap";
import { Statistics, Stream, GenerationMode } from "../common/Interfaces";
import { get } from "../common/API";
import {
  get_frame_types,
  get_lost_packets,
  get_out_of_order_packets,
  get_frame_stats,
  formatFrameCount,
  calculateWeightedRTTs,
  calculateWeightedIATs,
  formatNanoSeconds,
} from "./StatisticUtils";
import { secondsToTime } from "./SendReceiveMonitor";
import translate from "./Translate";

const formatTime = (): string => {
  const LeadingZero = (num: number) => {
    return num < 10 ? "0" + num : num;
  };

  const date = new Date();

  const showDate =
    LeadingZero(date.getDate()) +
    "." +
    LeadingZero(date.getMonth() + 1) +
    "." +
    LeadingZero(date.getFullYear());

  const showTime =
    LeadingZero(date.getHours()) +
    ":" +
    LeadingZero(date.getMinutes()) +
    ":" +
    LeadingZero(date.getSeconds());
  return showDate + " " + showTime;
};

const DownloadPdfButton = React.memo(
  ({
    stats,
    port_mapping,
  }: {
    stats: Statistics;
    port_mapping: { [name: number]: number };
  }) => {
    const [rtt, set_rtt] = useState({
      mean: 0,
      max: 0,
      min: 0,
      jitter: 0,
      n: 0,
      current: 0,
    });
    const [iat_tx, set_iat_tx] = useState({ mean: 0, std: 0, n: 0, mae: 0 });
    const [iat_rx, set_iat_rx] = useState({ mean: 0, std: 0, n: 0, mae: 0 });
    const [total_tx, set_total_tx] = useState(0);
    const [total_rx, set_total_rx] = useState(0);
    const [lost_packets, set_lost_packets] = useState(0);
    const [out_of_order_packets, set_out_of_order_packets] = useState(0);
    const [elapsed_time, set_elapsed_time] = useState(0);
    const [ports, set_ports] = useState<
      {
        pid: number;
        port: number;
        channel: number;
        loopback: string;
        status: boolean;
      }[]
    >([]);
    const [streams, set_streams] = useState<Stream[]>(
      JSON.parse(localStorage.getItem("streams") ?? "") ?? []
    );
    const [mode, set_mode] = useState(
      parseInt(localStorage.getItem("gen-mode") || String(GenerationMode.NONE))
    );
    const loadPorts = async () => {
      let stats = await get({ route: "/ports" });

      if (stats.status === 200) {
        set_ports(stats.data);
      }
    };

    const setValues = (mapping: { [name: number]: number }) => {
      let ret_tx = 0;
      let ret_rx = 0;

      Object.keys(stats.frame_size).forEach((v) => {
        if (Object.keys(mapping).includes(v)) {
          stats.frame_size[v]["tx"].forEach((f) => {
            ret_tx += f.packets;
          });
        }

        if (Object.values(mapping).map(Number).includes(parseInt(v))) {
          stats.frame_size[v]["rx"].forEach((f) => {
            ret_rx += f.packets;
          });
        }
      });
      loadPorts();
      set_total_tx(ret_tx);
      set_total_rx(ret_rx);
      set_rtt(calculateWeightedRTTs(stats, mapping));
      set_iat_tx(calculateWeightedIATs("tx", stats, mapping));
      set_iat_rx(calculateWeightedIATs("rx", stats, mapping));
      set_lost_packets(get_lost_packets(stats, mapping));
      set_out_of_order_packets(get_out_of_order_packets(stats, mapping));
      if (stats.elapsed_time > 0) {
        set_elapsed_time(stats.elapsed_time);
      }
    };

    useEffect(() => {
      setValues(port_mapping);
    }, [stats, port_mapping]);

    const [currentLanguage, setCurrentLanguage] = useState(
      localStorage.getItem("language") || "en-US"
    );

    useEffect(() => {
      const interval = setInterval(() => {
        const storedLanguage = localStorage.getItem("language") || "en-US";
        if (storedLanguage != currentLanguage) {
          setCurrentLanguage(storedLanguage);
        }
      }, 200);
      return () => clearInterval(interval);
    }, [currentLanguage]);

    const shouldDrawLine = (
      columnIndex: number,
      indicesToDraw: number[]
    ): boolean => {
      return indicesToDraw.includes(columnIndex);
    };

    const activePorts = (): { tx: number; rx: number }[] => {
      let active_ports: { tx: number; rx: number }[] = [];
      let exists: number[] = [];

      Object.keys(port_mapping).forEach((tx_port: string) => {
        let port = parseInt(tx_port);
        exists.push(port);
        active_ports.push({ tx: port, rx: port_mapping[port] });
      });

      return active_ports;
    };

    const handleDownloadPdf = () => {
      const doc = new jsPDF("p", "mm", [297, 210]);

      const columnsT0 = [
        "Port TX",
        "Channel TX",
        "PID TX",
        "Port RX",
        "Channel RX",
        "PID RX",
      ];

      const rowsT0 = [];
      for (const [txPid, rxPid] of Object.entries(port_mapping)) {
        const tx = ports.find((port) => port.pid === parseInt(txPid));
        const txPort = tx?.port ?? "N/A";
        const txChannel = tx?.channel ?? "N/A";

        const rx = ports.find((port) => port.pid === rxPid);
        const rxPort = rx?.port ?? "N/A";
        const rxChannel = rx?.channel ?? "N/A";

        rowsT0.push([txPort, txChannel, txPid, rxPort, rxChannel, rxPid]);
      }

      /*
        Port Mapping Table 
      */
      autoTable(doc, {
        head: [columnsT0],
        body: rowsT0,
        theme: "plain",
        styles: {
          halign: "center",
        },
        startY: 25,
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30 },
        },
        didDrawCell: (data) => {
          if (shouldDrawLine(data.column.index, [0, 1, 2, 3, 4, 5])) {
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
      });

      const columnsT1 = ["Type", "", "", "Type", ""];

      function formatRowsT1(data: any) {
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
            ? ((lost_packets * 100) / (lost_packets + total_rx)).toFixed(2) +
              " %"
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
      }

      const rowsT1 = formatRowsT1({
        lost_packets,
        total_rx,
        out_of_order_packets,
        iat_tx,
        iat_rx,
        rtt,
        currentLanguage,
      });

      /*
      Statistics Table
      */
      autoTable(doc, {
        head: [columnsT1],
        body: rowsT1,
        theme: "plain",
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30 },
        },
        didDrawCell: (data) => {
          if (
            !(
              (data.column.index == 3 || data.column.index == 4) &&
              data.row.index > 3
            )
          ) {
            if (shouldDrawLine(data.column.index, [0, 1, 3, 4])) {
              doc.setDrawColor(0);
              doc.setLineWidth(0.1);
              doc.line(
                data.cell.x,
                data.cell.y + data.cell.height,
                data.cell.x + data.cell.width,
                data.cell.y + data.cell.height
              );
            }
          }
        },
      });

      const columnsT2 = [
        "Frame Type",
        "#TX Count",
        "#RX Count",
        "",
        "Ethernet Type",
        "#TX Count",
        "#RX Count",
      ];

      const rowT2 = (
        label1: string,
        label2: string,
        mapping: { [name: number]: number },
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

      const frameTypes = [
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

      const rowsT2 = frameTypes.map((type) =>
        rowT2(
          type.label1 as string,
          type.label2 as string,
          port_mapping,
          total_tx,
          total_rx
        )
      );

      /*
      Frame and Ethernet Type Table
      */
      autoTable(doc, {
        head: [columnsT2],
        body: rowsT2,
        theme: "plain",
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 10 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
        },
        didDrawCell: (data) => {
          if (shouldDrawLine(data.column.index, [0, 1, 2, 4, 5, 6])) {
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
      });

      const columnsT3 = [
        "Frame Size",
        "#TX Count",
        "%",
        "",
        "Frame Size",
        "#RX Count",
        "%",
      ];

      const frameSizes = [
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

      const rowT3 = (
        label: string,
        low: number,
        high: number,
        mapping: { [name: number]: number },
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

      const rowsT3 = [
        ...frameSizes.map(([label, low, high]) =>
          label != "Total"
            ? rowT3(
                label as string,
                low as number,
                high as number,
                port_mapping,
                total_tx,
                total_rx
              )
            : [
                "Total",
                formatFrameCount(total_tx),
                "",
                "",
                "Total",
                formatFrameCount(total_rx),
                "",
              ]
        ),
      ];
      /*
      Frame Size Count Table 
      */
      autoTable(doc, {
        head: [columnsT3],
        body: rowsT3,
        theme: "plain",
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 10 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
        },
        didDrawCell: (data) => {
          if (shouldDrawLine(data.column.index, [0, 1, 2, 4, 5, 6])) {
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
      });

      let pageBreak = false;

      if (doc.getNumberOfPages() > 1) {
        pageBreak = true;
      }

      doc.addPage();

      activePorts().map((v, i, array) => {
        let mapping: { [name: number]: number } = { [v.tx]: v.rx };

        let ret_tx = 0;
        let ret_rx = 0;

        Object.keys(stats.frame_size).forEach((v) => {
          if (Object.keys(mapping).includes(v)) {
            stats.frame_size[v]["tx"].forEach((f) => {
              ret_tx += f.packets;
            });
          }

          if (Object.values(mapping).map(Number).includes(parseInt(v))) {
            stats.frame_size[v]["rx"].forEach((f) => {
              ret_rx += f.packets;
            });
          }
        });

        const lost_packets = get_lost_packets(stats, mapping);
        const total_rx = ret_rx;
        const total_tx = ret_tx;
        const out_of_order_packets = get_out_of_order_packets(stats, mapping);
        const iats_tx = calculateWeightedIATs("tx", stats, mapping);
        const iats_rx = calculateWeightedIATs("rx", stats, mapping);
        const rtt = calculateWeightedRTTs(stats, mapping);

        const rowsT4 = formatRowsT1({
          lost_packets: lost_packets,
          total_rx: total_rx,
          out_of_order_packets: out_of_order_packets,
          iat_tx: iats_tx,
          iat_rx: iats_rx,
          rtt: rtt,
          currentLanguage: currentLanguage,
        });

        autoTable(doc, {
          head: [columnsT1],
          body: rowsT4,
          theme: "plain",
          startY: 25,
          columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 20 },
            2: { cellWidth: 40 },
            3: { cellWidth: 30 },
          },
          didDrawCell: (data) => {
            if (
              !(
                (data.column.index == 3 || data.column.index == 4) &&
                data.row.index > 3
              )
            ) {
              if (shouldDrawLine(data.column.index, [0, 1, 3, 4])) {
                doc.setDrawColor(0);
                doc.setLineWidth(0.1);
                doc.line(
                  data.cell.x,
                  data.cell.y + data.cell.height,
                  data.cell.x + data.cell.width,
                  data.cell.y + data.cell.height
                );
              }
            }
          },
        });

        const rowsT5 = frameTypes.map((type) =>
          rowT2(
            type.label1 as string,
            type.label2 as string,
            mapping,
            total_tx,
            total_rx
          )
        );

        autoTable(doc, {
          head: [columnsT2],
          body: rowsT5,
          theme: "plain",
          styles: {
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 10 },
            4: { cellWidth: 30 },
            5: { cellWidth: 25 },
          },
          didDrawCell: (data) => {
            if (shouldDrawLine(data.column.index, [0, 1, 2, 4, 5, 6])) {
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
        });

        const rowsT6 = [
          ...frameSizes.map(([label, low, high]) =>
            label != "Total"
              ? rowT3(
                  label as string,
                  low as number,
                  high as number,
                  mapping,
                  total_tx,
                  total_rx
                )
              : [
                  "Total",
                  formatFrameCount(total_tx),
                  "",
                  "",
                  "Total",
                  formatFrameCount(total_rx),
                  "",
                ]
          ),
        ];

        autoTable(doc, {
          head: [columnsT3],
          body: rowsT6,
          theme: "plain",
          styles: {
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 10 },
            4: { cellWidth: 30 },
            5: { cellWidth: 25 },
          },
          didDrawCell: (data) => {
            if (shouldDrawLine(data.column.index, [0, 1, 2, 4, 5, 6])) {
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
        });

        if (i < array.length - 1) {
          doc.addPage();
        }
      });

      doc.addPage();

      const modes: { [key: number]: string } = {
        0: "Generation Mode",
        1: "CBR",
        2: "Mpps",
        3: "Poisson",
        4: "Monitor",
      };

      const columnsT7 = [
        "Stream ID",
        "Frame Size",
        "Rate",
        "Mode",
        "VxLan",
        "Encapsulation",
        "Options",
      ];

      const encapsulation: { [key: number]: string } = {
        0: "None",
        1: "VLAN (+4 byte)",
        2: "Q-in-Q (+8 byte)",
        3: "MPLS (+4 byte / LSE)",
      };

      const rowsT7 = streams.map((stream) => [
        stream.app_id,
        stream.frame_size + " bytes",
        stream.traffic_rate + " Gbps",
        stream.burst == 1 ? "IAT Precision" : "Rate Precision",
        stream.vxlan,
        encapsulation[stream.encapsulation],
        stream.number_of_lse,
      ]);

      autoTable(doc, {
        head: [columnsT7],
        body: rowsT7,
        theme: "plain",
        styles: {
          halign: "center",
        },
        startY: 25,
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
          5: { cellWidth: 35 },
        },
        didDrawCell: (data) => {
          if (shouldDrawLine(data.column.index, [0, 1, 2, 3, 4, 5, 6])) {
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
      });

      /* Add header and footer on every page */
      var totalPages = doc.getNumberOfPages();

      for (let index = 1; index <= totalPages; index++) {
        doc.setPage(index);
        doc.setFontSize(8);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header
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

        doc.setFontSize(17);
        doc.text("P4TG Network Report", pageWidth / 2, 10, { align: "center" });
      }

      const subHeaders = activePorts().map((v) => [
        `Overview ${v.tx} --> ${v.rx}`,
      ]);

      subHeaders.unshift(["Summary"]);
      subHeaders.push([`Stream Configuration in ${modes[mode]} mode`]);

      let currentPage = 1;

      for (let i = 0; i < subHeaders.length; i++) {
        doc.setPage(currentPage);
        doc.setFontSize(12);

        doc.text(subHeaders[i], 105, 20, { align: "center" });

        currentPage++;

        // If pageBreak is true and it's after the Summary page
        if (pageBreak && i == 0) {
          // Add an empty page without a header
          currentPage++;
        }
      }

      doc.save("Network Report.pdf");
    };

    return (
      <Button onClick={handleDownloadPdf} className="mb-1" variant="secondary">
        <i className="bi bi-download" /> PDF Download
      </Button>
    );
  }
);

export default DownloadPdfButton;
