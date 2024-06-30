import { Dropdown } from "react-bootstrap";
import DownloadCsv from "./csv/Csv";
import DownloadPdf from "./pdf/Pdf";
import { Statistics, TimeStatistics } from "../common/Interfaces";
import { Stream, StreamSettings } from "../common/Interfaces";
const Download = ({
  data,
  stats,
  portTxRxMappingList,
  modeList,
  streamsList,
  streamSettingsList,
  graph_images,
}: {
  data: TimeStatistics;
  stats: Statistics;
  portTxRxMappingList: {
    [key: number]: { [name: number]: number };
  };
  modeList: { [key: number]: number };
  streamsList: { [key: number]: Stream[] };
  streamSettingsList: {
    [key: number]: StreamSettings[];
  };
  graph_images: string[];
}) => {
  // single
  const mode = Object.values(modeList).slice(-1)[0];
  const stream_settings = Object.values(streamSettingsList).slice(-1)[0];
  const streams = Object.values(streamsList).slice(-1)[0];
  const port_mapping = Object.values(portTxRxMappingList).slice(-1)[0];

  const csvButtonProps = { data, stats, port_mapping };

  const { handleDownloadCsv } = DownloadCsv(csvButtonProps);

  const pdfButtonProps = {
    stats,
    port_mapping,
    mode,
    streams,
    stream_settings,
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
          <Dropdown.Item
            onClick={handleDownloadCsv}
            className="custom-dropdown-item"
          >
            <i className="bi bi-filetype-csv"></i> CSV
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};
export default Download;
