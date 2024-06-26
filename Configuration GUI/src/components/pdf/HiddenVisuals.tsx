import React, { act, useCallback, useEffect, useRef } from "react";
import { Doughnut, Line } from "react-chartjs-2";
import { Statistics, TimeStatistics } from "../../common/Interfaces";

import { activePorts } from "../../common/utils/StatisticUtils";
import {
  rtt_options,
  frame_options,
  loss_options,
  rate_options,
  get_frame_size_data,
  get_rtt_data,
  get_loss_data,
  get_rate_data,
  get_frame_type_data,
  get_ethernet_type_data,
} from "../../common/utils/VisualUtils";

type ChartRef = React.RefObject<HTMLDivElement>;

const createRefArray = (length: number): ChartRef[] => {
  return Array.from({ length }, () => React.createRef<HTMLDivElement>());
};

const HiddenGraphs = ({
  data,
  stats,
  port_mapping,
  onConvert,
}: {
  data: TimeStatistics;
  stats: Statistics;
  port_mapping: { [name: number]: number };
  onConvert: (data: string[]) => void;
}) => {
  // References to the summary graphs
  const refsSummary = useRef<ChartRef[]>(createRefArray(6));

  // References to the active port graphs, Object
  const activePortRefs = activePorts(port_mapping).reduce(
    (acc, port, index) => {
      acc[port.tx] = createRefArray(6);
      return acc;
    },
    {} as { [key: number]: ChartRef[] }
  );

  const download = useCallback(
    (refs: ChartRef[]) => {
      const data: string[] = [];

      refs.forEach((ref: any, index: number) => {
        const link = document.createElement("a");
        link.download = `chart-${index + 1}.png`;
        if (ref.current) {
          // @ts-ignore
          link.href = ref.current.toBase64Image();
          data.push(link.href);
        } else {
          console.error("Error in rendering" + index + 1 + "th chart");
        }
      });

      onConvert(data);
    },
    [onConvert]
  );

  useEffect(() => {
    const allRefs = [
      ...Object.values(activePortRefs).flat(),
      ...refsSummary.current,
    ];
    download(allRefs);
  }, []);

  return (
    <>
      {activePorts(port_mapping).map((v, i) => {
        return (
          <HiddenGraph
            data={data}
            stats={stats}
            port_mapping={{ [v.tx]: v.rx }}
            chartRefs={activePortRefs[v.tx]}
          />
        );
      })}
      <HiddenGraph
        data={data}
        stats={stats}
        port_mapping={port_mapping}
        chartRefs={refsSummary.current}
      />
    </>
  );
};

const HiddenGraph = ({
  data,
  stats,
  port_mapping,
  chartRefs,
}: {
  data: TimeStatistics;
  stats: Statistics;
  port_mapping: { [name: number]: number };
  chartRefs: any[];
}) => {
  const [
    rateChartRef,
    lossChartRef,
    rttChartRef,
    frameTypeChartRef,
    ethernetTypeChartRef,
    frameSizeChartRef,
  ] = chartRefs;

  const loss_options_hidden = {
    ...loss_options,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
  };

  const loss_data = get_loss_data(data, port_mapping);

  const rate_options_hidden = {
    ...rate_options,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
  };

  const rate_data = get_rate_data(data, port_mapping);

  const rtt_options_hidden = {
    ...rtt_options,
    aspectRatio: 5,
    animation: {
      duration: 0,
    },
  };

  const rtt_data = get_rtt_data(data, port_mapping);

  const frame_options_hidden = {
    ...frame_options,
    aspectRatio: 5,
  };

  const frame_type_data = get_frame_type_data(stats, port_mapping);

  const ethernet_type_data = get_ethernet_type_data(stats, port_mapping);

  const frame_size_data = get_frame_size_data(stats, port_mapping);

  return (
    <div className="hidden-div">
      <Line options={rate_options_hidden} data={rate_data} ref={rateChartRef} />
      <Line options={loss_options_hidden} data={loss_data} ref={lossChartRef} />
      <Line data={rtt_data} options={rtt_options_hidden} ref={rttChartRef} />
      <Doughnut
        data={frame_type_data}
        options={frame_options_hidden}
        title={"Frame types"}
        ref={frameTypeChartRef}
      />
      <Doughnut
        data={ethernet_type_data}
        options={frame_options_hidden}
        ref={ethernetTypeChartRef}
      />
      <Doughnut
        data={frame_size_data}
        options={frame_options_hidden}
        ref={frameSizeChartRef}
      />
    </div>
  );
};

export default HiddenGraphs;
