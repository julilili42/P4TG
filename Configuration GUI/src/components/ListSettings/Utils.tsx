import { Button, Col, Form, Row } from "react-bootstrap";
import {
  GenerationMode,
  TestMode,
  TrafficGenData,
} from "../../common/Interfaces";
import translate from "../translation/Translate";
import InfoBox from "../InfoBox";

const SaveResetButtons = ({
  onSave,
  onReset,
  running,
}: {
  onSave: () => void;
  onReset: () => void;
  running: boolean;
}) => {
  return (
    <>
      <Button onClick={onSave} disabled={running} variant="primary">
        <i className="bi bi-check" /> Save
      </Button>{" "}
      <Button onClick={onReset} disabled={running} variant="danger">
        <i className="bi bi-x-octagon-fill" /> Reset
      </Button>
    </>
  );
};

const AddStreamButton = ({
  addStream,
  running,
  currentTest,
}: {
  addStream: () => void;
  running: boolean;
  currentTest: TrafficGenData | null;
}) => {
  return (
    <Row className={"mb-3"}>
      <Col className={"text-start"}>
        {running || !currentTest ? null : currentTest.mode ===
            GenerationMode.CBR || currentTest.mode === GenerationMode.MPPS ? (
          <Button onClick={addStream} variant="primary">
            <i className="bi bi-plus" /> Add stream
          </Button>
        ) : null}
      </Col>
    </Row>
  );
};

const TotalDuration = ({ currentLanguage, totalDuration }: any) => (
  <Button variant="secondary" disabled={true}>
    <i className="bi bi-clock-history" />{" "}
    {translate("Total Duration", currentLanguage)}: {totalDuration}{" "}
    {translate("seconds", currentLanguage)}
  </Button>
);

const ImportExport = ({
  handleImport,
  handleExport,
  running,
  currentLanguage,
}: {
  handleImport: (e: any) => void;
  handleExport: () => void;
  running: boolean;
  currentLanguage: string;
}) => {
  return (
    <>
      <Button onClick={handleImport} disabled={running} variant={"primary"}>
        <i className="bi bi-cloud-arrow-down-fill" />{" "}
        {translate("Import", currentLanguage)}
      </Button>{" "}
      <Button onClick={handleExport} disabled={running} variant={"danger"}>
        <i className="bi bi-cloud-arrow-up-fill" />{" "}
        {translate("Export", currentLanguage)}
      </Button>
    </>
  );
};

const TestModeSelection = ({
  currentLanguage,
  currentTestMode,
  handleTestModeChange,
}: any) => (
  <Col className={"col-2"}>
    <Form.Text className="text-muted">
      {translate("Test Mode", currentLanguage)}
    </Form.Text>
    <Form.Select value={currentTestMode} onChange={handleTestModeChange}>
      <option value={TestMode.SINGLE}>Standard</option>
      <option value={TestMode.MULTI}>Automatic tests</option>
      <option value={TestMode.PROFILE}>Profile</option>
    </Form.Select>
  </Col>
);

const GenerationModeSelection = ({
  currentLanguage,
  currentTest,
  handleModeChange,
  running,
}: {
  currentLanguage: string;
  currentTest: TrafficGenData | null;
  handleModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  running: boolean;
}) => {
  return (
    <Col className={"col-2 d-flex flex-row align-items-center"}>
      <Form.Select
        disabled={running}
        required
        onChange={handleModeChange}
        className="me-3"
        value={currentTest ? currentTest.mode : GenerationMode.CBR}
      >
        <option value={GenerationMode.CBR}>CBR</option>
        <option value={GenerationMode.POISSON}>Poisson</option>
        <option value={GenerationMode.MPPS}>Mpps</option>
        <option value={GenerationMode.ANALYZE}>Monitor</option>
      </Form.Select>
      <InfoBox>
        <>
          <p>{translate("P4TG supports multiple modes.", currentLanguage)}</p>
          <h5>{translate("Constant bit rate", currentLanguage)} (CBR)</h5>
          <p>
            {translate(
              "Constant bit rate (CBR) traffic sends traffic with a constant rate.",
              currentLanguage
            )}
          </p>
          <h5>Poisson</h5>
          <p>
            {translate(
              "Poisson traffic is traffic with random inter-arrival times but a constant average traffic rate.",
              currentLanguage
            )}
          </p>
          <h5>Mpps</h5>
          <p>
            {translate(
              "In Mpps mode, P4TG generates traffic with a fixed number of packets per second.",
              currentLanguage
            )}
          </p>
          <h5>Monitor/Analyze</h5>
          <p>
            {translate(
              "In monitor/analyze mode, P4TG forwards traffic received on its ports and measures L1/L2 rates, packet sizes/types and inter-arrival times.",
              currentLanguage
            )}
          </p>
        </>
      </InfoBox>
    </Col>
  );
};

export {
  SaveResetButtons,
  AddStreamButton,
  TestModeSelection,
  GenerationModeSelection,
  TotalDuration,
  ImportExport,
};
