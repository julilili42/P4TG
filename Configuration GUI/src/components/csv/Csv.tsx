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
} from "../../common/Interfaces";
import { generateLineData } from "../../common/utils/VisualUtils";
import { get_csv_data } from "../../common/utils/CsvUtils";

const DownloadCsv = ({
  data,
  stats,
  traffic_gen_list,
  port_mapping,
}: {
  data: TimeStatistics;
  stats: Statistics;
  traffic_gen_list: TrafficGenList;
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
  const [labels_rtt, line_data_rtt] = get_rtt(data, port_mapping);

  useEffect(() => {
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

    setValues(port_mapping);
  }, [stats, port_mapping]);

  const handleDownloadCsv = () => {
    const calculatedValues = {
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
    };

    const csvData = get_csv_data(data, stats, port_mapping, calculatedValues);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvData.map((e) => e.join(",")).join("\n");
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
