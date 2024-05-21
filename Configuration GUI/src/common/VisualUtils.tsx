import { secondsToTime } from "../components/SendReceiveMonitor";
import { TimeStatistics } from "./Interfaces";

export const generateLineData = (
  data_key: string,
  use_key: boolean,
  data: TimeStatistics,
  port_mapping: { [name: number]: number }
): [string[], number[]] => {
  let cum_data: { [name: number]: number }[] = [];

  if (data_key in data) {
    if (use_key) {
      Object.keys(port_mapping).map((v) => {
        // @ts-ignore
        if (v in data[data_key]) {
          // @ts-ignore
          cum_data.push(data[data_key][v]);
        }
      });
    } else {
      Object.values(port_mapping).map((v) => {
        // @ts-ignore
        if (v in data[data_key]) {
          // @ts-ignore
          cum_data.push(data[data_key][v]);
        }
      });
    }
  }

  let ret_data = cum_data.reduce((acc, current) => {
    const key = Object.keys(current);
    const found = Object.keys(acc);

    key.forEach((k) => {
      if (Object.keys(acc).includes(k)) {
        // @ts-ignore
        acc[k] += current[k];
      } else {
        // @ts-ignore
        acc[k] = current[k];
      }
    });

    return acc;
  }, {});

  return [
    Object.keys(ret_data).map((v) => secondsToTime(parseInt(v))),
    Object.values(ret_data),
  ];
};

export const rate_options = {
  responsive: true,
  aspectRatio: 6,
  scales: {
    y: {
      title: {
        display: true,
        text: "Gbit/s",
      },
      suggestedMin: 0,
      beginAtZero: true,
    },
    x: {
      title: {
        display: true,
        text: "Time",
      },
      ticks: {
        source: "auto",
        autoSkip: true,
      },
    },
  },
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: false,
      text: "",
    },
  },
};

export const loss_options = {
  responsive: true,
  aspectRatio: 6,
  scales: {
    y: {
      title: {
        display: true,
        text: "#Packets",
      },
      suggestedMin: 0,
      beginAtZero: true,
    },
    x: {
      title: {
        display: true,
        text: "Time",
      },
      ticks: {
        source: "auto",
        autoSkip: true,
      },
    },
  },
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: false,
      text: "",
    },
  },
};

export const frame_options = {
  responsive: true,
  animation: false,
  aspectRatio: 2,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: false,
      text: "Frame type",
    },
  },
};

export const rtt_options = {
  responsive: true,
  aspectRatio: 6,
  scales: {
    y: {
      title: {
        display: true,
        text: "μs",
      },
      suggestedMin: 0,
      beginAtZero: true,
    },
    x: {
      title: {
        display: true,
        text: "Time",
      },
      ticks: {
        source: "auto",
        autoSkip: true,
      },
    },
  },
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: false,
      text: "",
    },
  },
};
