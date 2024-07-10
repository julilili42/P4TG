import { Dropdown } from "react-bootstrap";
import DownloadCsv from "./csv/Csv";
import DownloadPdf from "./pdf/Pdf";

import { Statistics, TimeStatistics } from "../common/Interfaces";
import { TrafficGenList, Stream, StreamSettings } from "../common/Interfaces";

const Download = ({
  data,
  stats,
  traffic_gen_list,
  graph_images,
}: {
  data: TimeStatistics;
  stats: Statistics;
  traffic_gen_list: TrafficGenList;
  graph_images: {
    [key: number]: { Summary: string[]; [key: string]: string[] };
  };
}) => {
  /* 
    Hier bekomm ich stats, was das gesamte Statistics Objekt ist. 
    Daher muss ich 
    stats: {
    [key: number]: Statistics;
  };
    zu
    stats: Statistics;
    ändern. 
    DownloadCsv und DownloadPdf erhalten dieses Objekt und müssen entsprechend angepasst werden. => Tesmodus muss auch hier übergeben werden. 
  */

  //

  /* const portTxRxMappingList = Object.fromEntries(
    Object.entries(traffic_gen_list).map(([key, value]) => [
      key,
      value.port_tx_rx_mapping,
    ])
  );
  const modeList = Object.fromEntries(
    Object.entries(traffic_gen_list).map(([key, value]) => [key, value.mode])
  );
  const streamsList = Object.fromEntries(
    Object.entries(traffic_gen_list).map(([key, value]) => [key, value.streams])
  );
  const streamSettingsList = Object.fromEntries(
    Object.entries(traffic_gen_list).map(([key, value]) => [
      key,
      value.stream_settings,
    ])
  );

  // single
  const mode = Object.values(modeList).slice(-1)[0];
  const stream_settings = Object.values(streamSettingsList).slice(-1)[0];
  const streams = Object.values(streamsList).slice(-1)[0];
  const port_mapping = Object.values(portTxRxMappingList).slice(-1)[0];
  const statistics = Object.values(stats).slice(-1)[0]; 

  const csvButtonProps = { data, stats: statistics, port_mapping };

  const { handleDownloadCsv } = DownloadCsv(csvButtonProps);
*/
  const pdfButtonProps = {
    stats,
    traffic_gen_list,
    graph_images,
  };

  const { handleDownloadPdf } = DownloadPdf(pdfButtonProps);

  return (
    <div style={{ position: "absolute", width: "100%" }}>
      <Dropdown>
        <Dropdown.Toggle variant="secondary" className="mb-1 w-100">
          Download{" "}
        </Dropdown.Toggle>

        <Dropdown.Menu className="w-100">
          <Dropdown.Item
            onClick={handleDownloadPdf}
            className="custom-dropdown-item"
          >
            <i className="bi bi-filetype-pdf"></i> PDF
          </Dropdown.Item>
          <Dropdown.Item active={false} className="custom-dropdown-item">
            <i className="bi bi-filetype-csv"></i> CSV
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};
export default Download;
