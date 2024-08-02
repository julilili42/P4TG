import { Button, Col, Form, Row, Table } from "react-bootstrap";
import {
  GenerationMode,
  TestMode,
  TrafficGenData,
  RFCTestResults,
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

/* const ResultTable = ({
  results,
  running,
}: {
  results: RFCTestResults;
  running: boolean;
}) => {
  return (
    <>
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
                <th>
                  Throughput{" "}
                  <InfoBox>
                    <>
                      <h4>
                        Throughput-Test{" "}
                        <a href="https://www.ietf.org/rfc/rfc2544.txt">
                          (Section 26.1)
                        </a>
                      </h4>
                      Starte einen Datenstrom mit definierten Stream Sende-Rate
                      durch das DUT (Device Under Test). Die Stream-Rate wie
                      auch die Frame-Größe kann in dem Stream-Table eingestellt
                      werden. Es wird die Anzahl der gesendeten und empfangenen
                      Frames aufgenommen und über <br />
                      <code>
                        Frame Loss Rate = round(((input_count - output_count) *
                        100) / input_count, 2)
                      </code>
                      <br />
                      die Frame Loss Rate berechnet. Zunächst wird über
                      exponentieller Suche, beginnend mit der angegebenen
                      Senderate, nach dem Interval gesucht auf dem im Anschluss
                      eine Binäre Suche ausgeführt wird.
                      <br />
                      Falls die Frame Loss Rate 0 ist, wird die untere Grenze
                      des Intervalls erhöht, andernfalls wird die obere Grenze
                      des Intervalls verringert.
                      <br />
                      Die Exponentielle und die Binäre Suche werden beide
                      höchstens in 10 Iterrationen ausgeführt. Dabei liegt die
                      Dauer eines Tests bei 10 Sekunden.
                      <br />
                      <br />
                      <strong>Vorgehensweise:</strong>
                      <ol>
                        <li>
                          Beginn mit angegebener Stream Sende-Rate Exponentielle
                          Suche und finde Senderaten-Intervall{" "}
                        </li>
                        <li>Starte Binäre Suche auf Senderaten-Intervall </li>
                      </ol>
                    </>
                  </InfoBox>
                </th>
                <th>
                  Latency
                </th>
                <th>
                  Frame-Loss
                </th>
                <th>
                  Back-To-Back Frames
                </th>
                <th>
                  Reset
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {results.throughput == null ? (
                    running ? (
                      "Not finished"
                    ) : (
                      "Not running"
                    )
                  ) : (
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="mt-1 mb-1"
                    >
                      <thead>
                        <tr>
                          <th>Frame Size</th>
                          <th>Throughput</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.throughput).map(
                          ([size, throughput]) => (
                            <tr key={size}>
                              <td>{size} Bytes</td>
                              <td>{throughput.toFixed(3)} Gbps</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </Table>
                  )}
                </td>
                <td>
                  {results.latency == null ? (
                    running ? (
                      "Not finished"
                    ) : (
                      "Not running"
                    )
                  ) : (
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="mt-1 mb-1"
                    >
                      <thead>
                        <tr>
                          <th>Frame Size</th>
                          <th>Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.latency).map(
                          ([size, latency]) => (
                            <tr key={size}>
                              <td>{size} Bytes</td>
                              <td>{latency.toFixed(3)} µs</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </Table>
                  )}
                </td>
                <td>
                  {results.frame_loss_rate == null ? (
                    running ? (
                      "Not finished"
                    ) : (
                      "Not running"
                    )
                  ) : (
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="mt-1 mb-1"
                    >
                      <thead>
                        <tr>
                          <th>Frame Size</th>
                          <th>Frame Loss Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.frame_loss_rate).map(
                          ([size, frame_loss_rate]) => (
                            <tr key={size}>
                              <td>{size} Bytes</td>
                              <td>{frame_loss_rate.toFixed(3)} Gbps</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </Table>
                  )}
                </td>
                <td>
                  {results.back_to_back == null ? (
                    running ? (
                      "Not finished"
                    ) : (
                      "Not running"
                    )
                  ) : (
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="mt-1 mb-1"
                    >
                      <thead>
                        <tr>
                          <th>Frame Size</th>
                          <th>Back-to-back</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.back_to_back).map(
                          ([size, back_to_back]) => (
                            <tr key={size}>
                              <td>{size} Bytes</td>
                              <td>{back_to_back.toFixed(3)} Frames</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </Table>
                  )}
                </td>
                <td>
                  {results.reset == null ? (
                    running ? (
                      "Not finished"
                    ) : (
                      "Not running"
                    )
                  ) : (
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="mt-1 mb-1"
                    >
                      <thead>
                        <tr>
                          <th>Frame Size</th>
                          <th>Reset</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(results.reset).map(([size, reset]) => (
                          <tr key={size}>
                            <td>{size} Bytes</td>
                            <td>{reset.toFixed(3)} s</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>
    </>
  );
}; */

const ResultTable = ({
  results,
  running,
}: {
  results: RFCTestResults;
  running: boolean;
}) => {
  const frameSizes = ["64", "128", "512", "1024", "1518"];
  return (
    <>
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
                <th>Frame Size</th>
                <th>
                  Throughput{" "}
                  <InfoBox>
                    <>
                      <h4>
                        Throughput-Test{" "}
                        <a href="https://www.ietf.org/rfc/rfc2544.txt">
                          (Section 26.1)
                        </a>
                      </h4>
                      Starte einen Datenstrom mit definierten Stream Sende-Rate
                      durch das DUT (Device Under Test). Die Stream-Rate wie
                      auch die Frame-Größe kann in dem Stream-Table eingestellt
                      werden. Es wird die Anzahl der gesendeten und empfangenen
                      Frames aufgenommen und über <br />
                      <code>
                        Frame Loss Rate = round(((input_count - output_count) *
                        100) / input_count, 2)
                      </code>
                      <br />
                      die Frame Loss Rate berechnet. Zunächst wird über
                      exponentieller Suche, beginnend mit der angegebenen
                      Senderate, nach dem Interval gesucht auf dem im Anschluss
                      eine Binäre Suche ausgeführt wird.
                      <br />
                      Falls die Frame Loss Rate 0 ist, wird die untere Grenze
                      des Intervalls erhöht, andernfalls wird die obere Grenze
                      des Intervalls verringert.
                      <br />
                      Die Exponentielle und die Binäre Suche werden beide
                      höchstens in 10 Iterrationen ausgeführt. Dabei liegt die
                      Dauer eines Tests bei 10 Sekunden.
                      <br />
                      <br />
                      <strong>Vorgehensweise:</strong>
                      <ol>
                        <li>
                          Beginn mit angegebener Stream Sende-Rate Exponentielle
                          Suche und finde Senderaten-Intervall{" "}
                        </li>
                        <li>Starte Binäre Suche auf Senderaten-Intervall </li>
                      </ol>
                    </>
                  </InfoBox>
                </th>
                <th>
                  Latency{" "}
                  <InfoBox>
                    <>
                      <h4>
                        Latency-Test{" "}
                        <a href="https://www.ietf.org/rfc/rfc2544.txt">
                          (Section 26.2)
                        </a>
                      </h4>
                      Ermitteln der Latenz für die angegebene Framegröße. Ein
                      Stream mit einer eingestellten Frame-Größe und dem zuvor
                      ermittelten Durchsatz
                      <sup>*</sup> durch das DUT (Device Under Test) gesendet.
                      <br />
                      <br />
                      <sup>*</sup>Falls der Latency-Test einzeln ausgeführt
                      wird, so wird die eingestellte Frame-Rate der Stream(s)
                      verwendet.
                      <br />
                      <br />
                      Dieser Test dauert <strong>120 Sekunden</strong> und wird{" "}
                      <strong>20 Mal</strong> wiederholt.
                      <br />
                      <br />
                      <strong>Vorgehensweise:</strong>
                      <ol>
                        <li>
                          Ermitteln des Throughput für die angegebene
                          Framegröße.
                        </li>
                        <li>
                          Stream mit angegebener Frame-Größe und ermitteltem
                          Throughput durch das DUT senden.
                        </li>
                        <li>Mindestens 120 Sekunden Sendezeit.</li>
                        <li>
                          Ermittle Latenz durch Berechnung der Durchschnitt RTT
                          (Round-Trip-Time) über alle Ports.
                        </li>
                        <li>
                          Teile die durchschnittliche RTT durch 2, um die
                          Einweg-Latenz zu berechnen (Annahme: Die Verzögerung
                          in beiden Richtungen ist gleich).
                        </li>
                        <li>Test 20 Mal wiederholen.</li>
                      </ol>
                      Der berichtete Latenz-Wert ist der Durchschnitt der nach
                      jedem Testdurchlauf berechneten Latenz-Werte. Beachten
                      Sie, dass die Methode annimmt, dass die Verzögerung in
                      beiden Richtungen gleich ist und die Netzwerkvariabilität
                      sowie die Verarbeitungszeit am Ziel und der Quelle
                      berücksichtigt werden.
                    </>
                  </InfoBox>
                </th>
                <th>
                  Frame-Loss{" "}
                  <InfoBox>
                    <>
                      <h4>
                        Frame-Loss-Rate-Test{" "}
                        <a href="https://www.ietf.org/rfc/rfc2544.txt">
                          (Section 26.3)
                        </a>
                      </h4>
                      Ein Stream mit einer angegebenen Frame-Größe, sowie einer
                      definierten Senderate wird durch das DUT (Device Under
                      Test) gesendet. Dieser Tests dauert{" "}
                      <strong>10 Sekunden</strong> und wird{" "}
                      <strong>10 Mal</strong> wiederholt.
                      <br />
                      <br />
                      <strong>Vorgehensweise:</strong>
                      <ol>
                        <li>
                          Anzahl von Frames mit bestimmter Rate durch das DUT
                          senden und empfangene Frames zählen.
                        </li>
                        <li>
                          Berechnung der Frame-Verlust-Rate:
                          <br />
                          <code>
                            Frame Loss Rate = ((input_count - output_count) *
                            100) / input_count
                          </code>
                        </li>
                        <li>Erster Testlauf mit einer Senderate von 100%.</li>
                        <li>
                          Wiederholung bei 90%, 80% der maximalen Rate, usw.,
                          bis zwei aufeinanderfolgende Testläufe keinen
                          Frame-Verlust aufweisen.
                        </li>
                      </ol>
                      Der User gibt die maximale Senderate des DUT an. Es werden
                      10 Tests mit entsprechenden Abstufungen um 10% um diese
                      maximale Rate durchgeführt. Falls zwei aufeinanderfolgende
                      Tests eine Frame Loss Ratio von 0 aufweisen, wird die
                      maximale Rate angegeben.
                    </>
                  </InfoBox>
                </th>
                <th>
                  Back-To-Back Frames{" "}
                  <InfoBox>
                    <>
                      <h4>
                        Back-to-Back-Test{" "}
                        <a href="https://www.ietf.org/rfc/rfc2544.txt">
                          (Section 26.4)
                        </a>
                      </h4>
                      Ein Frame-Burst mit minimalen Inter-Frame-Lücken wird an
                      das DUT (Device Under Test) gesendet und die Anzahl der
                      weitergeleiteten Frames wird gezählt.
                      <br />
                      <br />
                      <strong>Vorgehensweise:</strong>
                      <ol>
                        <li>
                          Frame-Burst mit minimalen Inter-Frame-Lücken an das
                          DUT senden und weitergeleitete Frames zählen.
                        </li>
                        <li>
                          Erhöhen der Burstlänge und Wiederholen des Tests,
                          solange #empfangener Frames = #gesendeten Frames ist.
                        </li>
                        <li>
                          Falls #empfangener Frames kleiner #gesendeten Frames,
                          Burstlänge verringern und Test wiederholen.
                        </li>
                        <li>
                          Back-to-Back-Wert: Anzahl der Frames im längsten
                          Burst, den das DUT ohne Verlust verarbeiten kann.
                        </li>
                        <li>Testdauer mindestens 2 Sekunden.</li>
                        <li>Mindestens 50 Mal wiederholen.</li>
                      </ol>
                      Der berichtete Wert ist der Durchschnitt der
                      aufgezeichneten Werte.
                    </>
                  </InfoBox>
                </th>
                <th>
                  Reset{" "}
                  <InfoBox>
                    <>
                      <h4>
                        Reset-Test{" "}
                        <a href="https://www.ietf.org/rfc/rfc2544.txt">
                          (Section 26.6)
                        </a>
                      </h4>
                    </>
                  </InfoBox>
                </th>
              </tr>
            </thead>
            <tbody>
              {frameSizes.map((size: string) => (
                <tr key={size}>
                  <td>{size} Bytes</td>
                  <td>
                    {results.throughput?.[size] !== undefined
                      ? `${results.throughput[size].toFixed(3)} Gbps`
                      : running
                      ? "Not finished"
                      : "Not running"}
                  </td>
                  <td>
                    {results.latency?.[size] !== undefined
                      ? `${results.latency[size].toFixed(3)} µs`
                      : running
                      ? "Not finished"
                      : "Not running"}
                  </td>
                  <td>
                    {results.frame_loss_rate?.[size] !== undefined
                      ? `${results.frame_loss_rate[size].toFixed(3)} Gbps`
                      : running
                      ? "Not finished"
                      : "Not running"}
                  </td>
                  <td>
                    {results.back_to_back?.[size] !== undefined
                      ? `${results.back_to_back[size]} Frames`
                      : running
                      ? "Not finished"
                      : "Not running"}
                  </td>
                  <td>
                    {results.reset?.[size] !== undefined
                      ? `${results.reset[size].toFixed(3)} s`
                      : running
                      ? "Not finished"
                      : "Not running"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>
    </>
  );
};

export {
  SaveResetButtons,
  AddStreamButton,
  TestModeSelection,
  GenerationModeSelection,
  TotalDuration,
  ImportExport,
  ResultTable,
};
