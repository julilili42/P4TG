import { useEffect, useState } from "react";
import {
  calculateWeightedIATs,
  calculateWeightedRTTs,
  get_lost_packets,
  get_out_of_order_packets,
  get_rtt,
} from "../../common/utils/StatisticUtils";
import {
  Statistics,
  TimeStatistics,
  TrafficGenList,
  TrafficGenData,
} from "../../common/Interfaces";
import { generateLineData } from "../../common/utils/VisualUtils";
import { get_csv_data } from "../../common/utils/CsvUtils";
const DownloadCsv = ({
  data,
  stats,
  traffic_gen_list,
}: {
  data: TimeStatistics;
  stats: Statistics;
  traffic_gen_list: TrafficGenList;
}) => {
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

    return {
      total_tx,
      total_rx,
      rtt,
      iat_tx,
      iat_rx,
      lost_packets,
      out_of_order_packets,
    };
  };

  const calculateLineData = (
    data: TimeStatistics,
    port_tx_rx_mapping: { [name: number]: number }
  ) => {
    const [labels_tx, line_data_tx] = generateLineData(
      "tx_rate_l1",
      true,
      data,
      port_tx_rx_mapping
    );
    const [labels_rx, line_data_rx] = generateLineData(
      "rx_rate_l1",
      false,
      data,
      port_tx_rx_mapping
    );

    const [labels_loss, line_data_loss] = generateLineData(
      "packet_loss",
      false,
      data,
      port_tx_rx_mapping
    );
    const [labels_out_of_order, line_data_out_of_order] = generateLineData(
      "out_of_order",
      false,
      data,
      port_tx_rx_mapping
    );
    const [labels_rtt, line_data_rtt] = get_rtt(data, port_tx_rx_mapping);

    return {
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
    };
  };

  const handleDownloadCsv = () => {
    const csvDataList: any = [];

    Object.keys(traffic_gen_list).forEach((testKey: string) => {
      if (Number(testKey) >= 1) {
        const port_mapping =
          traffic_gen_list[Number(testKey)].port_tx_rx_mapping;

        const calculatedValues = {
          ...calculateStatistics(stats, port_mapping),
          ...calculateLineData(data, port_mapping),
        };

        const csvData = get_csv_data(
          data,
          stats,
          port_mapping,
          calculatedValues,
          Number(testKey)
        );
        csvDataList.push(csvData);
      }
    });

    // Merge all CSV data
    const csvData = csvDataList.flat();
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvData.map((e: any) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Network Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { handleDownloadCsv };
};

export default DownloadCsv;
