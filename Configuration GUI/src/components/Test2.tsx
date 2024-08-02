import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { get } from "../common/API";

import { Statistics } from "../common/Interfaces";

Chart.register(...registerables);

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    barThickness: number;
    yAxisID?: string;
  }[];
}

interface ProfileData {
  throughput: { [key: string]: number };
  latency: { [key: string]: number };
  frame_loss_rate: { [key: string]: number };
  back_to_back: { [key: string]: number };
  reset: { [key: string]: number }; // Added reset data
}

interface BarChartProps {
  refs: any;
  selectedRFC: number;
  onRenderComplete: () => void;
  stats: Statistics;
  port_mapping: { [name: number]: number };
}

const generateThroughputData = (data: ProfileData): ChartData | null => {
  if (!data.throughput || Object.keys(data.throughput).length === 0) {
    return null;
  }

  return {
    labels: Object.keys(data.throughput),
    datasets: [
      {
        label: "Throughput",
        data: Object.values(data.throughput).map((value) =>
          Number(value.toFixed(3))
        ),
        backgroundColor: "rgba(0, 0, 255, 0.6)",
        barThickness: 50,
      },
    ],
  };
};

const generateLatencyData = (data: ProfileData): ChartData | null => {
  if (!data || !data.latency || Object.keys(data.latency).length === 0) {
    return null;
  }

  return {
    labels: Object.keys(data.latency),
    datasets: [
      {
        label: "Latency",
        data: Object.values(data.latency).map((value) =>
          Number(value.toFixed(3))
        ),
        backgroundColor: "rgba(0, 255, 0, 0.6)",
        barThickness: 50,
      },
    ],
  };
};

const generateFrameLossRateData = (data: ProfileData): ChartData | null => {
  if (!data.frame_loss_rate || Object.keys(data.frame_loss_rate).length === 0) {
    return null;
  }

  return {
    labels: Object.keys(data.frame_loss_rate),
    datasets: [
      {
        label: "Frame Loss Rate",
        data: Object.values(data.frame_loss_rate).map((value) =>
          Number(value.toFixed(3))
        ),
        backgroundColor: "rgba(255, 165, 0, 0.6)",
        barThickness: 50,
      },
    ],
  };
};

const generateBackToBackData = (data: ProfileData): ChartData | null => {
  if (!data.back_to_back || Object.keys(data.back_to_back).length === 0) {
    return null;
  }

  return {
    labels: Object.keys(data.back_to_back),
    datasets: [
      {
        label: "Back to Back",
        data: Object.values(data.back_to_back).map((value) =>
          Number(value.toFixed(3))
        ),
        backgroundColor: "rgba(75, 192, 192, 0.6)", // Light blue color for back to back
        barThickness: 50,
      },
    ],
  };
};

const generateResetData = (data: ProfileData): ChartData | null => {
  if (!data.reset || Object.keys(data.reset).length === 0) {
    return null;
  }

  return {
    labels: Object.keys(data.reset),
    datasets: [
      {
        label: "Reset",
        data: Object.values(data.reset).map((value) =>
          Number(value.toFixed(3))
        ),
        backgroundColor: "rgba(153, 102, 255, 0.6)", // Purple color for reset
        barThickness: 50,
      },
    ],
  };
};

const generatePacketLossData = (data: any, total_rx: number): ChartData => {
  const frameSizes = ["64", "128", "256", "512", "1024"];

  const packetLossData = frameSizes.map((_, index: number) => {
    let totalPacketLoss = 0;
    const statIndex = index + 1; // Map index to 1-based index for statistics
    if (
      data.previous_statistics &&
      data.previous_statistics[statIndex] &&
      data.previous_statistics[statIndex].packet_loss
    ) {
      for (let key in data.previous_statistics[statIndex].packet_loss) {
        totalPacketLoss +=
          data.previous_statistics[statIndex].packet_loss[key] || 0;
      }
    }
    return totalPacketLoss;
  });

  const totalPackets =
    packetLossData.reduce((acc, val) => acc + val, 0) + total_rx;
  const packetLossPercentageData = packetLossData.map(
    (value) => (value / totalPackets) * 100
  );

  return {
    labels: frameSizes,
    datasets: [
      {
        label: "Packet Loss",
        data: packetLossData.map((value) => Number(value.toFixed(3))),
        backgroundColor: "rgba(255, 0, 0, 0.6)",
        barThickness: 50,
        yAxisID: "y",
      },
      {
        label: "Packet Loss (%)",
        data: packetLossPercentageData.map((value) => Number(value.toFixed(3))),
        backgroundColor: "rgba(62, 255, 236, 0.631)",
        barThickness: 50,
        yAxisID: "y1",
      },
    ],
  };
};

export const calculateTotalReceivedPackets = (
  stats: Statistics,
  port_mapping: { [name: number]: number }
): number => {
  let totalReceived = 0;

  Object.keys(stats.frame_size).forEach((v) => {
    if (Object.values(port_mapping).map(Number).includes(parseInt(v))) {
      stats.frame_size[v]["rx"].forEach((f) => {
        totalReceived += f.packets;
      });
    }
  });

  return totalReceived;
};

const BarChart = forwardRef(
  (
    { refs, selectedRFC, onRenderComplete, stats, port_mapping }: BarChartProps,
    ref
  ) => {
    const [throughputData, setThroughputData] = useState<ChartData | null>(
      null
    );
    const [packetLossData, setPacketLossData] = useState<ChartData | null>(
      null
    );
    const [latencyData, setLatencyData] = useState<ChartData | null>(null);
    const [frameLossRateData, setFrameLossRateData] =
      useState<ChartData | null>(null);
    const [backToBackData, setBackToBackData] = useState<ChartData | null>(
      null
    );
    const [resetData, setResetData] = useState<ChartData | null>(null);
    const [total_rx, set_total_rx] = useState(0);

    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await get({ route: "/profiles" });
          if (response && response.status === 200) {
            const data: ProfileData = response.data;
            setThroughputData(generateThroughputData(data));
            setLatencyData(generateLatencyData(data));
            setFrameLossRateData(generateFrameLossRateData(data));
            setBackToBackData(generateBackToBackData(data));
            setResetData(generateResetData(data));
          }

          const statsResponse = await get({ route: "/statistics" });
          if (statsResponse && statsResponse.status === 200) {
            const statsData = statsResponse.data;
            setPacketLossData(generatePacketLossData(statsData, total_rx));
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };

      fetchData();

      const total_rx = calculateTotalReceivedPackets(stats, port_mapping);
      set_total_rx(total_rx);
    }, []);

    useImperativeHandle(ref, () => ({
      throughputChartRef: refs[0],
      packetLossChartRef: refs[1],
      latencyChartRef: refs[2],
      frameLossRateChartRef: refs[3],
      backToBackChartRef: refs[4],
      resetChartRef: refs[5], // Added ref for reset chart
    }));

    useEffect(() => {
      const allChartsRendered =
        refs[0].current &&
        refs[1].current &&
        refs[2].current &&
        refs[3].current &&
        refs[4].current &&
        refs[5].current; // Check if reset chart is rendered
      const throughputAndPacketLossRendered =
        refs[0].current && refs[1].current;
      const latencyRendered = refs[2].current;
      const frameLossRateRendered = refs[3].current;
      const backToBackRendered = refs[4].current;
      const resetRendered = refs[5].current; // Added check for reset chart

      if (
        selectedRFC === 0 &&
        throughputData !== null &&
        packetLossData !== null &&
        latencyData !== null &&
        frameLossRateData !== null &&
        backToBackData !== null &&
        resetData !== null && // Check if reset data is available
        allChartsRendered
      ) {
        onRenderComplete();
      } else if (
        selectedRFC === 1 &&
        throughputData !== null &&
        packetLossData !== null &&
        throughputAndPacketLossRendered
      ) {
        onRenderComplete();
      } else if (selectedRFC === 2 && latencyData !== null && latencyRendered) {
        onRenderComplete();
      } else if (
        selectedRFC === 3 &&
        frameLossRateData !== null &&
        frameLossRateRendered
      ) {
        onRenderComplete();
      } else if (
        selectedRFC === 4 &&
        backToBackData !== null &&
        backToBackRendered
      ) {
        onRenderComplete();
      } else if (
        selectedRFC === 5 &&
        resetData !== null &&
        resetRendered // Check if reset chart is rendered
      ) {
        onRenderComplete();
      }
    }, [
      throughputData,
      packetLossData,
      latencyData,
      frameLossRateData,
      backToBackData,
      resetData, // Added reset data dependency
      refs,
      onRenderComplete,
      selectedRFC,
    ]);

    const commonChartOptions = {
      responsive: true,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            color: "black",
            font: {
              size: 20, // Increase the font size for the legend labels
            },
          },
        },
        datalabels: {
          display: true,
          align: "end",
          anchor: "end",
          color: "black",
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Frame Size (Bytes)",
            color: "black",
            font: {
              size: 20, // Increase the font size for the x-axis title
            },
          },
          ticks: {
            color: "black",
            font: {
              size: 18, // Increase the font size for the x-axis ticks
            },
          },
          barPercentage: 0.8, // Ensure consistent bar percentage
          categoryPercentage: 0.8, // Ensure consistent category percentage
        },
        y: {
          title: {
            display: true,
            text: "Throughput (Gbps)",
            color: "black",
            font: {
              size: 20, // Increase the font size for the y-axis title
            },
          },
          ticks: {
            color: "black",
            font: {
              size: 18, // Increase the font size for the y-axis ticks
            },
          },
        },
      },
      animation: {
        duration: 0,
      },
    };

    const packetLossChartOptions = {
      ...commonChartOptions,
      scales: {
        ...commonChartOptions.scales,
        y: {
          ...commonChartOptions.scales.y,
          title: {
            display: true,
            text: "Packet Loss (# Packets)",
            color: "black",
            font: {
              size: 20, // Ensure consistent font size for packet loss chart y-axis title
            },
          },
        },
        y1: {
          type: "linear" as const,
          position: "right" as const,
          title: {
            display: true,
            text: "Packet Loss (%)",
            color: "black",
            font: {
              size: 20, // Ensure consistent font size for the second y-axis title
            },
          },
          ticks: {
            callback: function (value: any) {
              return value.toFixed(4) + "%"; // Format ticks as percentage
            },
          },
          grid: {
            drawOnChartArea: false, // Only want the grid lines for one axis to show up
          },
        },
      },
    };

    const latencyChartOptions = {
      ...commonChartOptions,
      scales: {
        ...commonChartOptions.scales,
        y: {
          ...commonChartOptions.scales.y,
          title: {
            display: true,
            text: "Latency (μs)",
            color: "black",
            font: {
              size: 20, // Ensure consistent font size for latency chart y-axis title
            },
          },
        },
      },
    };

    const frameLossRateChartOptions = {
      ...commonChartOptions,
      scales: {
        ...commonChartOptions.scales,
        y: {
          ...commonChartOptions.scales.y,
          title: {
            display: true,
            text: "Frame Loss Rate (Gbps)",
            color: "black",
            font: {
              size: 20, // Ensure consistent font size for frame loss rate chart y-axis title
            },
          },
        },
      },
    };

    const backToBackChartOptions = {
      ...commonChartOptions,
      scales: {
        ...commonChartOptions.scales,
        y: {
          ...commonChartOptions.scales.y,
          title: {
            display: true,
            text: "Frames",
            color: "black",
            font: {
              size: 20, // Ensure consistent font size for back to back chart y-axis title
            },
          },
        },
      },
    };

    const resetChartOptions = {
      ...commonChartOptions,
      scales: {
        ...commonChartOptions.scales,
        y: {
          ...commonChartOptions.scales.y,
          title: {
            display: true,
            text: "Seconds", // Y-axis title for reset chart
            color: "black",
            font: {
              size: 20, // Ensure consistent font size for reset chart y-axis title
            },
          },
        },
      },
    };

    return (
      <div className="hidden-div">
        {(selectedRFC === 0 || selectedRFC === 1) && throughputData && (
          <Bar
            data={throughputData}
            options={commonChartOptions}
            ref={refs[0]}
          />
        )}
        {(selectedRFC === 0 || selectedRFC === 1) && packetLossData && (
          <>
            <Bar
              data={packetLossData}
              options={packetLossChartOptions}
              ref={refs[1]}
            />
          </>
        )}
        {(selectedRFC === 0 || selectedRFC === 2) && latencyData && (
          <Bar data={latencyData} options={latencyChartOptions} ref={refs[2]} />
        )}
        {(selectedRFC === 0 || selectedRFC === 3) && frameLossRateData && (
          <Bar
            data={frameLossRateData}
            options={frameLossRateChartOptions}
            ref={refs[3]}
          />
        )}
        {(selectedRFC === 0 || selectedRFC === 4) && backToBackData && (
          <Bar
            data={backToBackData}
            options={backToBackChartOptions}
            ref={refs[4]}
          />
        )}
        {(selectedRFC === 0 || selectedRFC === 5) && resetData && (
          <Bar data={resetData} options={resetChartOptions} ref={refs[5]} />
        )}
      </div>
    );
  }
);

export default BarChart;
