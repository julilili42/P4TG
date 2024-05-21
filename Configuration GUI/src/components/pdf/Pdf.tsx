import React, { useEffect, useState } from "react";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { Button } from "react-bootstrap";
import { get } from "../../common/API";
import {
  Statistics,
  Stream,
  GenerationMode,
  StreamSettings,
} from "../../common/Interfaces";
import {
  get_lost_packets,
  get_out_of_order_packets,
  formatFrameCount,
  calculateWeightedRTTs,
  calculateWeightedIATs,
  getStreamIDsByPort,
  activePorts,
  formatTime,
} from "../../common/StatisticUtils";
import {
  dummyText,
  createAutoTableConfig,
  shouldDrawLine,
  columnsT0,
  columnsT1,
  formatRowsT1,
  columnsT2,
  rowT2,
  columnsT3,
  rowT3,
  columnsT7,
  frameTypes,
  frameSizes,
  modes,
  encapsulation,
  addDots,
} from "../../common/PdfUtils";

import { secondsToTime } from "../SendReceiveMonitor";

const DownloadPdfButton = React.memo(
  ({
    stats,
    port_mapping,
    graph_images,
  }: {
    stats: Statistics;
    port_mapping: { [name: number]: number };
    graph_images: string[];
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
    // @ts-ignore
    // prettier-ignore
    const [stream_settings, set_stream_settings] = useState<StreamSettings[]>(JSON.parse(localStorage.getItem("streamSettings")) || []);

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

    const getPortAndChannelFromPid = (pid: number | string) => {
      const numericPid = typeof pid === "string" ? parseInt(pid) : pid;
      const pidData = ports.find((p) => p.pid === numericPid);
      return pidData
        ? { port: pidData.port, channel: pidData.channel }
        : { port: "N/A", channel: "N/A" };
    };

    const handleDownloadPdf = () => {
      const doc = new jsPDF("p", "mm", [297, 210]);
      doc.setFont("helvetica", "normal");

      const subHeaders = activePorts(port_mapping).map((v) => [
        `Overview ${v.tx} --> ${v.rx}`,
      ]);

      subHeaders.unshift([`Network Graphs Summary`]);
      subHeaders.unshift([`Summary`]);
      subHeaders.unshift([`Stream Configuration in ${modes[mode]} mode`]);
      subHeaders.unshift([`Test explanation`]);
      subHeaders.unshift([`Table of Contents`]);

      /* Table of Contents */
      doc.setFontSize(12);
      let currentPage = 1;

      const startX = 15; // Start position for the text
      const buffer = 2; // Buffer space on each side of the dots
      const targetX = 180 - buffer; // Start position for the page number with buffer accounted

      for (let i = 0; i < subHeaders.length; i++) {
        // Skip Table of Contents in Table of Contents
        if (i > 0) {
          let yPosition = 40 + (i - 1) * 12;
          let title = subHeaders[i][0];
          let pageNumberText = "Seite " + (i + 1).toString();

          // Add the title
          doc.textWithLink(title, startX, yPosition, {
            pageNumber: currentPage,
          });

          // Calculate and add the dots with buffer space
          let textWidth = doc.getTextWidth(title);
          let dots = addDots(doc, title, targetX, startX, buffer);
          doc.text(dots, startX + textWidth + buffer, yPosition);

          // Add the page number
          doc.setFont("helvetica", "bold");
          doc.textWithLink(pageNumberText, targetX + buffer, yPosition, {
            pageNumber: currentPage,
          });
          doc.setFont("helvetica", "normal");
        }
        currentPage++;
      }

      doc.addPage();

      /* Test explanation */
      const splitTextToSize = doc.splitTextToSize(dummyText, 170);
      doc.text(splitTextToSize, 20, 35);

      doc.addPage();

      const rowsT0 = [];

      for (const [txPid, rxPid] of Object.entries(port_mapping)) {
        const txData = getPortAndChannelFromPid(txPid);
        const rxData = getPortAndChannelFromPid(rxPid);

        rowsT0.push([
          txData.port,
          txData.channel,
          txPid,
          rxData.port,
          rxData.channel,
          rxPid,
        ]);
      }

      /*
        Port Mapping Table 
      */
      autoTable(
        doc,
        createAutoTableConfig(
          doc,
          columnsT0,
          rowsT0,
          {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 },
          },
          [0, 1, 2, 3, 4, 5],
          {
            styles: {
              halign: "center",
            },
            startY: 35,
          }
        )
      );

      const rowsT7 = streams.map((stream) => [
        stream.app_id,
        stream.frame_size + " bytes",
        stream.traffic_rate + " Gbps",
        stream.burst == 1 ? "IAT Precision" : "Rate Precision",
        stream.vxlan,
        encapsulation[stream.encapsulation],
        stream.number_of_lse,
      ]);

      /*
        Stream Setting Table 1
      */
      autoTable(
        doc,
        createAutoTableConfig(
          doc,
          columnsT7,
          rowsT7,
          {
            0: { cellWidth: 25 },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 30 },
            4: { cellWidth: 25 },
            5: { cellWidth: 35 },
          },
          [0, 1, 2, 3, 4, 5, 6],
          {
            styles: {
              halign: "center",
            },
          }
        )
      );

      const columnsT8 = ["TX Port", "RX Port"].concat(
        streams.map((stream) => `Stream ${stream.app_id}`)
      );

      const rowsT8 = activePorts(port_mapping).map((stream) => {
        const createArrayWithIndex = (
          indices: number[],
          arraySize: number
        ): string[] =>
          Array.from({ length: arraySize }, (_, i) =>
            indices.includes(i + 1) ? "on" : "off"
          );
        return [
          `${getPortAndChannelFromPid(stream.tx).port} (${stream.tx})`,
          `${getPortAndChannelFromPid(stream.rx).port} (${stream.rx})`,
        ].concat(
          createArrayWithIndex(
            getStreamIDsByPort(stream.tx, stream_settings, streams),
            columnsT8.length - 2
          )
        );
      });

      /*
        Stream Setting Table 2
      */
      autoTable(
        doc,
        createAutoTableConfig(
          doc,
          columnsT8,
          rowsT8,
          { 0: { cellWidth: 25 }, 1: { cellWidth: 25 } },
          [0, 1, 2, 3, 4, 5, 6, 7, 8],
          {
            styles: {
              halign: "center",
            },
          }
        )
      );

      doc.addPage();

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
      Summary Table
      */
      autoTable(doc, {
        head: [columnsT1],
        body: rowsT1,
        theme: "plain",
        startY: 35,
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

      const rowsT2 = frameTypes.map((type) =>
        rowT2(
          stats,
          port_mapping,
          type.label1 as string,
          type.label2 as string,
          total_tx,
          total_rx
        )
      );

      /*
      Frame and Ethernet Type Table
      */

      autoTable(
        doc,
        createAutoTableConfig(
          doc,
          columnsT2,
          rowsT2,
          {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 10 },
            4: { cellWidth: 30 },
            5: { cellWidth: 25 },
          },
          [0, 1, 2, 4, 5, 6]
        )
      );

      const rowsT3 = [
        ...frameSizes.map(([label, low, high]) =>
          label != "Total"
            ? rowT3(
                stats,
                port_mapping,
                label as string,
                low as number,
                high as number,
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

      autoTable(
        doc,
        createAutoTableConfig(
          doc,
          columnsT3,
          rowsT3,
          {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 10 },
            4: { cellWidth: 30 },
            5: { cellWidth: 25 },
          },
          [0, 1, 2, 4, 5, 6]
        )
      );

      doc.addPage();
      /* Network Graphs Summary */
      graph_images.forEach((imageData, index) => {
        doc.addImage(imageData, "JPEG", 15, 35 + 40 * index, 180, 36);
      });
      doc.addPage();

      activePorts(port_mapping).map((v, i, array) => {
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
          startY: 35,
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
            stats,
            mapping,
            type.label1 as string,
            type.label2 as string,
            total_tx,
            total_rx
          )
        );

        autoTable(
          doc,
          createAutoTableConfig(
            doc,
            columnsT2,
            rowsT5,
            {
              0: { cellWidth: 30 },
              1: { cellWidth: 30 },
              2: { cellWidth: 30 },
              3: { cellWidth: 10 },
              4: { cellWidth: 30 },
              5: { cellWidth: 25 },
            },
            [0, 1, 2, 4, 5, 6],
            {
              styles: {
                halign: "center",
              },
            }
          )
        );

        const rowsT6 = [
          ...frameSizes.map(([label, low, high]) =>
            label != "Total"
              ? rowT3(
                  stats,
                  mapping,
                  label as string,
                  low as number,
                  high as number,
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

        autoTable(
          doc,
          createAutoTableConfig(
            doc,
            columnsT3,
            rowsT6,
            {
              0: { cellWidth: 30 },
              1: { cellWidth: 30 },
              2: { cellWidth: 30 },
              3: { cellWidth: 10 },
              4: { cellWidth: 30 },
              5: { cellWidth: 25 },
            },
            [0, 1, 2, 4, 5, 6],
            {
              styles: {
                halign: "center",
              },
            }
          )
        );

        if (i < array.length - 1) {
          doc.addPage();
        }
      });

      /* Add header and footer on every page */
      var totalPages = doc.getNumberOfPages();

      for (let index = 1; index <= totalPages; index++) {
        doc.setPage(index);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
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
        doc.setFont("helvetica", "bold");
        doc.text("P4TG Network Report", pageWidth / 2, 15, { align: "center" });
        doc.setFont("helvetica", "normal");
      }

      currentPage = 1;

      for (let i = 0; i < subHeaders.length; i++) {
        doc.setPage(currentPage);
        doc.setFontSize(12);

        doc.text(subHeaders[i], 105, 25, { align: "center" });

        currentPage++;
      }
      doc.save("Network Report.pdf");
    };

    return (
      <Button
        onClick={handleDownloadPdf}
        className="mb-1 w-100 "
        variant="secondary"
      >
        <i className="bi bi-download" /> PDF Download
      </Button>
    );
  }
);

export default DownloadPdfButton;
