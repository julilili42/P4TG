import { Row, Col, Table } from "react-bootstrap";
import StreamElement from "../settings/StreamElement";
import { GenerationMode, TrafficGenData } from "../../common/Interfaces";

const StreamTable = ({
  removeStream,
  running,
  currentTest,
}: {
  removeStream: (id: number) => void;
  running: boolean;
  currentTest: TrafficGenData | null;
}) => {
  if (currentTest && currentTest.mode !== GenerationMode.ANALYZE) {
    return (
      <Row>
        <Col>
          <Table
            striped
            bordered
            hover
            size="sm"
            className={"mt-3 mb-3 text-center"}
          >
            <thead className={"table-dark"}>
              <tr>
                <th>Stream-ID</th>
                <th>Frame Size</th>
                <th>Rate</th>
                <th>Mode</th>
                <th>VxLAN &nbsp;</th>
                <th>Encapsulation &nbsp;</th>
                <th>Options</th>
              </tr>
            </thead>
            <tbody>
              {currentTest.streams.map((v, i) => {
                v.app_id = i + 1;
                return (
                  <StreamElement
                    key={i}
                    mode={currentTest.mode}
                    data={v}
                    remove={removeStream}
                    running={running}
                    stream_settings={currentTest.stream_settings || []}
                  />
                );
              })}
            </tbody>
          </Table>
        </Col>
      </Row>
    );
  }
  return null;
};

export default StreamTable;
