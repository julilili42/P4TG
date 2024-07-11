import { useEffect, useRef, useState } from "react";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { get } from "../../common/API";
import {
  Statistics,
  TrafficGenData,
  TrafficGenList,
} from "../../common/Interfaces";
import {
  get_lost_packets,
  get_out_of_order_packets,
  formatFrameCount,
  calculateWeightedRTTs,
  calculateWeightedIATs,
  activePorts,
} from "../../common/utils/StatisticUtils";
import {
  dummyText,
  createAutoTableConfig,
  activePortsCols,
  formatActivePortsRows,
  activeStreamCols,
  frameStatsRTTCols,
  formatFrameStatsRTTRows,
  frameEthernetCols,
  frameEthernetRow,
  frameSizeCountCols,
  frameTypes,
  frameSizes,
  modes,
  formatActiveStreamRows,
  formatPortStreamCols,
  formatPortStreamRows,
  frameSizeCountRow,
  createTestExplanation,
  addHeadersAndFooters,
  addSubHeaders,
  getPortAndChannelFromPid,
  createToC,
} from "../../common/utils/PdfUtils";
import translate from "../translation/Translate";
import { PDFDocument } from "pdf-lib";

const DownloadPdf = ({
  stats,
  traffic_gen_list,
  graph_images,
}: {
  stats: Statistics;
  traffic_gen_list: TrafficGenList;
  graph_images: {
    [key: number]: { Summary: string[]; [key: string]: string[] };
  };
}) => {
  const [ports, set_ports] = useState<
    {
      pid: number;
      port: number;
      channel: number;
      loopback: string;
      status: boolean;
    }[]
  >([]);

  const loadPorts = async () => {
    let stats = await get({ route: "/ports" });

    if (stats.status === 200) {
      set_ports(stats.data);
    }
  };

  useEffect(() => {
    loadPorts();
  });

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

  const calculateStatistics = (
    current_statistics: Statistics,
    port_tx_rx_mapping: { [name: number]: number },
    current_test?: TrafficGenData
  ) => {
    let total_tx = 0;
    let total_rx = 0;

    Object.keys(current_statistics.frame_size).forEach((v) => {
      if (Object.keys(port_tx_rx_mapping).includes(v)) {
        current_statistics.frame_size[v]["tx"].forEach((f: any) => {
          total_tx += f.packets;
        });
      }

      if (Object.values(port_tx_rx_mapping).map(Number).includes(parseInt(v))) {
        current_statistics.frame_size[v]["rx"].forEach((f: any) => {
          total_rx += f.packets;
        });
      }
    });

    const rtt = calculateWeightedRTTs(current_statistics, port_tx_rx_mapping);
    const iat_tx = calculateWeightedIATs(
      "tx",
      current_statistics,
      port_tx_rx_mapping
    );
    const iat_rx = calculateWeightedIATs(
      "rx",
      current_statistics,
      port_tx_rx_mapping
    );
    const lost_packets = get_lost_packets(
      current_statistics,
      port_tx_rx_mapping
    );
    const out_of_order_packets = get_out_of_order_packets(
      current_statistics,
      port_tx_rx_mapping
    );
    const elapsed_time =
      current_test?.duration || current_statistics.elapsed_time;

    return {
      total_tx,
      total_rx,
      rtt,
      iat_tx,
      iat_rx,
      lost_packets,
      out_of_order_packets,
      elapsed_time,
    };
  };

  const subHeadersMap: any = useRef({});

  const createPdf = (
    testList: TrafficGenList,
    stats: Statistics,
    graph_images: { Summary: string[]; [key: string]: string[] },
    testNumber: number
  ) => {
    const current_test = testList[testNumber];

    const test_name = current_test.name || `Test ${testNumber}`;

    const { mode, stream_settings, streams, port_tx_rx_mapping } = current_test;

    const current_statistics = stats.previous_statistics?.[testNumber] || stats;

    const {
      total_tx,
      total_rx,
      rtt,
      iat_tx,
      iat_rx,
      lost_packets,
      out_of_order_packets,
      elapsed_time,
    } = calculateStatistics(
      current_statistics,
      port_tx_rx_mapping,
      current_test
    );

    const doc = new jsPDF("p", "mm", [297, 210]);
    doc.setFont("helvetica", "normal");

    const subHeaders: string[] = [
      `${translate("Stream Configuration in", currentLanguage)} ${
        modes[mode as any]
      } ${translate("mode", currentLanguage)}`,
      `${translate("Summary", currentLanguage)}`,
      `${translate("Network Graphs Summary", currentLanguage)}`,
    ];

    activePorts(port_tx_rx_mapping).forEach((v) => {
      subHeaders.push(
        `${translate("Overview", currentLanguage)} ${v.tx} (${
          getPortAndChannelFromPid(v.tx, ports).port
        }) --> ${v.rx} (${getPortAndChannelFromPid(v.rx, ports).port})`,
        `${translate("Network Graphs", currentLanguage)} ${v.tx} (${
          getPortAndChannelFromPid(v.tx, ports).port
        }) --> ${v.rx} (${getPortAndChannelFromPid(v.rx, ports).port})`
      );
    });

    subHeadersMap.current[testNumber] = subHeaders;

    /* Stream Configuration */

    // Active Ports Table

    const activePortsRows = formatActivePortsRows(port_tx_rx_mapping, ports);

    autoTable(
      doc,
      createAutoTableConfig(
        doc,
        activePortsCols,
        activePortsRows,
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

    // Active Stream Table

    const activeStreamRows = formatActiveStreamRows(streams);

    autoTable(
      doc,
      createAutoTableConfig(
        doc,
        activeStreamCols,
        activeStreamRows,
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

    // Port stream activation Table

    const portStreamCols = formatPortStreamCols(streams);

    const portStreamRows = formatPortStreamRows(
      port_tx_rx_mapping,
      ports,
      stream_settings,
      streams,
      portStreamCols
    );

    autoTable(
      doc,
      createAutoTableConfig(
        doc,
        portStreamCols,
        portStreamRows,
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

    /* Summary Table */

    // Packet statistics summary and RTT

    const frameStatsRTTRows = formatFrameStatsRTTRows({
      lost_packets,
      total_rx,
      out_of_order_packets,
      iat_tx,
      iat_rx,
      rtt,
      currentLanguage,
    });

    autoTable(
      doc,
      createAutoTableConfig(
        doc,
        frameStatsRTTCols,
        frameStatsRTTRows,
        {
          0: { cellWidth: 40 },
          1: { cellWidth: 20 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30 },
        },
        [0, 1, 3, 4],
        {
          startY: 35,
        },
        true
      )
    );

    // Frame and Ethernet Type Table

    const frameEthernetRows = frameTypes.map((type) =>
      frameEthernetRow(
        current_statistics,
        port_tx_rx_mapping,
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
        frameEthernetCols,
        frameEthernetRows,
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

    // Frame Size Count Table

    const frameSizeCountRows = [
      ...frameSizes.map(([label, low, high]) =>
        label != "Total"
          ? frameSizeCountRow(
              current_statistics,
              port_tx_rx_mapping,
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
        frameSizeCountCols,
        frameSizeCountRows,
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

    graph_images.Summary.forEach((imageData, index) => {
      doc.addImage(imageData, "JPEG", 15, 35 + 40 * index, 180, 36, "", "FAST");
    });

    doc.addPage();

    /* Active ports report */

    activePorts(port_tx_rx_mapping).map((v, i, array) => {
      let mapping: { [name: number]: number } = { [v.tx]: v.rx };

      const {
        total_tx,
        total_rx,
        rtt,
        iat_tx,
        iat_rx,
        lost_packets,
        out_of_order_packets,
      } = calculateStatistics(current_statistics, mapping);

      const frameStatsRTTRows = formatFrameStatsRTTRows({
        lost_packets,
        total_rx,
        out_of_order_packets,
        iat_tx,
        iat_rx,
        rtt,
        currentLanguage,
      });

      autoTable(
        doc,
        createAutoTableConfig(
          doc,
          frameStatsRTTCols,
          frameStatsRTTRows,
          {
            0: { cellWidth: 40 },
            1: { cellWidth: 20 },
            2: { cellWidth: 40 },
            3: { cellWidth: 30 },
          },
          [0, 1, 3, 4],
          {
            startY: 35,
          },
          true
        )
      );

      const frameEthernetRows = frameTypes.map((type) =>
        frameEthernetRow(
          current_statistics,
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
          frameEthernetCols,
          frameEthernetRows,
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

      const frameSizeCountRows = [
        ...frameSizes.map(([label, low, high]) =>
          label != "Total"
            ? frameSizeCountRow(
                current_statistics,
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
          frameSizeCountCols,
          frameSizeCountRows,
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

      graph_images[v.tx]?.forEach((imageData, index) => {
        doc.addImage(
          imageData,
          "JPEG",
          15,
          35 + 40 * index,
          180,
          36,
          "",
          "FAST"
        );
      });

      // Don't add a new page if it's the last page
      if (i < array.length - 1) {
        doc.addPage();
      }
    });

    /* Add header and footer to every page */
    addHeadersAndFooters(doc, elapsed_time, test_name, currentLanguage);
    addSubHeaders(doc, subHeaders);

    return doc.output("arraybuffer");
  };

  const mergePdfs = async (pdfsToMerge: ArrayBuffer[]) => {
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfsToMerge) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    const mergedPdfFile = await mergedPdf.save();
    return mergedPdfFile;
  };

  const handleDownloadPdf = async () => {
    const pdfBuffers = await Promise.all(
      Object.keys(traffic_gen_list).map((key) =>
        createPdf(
          traffic_gen_list,
          stats,
          graph_images[Number(key)],
          Number(key)
        )
      )
    );

    const tocDoc = new jsPDF("p", "mm", [297, 210]);
    createToC(tocDoc, subHeadersMap.current, traffic_gen_list, currentLanguage);
    const tocPdfBuffer = tocDoc.output("arraybuffer");

    const expDoc = new jsPDF("p", "mm", [297, 210]);
    createTestExplanation(expDoc, dummyText);
    const expPdfBuffer = expDoc.output("arraybuffer");

    const mergedPdfFile = await mergePdfs([
      tocPdfBuffer,
      expPdfBuffer,
      ...pdfBuffers,
    ]);

    const blob = new Blob([mergedPdfFile], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MergedNetworkReport.pdf";
    a.click();
    console.log(subHeadersMap.current);
  };

  return { handleDownloadPdf };
};

export default DownloadPdf;
