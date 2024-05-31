import { Dropdown } from "react-bootstrap";
import DownloadCsv from "./csv/Csv";
import DownloadPdf from "./pdf/Pdf";
import { Statistics, TimeStatistics } from "../common/Interfaces";

const Download = ({
  data,
  stats,
  port_mapping,
  graph_images,
}: {
  data: TimeStatistics;
  stats: Statistics;
  port_mapping: { [name: number]: number };
  graph_images: string[];
}) => {
  const csvButtonProps = { data, stats, port_mapping };

  const { handleDownloadCsv } = DownloadCsv(csvButtonProps);

  const pdfButtonProps = { stats, port_mapping, graph_images };

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
