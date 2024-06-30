import { Row, Col, Table } from "react-bootstrap";
import StreamElement from "../settings/StreamElement";
import {
  Stream,
  StreamSettings,
  GenerationMode,
} from "../../common/Interfaces";

const StreamTable = ({
  streamCurrentTab,
  modeCurrentTab,
  removeStream,
  running,
  streamSettingCurrentTab,
}: {
  streamCurrentTab: Stream[];
  modeCurrentTab: GenerationMode;
  removeStream: (id: number) => void;
  running: boolean;
  streamSettingCurrentTab: StreamSettings[];
}) => {
  return (
    <>
      {modeCurrentTab != GenerationMode.ANALYZE ? (
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
                {streamCurrentTab.map((v, i) => {
                  v.app_id = i + 1;
                  return (
                    <StreamElement
                      key={i}
                      mode={modeCurrentTab}
                      data={v}
                      remove={removeStream}
                      running={running}
                      stream_settings={streamSettingCurrentTab}
                    />
                  );
                })}
              </tbody>
            </Table>
          </Col>
        </Row>
      ) : null}
    </>
  );
};

export default StreamTable;
