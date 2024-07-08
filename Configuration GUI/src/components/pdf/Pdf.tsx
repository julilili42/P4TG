import { useEffect, useState } from "react";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import { get } from "../../common/API";
import {
  Statistics,
  Stream,
  GenerationMode,
  StreamSettings,
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
  splitArrayIntoChunks,
  formatActiveStreamRows,
  formatPortStreamCols,
  formatPortStreamRows,
  frameSizeCountRow,
  createTableOfContents,
  createTestExplanation,
  addHeadersAndFooters,
  addSubHeaders,
  getPortAndChannelFromPid,
} from "../../common/utils/PdfUtils";
import translate from "../translation/Translate";

const DownloadPdf = ({
  stats,
  traffic_gen_list,
  port_mapping,
  mode,
  streams,
  stream_settings,
  graph_images,
}: {
  stats: Statistics;
  traffic_gen_list: TrafficGenList;
  port_mapping: { [name: number]: number };
  mode: number;
  streams: Stream[];
  stream_settings: StreamSettings[];
  graph_images: string[];
}) => {
  /* 
  Ich bekomme hier stats, was das gesamte Statistics Objekt ist und den TestModus. 
  Entsprechend muss ich diese Komponente anpassen, damit es für den 
  - Testmode Single: statistics
  - Testmode Multi: statistics.previous_statistics
  benutzt. 
  Ich verwende hier port_mapping, mode, streams, stream_settings etc.. 
  Ich sollte je nach Test mode diese Werte entsprechend setzen.


  Ich könnte einen Parameter i in `handleDownloadPdf` benutzen der dann auf den Test zugreift, den ich anzeigen möchte.
  Damit könnte ich dann alle Tests in einer for-Schleife durchgehen und die PDFs erstellen.



  
  */
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

  const handleDownloadPdf = () => {
    const doc = new jsPDF("p", "mm", [297, 210]);
    doc.setFont("helvetica", "normal");

    // Split the graph images array into subarrays of size 6 (number of graphs per port pair), starting with each port pair and ending with the summary graphs
    const all_network_graphs = splitArrayIntoChunks(graph_images, 6);

    // Create Array which holds all chapters
    const subHeaders = activePorts(port_mapping).flatMap((v) => [
      [
        `${translate("Overview", currentLanguage)} ${v.tx} (${
          getPortAndChannelFromPid(v.tx, ports).port
        }) --> ${v.rx} (${getPortAndChannelFromPid(v.rx, ports).port})`,
      ],
      [
        `${translate("Network Graphs", currentLanguage)} ${v.tx} (${
          getPortAndChannelFromPid(v.tx, ports).port
        }) --> ${v.rx} (${getPortAndChannelFromPid(v.rx, ports).port})`,
      ],
    ]);

    subHeaders.unshift([
      `${translate("Network Graphs Summary", currentLanguage)}`,
    ]);
    subHeaders.unshift([`${translate("Summary", currentLanguage)}`]);
    subHeaders.unshift([
      `${translate("Stream Configuration in", currentLanguage)} ${
        modes[mode as any]
      } ${translate("mode", currentLanguage)}`,
    ]);
    subHeaders.unshift([`${translate("Test explanation", currentLanguage)}`]);
    subHeaders.unshift([`${translate("Table of Contents", currentLanguage)}`]);

    /* Table of Contents */
    createTableOfContents(doc, subHeaders, currentLanguage);

    doc.addPage();

    /* Test explanation */
    createTestExplanation(doc, dummyText);

    doc.addPage();

    /* Stream Configuration */

    // Active Ports Table

    const activePortsRows = formatActivePortsRows(port_mapping, ports);

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
      port_mapping,
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
        stats,
        port_mapping,
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

    // Last element of all_network_graphs is the summary graphs
    all_network_graphs[all_network_graphs.length - 1].forEach(
      (imageData, index) => {
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
      }
    );
    doc.addPage();

    /* Active ports report */

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

      const frameStatsRTTRows = formatFrameStatsRTTRows({
        lost_packets: lost_packets,
        total_rx: total_rx,
        out_of_order_packets: out_of_order_packets,
        iat_tx: iats_tx,
        iat_rx: iats_rx,
        rtt: rtt,
        currentLanguage: currentLanguage,
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

      all_network_graphs[i].forEach((imageData, index) => {
        doc.addImage(
          imageData,
          "JPEG",
          15,
          35 + 40 * index,
          180,
          36,
          "",
          "FAST" // Image Compression
        );
      });

      // Don't add a new page if it's the last page
      if (i < array.length - 1) {
        doc.addPage();
      }
    });

    /* Add header and footer to every page */
    addHeadersAndFooters(doc, elapsed_time, "Test 1", currentLanguage);
    /*     addSubHeaders(doc, subHeaders);
     */
    doc.save("Network Report.pdf");
  };

  return { handleDownloadPdf };
};

export default DownloadPdf;
