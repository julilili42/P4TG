import { Row, Col, Table, Form } from "react-bootstrap";
import { GenerationMode } from "../../common/Interfaces";
import StreamSettingsList from "../settings/StreamSettingsList";
import { StyledCol } from "../../sites/Settings";

{
  /* modeCurrentTab anstatt modeList[currentTabIndex as any]*/
}
{
  /* (streamCurrentTab && streamCurrentTab.length > 0) entfernen? 
              Tritt auf falls ich alle Tabs lösche 
            */
}

const PortMappingTable = ({
  streamCurrentTab,
  modeCurrentTab,
  ports,
  portTxRxMappingCurrentTab,
  running,
  handlePortChange,
  streamSettingCurrentTab,
}: {
  streamCurrentTab: any[];
  modeCurrentTab: GenerationMode;
  ports: any[];
  portTxRxMappingCurrentTab: { [key: string]: number };
  running: boolean;
  handlePortChange: (event: any, pid: number) => void;
  streamSettingCurrentTab: any[];
}) => {
  if (
    (streamCurrentTab && streamCurrentTab.length > 0) ||
    modeCurrentTab === GenerationMode.ANALYZE
  ) {
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
                <th>TX Port</th>
                <th>RX Port</th>
                {streamCurrentTab &&
                  streamCurrentTab.map((v: any, i: any) => {
                    return <th key={i}>Stream {v.app_id}</th>;
                  })}
              </tr>
            </thead>
            <tbody>
              {ports.map((v, i) => {
                if (v.loopback === "BF_LPBK_NONE") {
                  const selectValue =
                    portTxRxMappingCurrentTab[v.pid.toString()] || -1;
                  return (
                    <tr key={i}>
                      <StyledCol>
                        {v.port} ({v.pid})
                      </StyledCol>
                      <StyledCol>
                        <Form.Select
                          disabled={running || !v.status}
                          required
                          value={selectValue}
                          onChange={(event: any) =>
                            handlePortChange(event, v.pid)
                          }
                        >
                          <option value={-1}>Select RX Port</option>
                          {ports.map((v, i) => {
                            if (v.loopback === "BF_LPBK_NONE") {
                              return (
                                <option key={i} value={v.pid}>
                                  {v.port} ({v.pid})
                                </option>
                              );
                            }
                          })}
                        </Form.Select>
                      </StyledCol>

                      <StreamSettingsList
                        stream_settings={streamSettingCurrentTab}
                        streams={streamCurrentTab}
                        running={running}
                        port={v}
                      />
                    </tr>
                  );
                }
              })}
            </tbody>
          </Table>
        </Col>
      </Row>
    );
  }
  return null;
};

export default PortMappingTable;
