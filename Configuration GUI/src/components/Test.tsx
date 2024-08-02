import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import { get } from "../common/API";
import {
  Statistics as StatInterface,
  TimeStatistics,
  TimeStatisticsObject,
  StatisticsObject,
  TrafficGenList,
} from "../common/Interfaces";
import {
  get_rate_options,
  get_loss_options,
  get_rtt_options,
  generateLineData,
} from "../common/utils/VisualUtils";

const getTitleOptions = (title: string) => ({
  display: true,
  text: title,
  color: "white",
  font: {
    size: 24,
  },
});

const getLegendOptions = () => ({
  display: true,
  position: "right" as const,
  labels: {
    color: "white",
  },
});

const MetricDataLineGraph = ({
  metric,
  type,
  title,
}: {
  metric?: string;
  type?: string;
  title: string;
}) => {
  const [statistics, set_statistics] =
    useState<StatInterface>(StatisticsObject);
  const [time_statistics, set_time_statistics] =
    useState<TimeStatistics>(TimeStatisticsObject);
  const [traffic_gen_list, set_traffic_gen_list] = useState<TrafficGenList>(
    JSON.parse(localStorage.getItem("traffic_gen") ?? "{}")
  );
  const [chart_data, set_chart_data] = useState<any>(null);

  const loadStatistics = async () => {
    try {
      const stats = await get({ route: "/statistics" });
      if (stats && stats.status === 200) {
        set_statistics(stats.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const loadTimeStatistics = async () => {
    try {
      const stats = await get({ route: "/time_statistics?limit=100" });
      if (stats && stats.status === 200) {
        set_time_statistics(stats.data);
      }
    } catch (error) {
      console.error("Error fetching time statistics:", error);
    }
  };

  const generateChartData = () => {
    let labels: string[] = [];
    let datasets: any[] = [];
    const colors = [
      "rgba(53, 162, 235, 1)",
      "rgba(255, 99, 132, 1)",
      "rgba(75, 192, 192, 1)",
      "rgba(255, 159, 64, 1)",
      "rgba(153, 102, 255, 1)",
      "rgba(34, 139, 34, 1)",
      "rgba(255, 206, 86, 1)",
    ];

    const addChartData = (
      timeStats: TimeStatistics,
      portMapping: { [name: number]: number },
      frameSize: number,
      colorIndex: number
    ) => {
      let line_data;
      let labels_generated;
      let scale_factor: number = 1; // Default scale factor

      switch (type) {
        case "Rate":
          [labels_generated, line_data] = generateLineData(
            `${metric}_rate_l1`,
            metric === "tx",
            timeStats,
            portMapping
          );
          scale_factor = 10 ** -9;
          break;
        case "Loss":
          [labels_generated, line_data] = generateLineData(
            "packet_loss",
            false,
            timeStats,
            portMapping
          );
          scale_factor = 1;
          break;
        case "OutOfOrder":
          [labels_generated, line_data] = generateLineData(
            "out_of_order",
            false,
            timeStats,
            portMapping
          );
          scale_factor = 1;
          break;
        case "RTT":
          [labels_generated, line_data] = generateLineData(
            "rtt",
            false,
            timeStats,
            portMapping
          );
          scale_factor = 10 ** -3;
          break;
        default:
          return;
      }

      if (labels.length === 0) {
        labels = labels_generated;
      }

      const label = `${frameSize} Bytes`;

      datasets.push({
        fill: false,
        label: label,
        data: line_data.map((val: any) => val * scale_factor),
        borderColor: colors[colorIndex % colors.length],
        backgroundColor: colors[colorIndex % colors.length],
      });
    };

    Object.entries(time_statistics.previous_time_statistics || {}).forEach(
      ([key, value], index) => {
        const testKey = parseInt(key);
        const portMapping = traffic_gen_list[testKey]?.port_tx_rx_mapping;
        const frameSize =
          traffic_gen_list[testKey]?.streams["0"].frame_size || "unknown";
        if (portMapping) {
          addChartData(value, portMapping, Number(frameSize), index + 1);
        }
      }
    );

    set_chart_data({ labels, datasets });
  };

  const getOptions = () => {
    const titleOptions = getTitleOptions(title);
    const legendOptions = getLegendOptions();
    switch (type) {
      case "Rate":
        return {
          ...get_rate_options("dark"),
          plugins: {
            ...get_rate_options("dark").plugins,
            title: titleOptions,
            legend: legendOptions,
          },
        };
      case "Loss":
        return {
          ...get_loss_options("dark"),
          plugins: {
            ...get_loss_options("dark").plugins,
            title: titleOptions,
            legend: legendOptions,
          },
        };
      case "OutOfOrder":
        return {
          ...get_loss_options("dark"),
          plugins: {
            ...get_loss_options("dark").plugins,
            title: titleOptions,
            legend: legendOptions,
          },
        };
      case "RTT":
        return {
          ...get_rtt_options("dark"),
          plugins: {
            ...get_rtt_options("dark").plugins,
            title: titleOptions,
            legend: legendOptions,
          },
        };
      default:
        return {
          ...get_rate_options("dark"),
          plugins: {
            ...get_rate_options("dark").plugins,
            title: titleOptions,
            legend: legendOptions,
          },
        };
    }
  };

  useEffect(() => {
    const interval_stats = setInterval(() => loadStatistics(), 500);
    const interval_timestats = setInterval(() => loadTimeStatistics(), 2000);

    return () => {
      clearInterval(interval_stats);
      clearInterval(interval_timestats);
    };
  }, []);

  useEffect(() => {
    if (
      Object.keys(time_statistics.tx_rate_l1).length > 0 &&
      Object.keys(traffic_gen_list).length > 0
    ) {
      generateChartData();
    }
  }, [time_statistics, traffic_gen_list, metric, type]);

  const chart_options = {
    ...getOptions(),
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
  };

  return chart_data ? <Line options={chart_options} data={chart_data} /> : null;
};

const Test = () => {
  return (
    <div>
      <MetricDataLineGraph metric="tx" type="Rate" title="TX Rate" />
      <MetricDataLineGraph metric="rx" type="Rate" title="RX Rate" />
      <MetricDataLineGraph type="Loss" title="Loss" />
      <MetricDataLineGraph type="OutOfOrder" title="Out Of Order" />
      <MetricDataLineGraph type="RTT" title="RTT" />
    </div>
  );
};

export default Test;
