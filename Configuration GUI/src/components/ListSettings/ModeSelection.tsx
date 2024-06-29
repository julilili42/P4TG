import React from "react";
import { Col, Form } from "react-bootstrap";
import translate from "../translation/Translate";
import { GenerationMode, TestMode } from "../../common/Interfaces";
import InfoBox from "../InfoBox";

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
    </Form.Select>
  </Col>
);

const GenerationModeSelection = ({
  currentLanguage,
  modeCurrentTab,
  handleModeChange,
  running,
  currentTestMode,
}: any) => {
  return (
    <Col className={"col-2 d-flex flex-row align-items-center"}>
      <Form.Select
        disabled={running}
        required
        onChange={handleModeChange}
        className="me-3"
        value={modeCurrentTab}
      >
        <option value={GenerationMode.CBR}>CBR</option>
        <option value={GenerationMode.POISSON}>Poisson</option>
        <option value={GenerationMode.MPPS}>Mpps</option>
        <option value={GenerationMode.ANALYZE}>Monitor</option>
      </Form.Select>
      {currentTestMode === TestMode.SINGLE && (
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
                "In Mpps mode, P4TG generates traffic with a fixed number of packets per seconds.",
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
      )}
    </Col>
  );
};

export { TestModeSelection, GenerationModeSelection };
