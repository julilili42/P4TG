import { Dropdown } from "react-bootstrap";
import DownloadCsv from "./csv/Csv";
import DownloadPdf from "./pdf/Pdf";

import { Statistics, TestMode, TimeStatistics } from "../common/Interfaces";
import { TrafficGenList } from "../common/Interfaces";

const Download = ({
  data,
  stats,
  traffic_gen_list,
  test_mode,
  graph_images,
}: {
  data: TimeStatistics;
  stats: Statistics;
  traffic_gen_list: TrafficGenList;
  test_mode: TestMode;
  graph_images: {
    [key: number]: { Summary: string[]; [key: string]: string[] };
  };
}) => {
  const csvButtonProps = { data, stats, traffic_gen_list };

  const pdfButtonProps = {
    stats,
    traffic_gen_list,
    test_mode,
    graph_images,
  };

  const { handleDownloadCsv } = DownloadCsv(csvButtonProps);
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
