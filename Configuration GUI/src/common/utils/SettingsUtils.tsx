import { Button, Col, Form, Row, Table } from "react-bootstrap";
import {
  GenerationMode,
  TestMode,
  TrafficGenData,
  RFCTestResults,
} from "../Interfaces";
import translate from "../../components/translation/Translate";
import InfoBox from "../../components/InfoBox";

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

export const RFC2544Info = () => (
  <>
    <h4>RFC 2544</h4>
    <p>
      RFC 2544 definiert Methoden zur Leistungsbewertung von Netzwerkgeräten.
      Die wichtigsten Tests sind:
    </p>
    <ul>
      <li>
        <strong>Durchsatz:</strong> Maximale Datenrate ohne Paketverlust (auch
        zero loss throughput genannt).
      </li>
      <li>
        <strong>Latenz:</strong> Zeit, die ein Paket benötigt, um durch das
        Gerät zu gelangen (hier Annäherung durch One-way Latenz).
      </li>
      <li>
        <strong>Frame-Loss:</strong> Prozentsatz der Frames, die das Gerät bei
        verschiedenen Lasten nicht weiterleiten kann.
      </li>
      <li>
        <strong>Reset:</strong> Erholungszeit nach Überlastung. Zeit zum
        Abarbeiten der aufgebauten Frame-Warteschlange.
      </li>
    </ul>
  </>
);

const ThroughputInfo = () => (
  <>
    <h4>
      Throughput-Test{" "}
      <a href="https://www.ietf.org/rfc/rfc2544.txt">(Section 26.1)</a>
    </h4>
    Ziel dieses Tests ist die Ermittlung der unbekannten Durchsatzraten eines
    DUT (Device Under Test). Dabei werden die Durchsatzraten für die
    Frame-Größen 64, 128, 512, 1024 und 1518 Bytes ermittelt. Die anfängliche
    Stream-Rate entspricht der in der Stream-Tabelle definierten Rate. Der Test
    erfolgt in zwei Schritten: Zunächst wird mittels exponentieller Suche das
    Intervall ermittelt, in dem sich die Senderate befindet. Anschließend wird
    innerhalb dieses Intervalls eine binäre Suche durchgeführt. In jeder
    Iteration wird die Frame Loss Rate berechnet, um die Anpassung der
    Intervallgrenzen zu bestimmen:
    <br />
    <code>
      Frame Loss Rate = round(((input_count - output_count) * 100) /
      input_count, 2)
    </code>
    <br />
    Bei keinem oder weniger als 0,01% Paketverlust wird die untere
    Intervallgrenze erhöht, andernfalls die obere Grenze verringert. Die
    exponentielle Suche ist auf zehn Iterationen begrenzt. Jede Iteration dauert
    zehn Sekunden.
    <br />
    <br />
    <strong>Vorgehensweise:</strong>
    <ol>
      Für jede Frame-Größe:
      <li>
        Starte mit der angegebenen Stream-Sende-Rate die exponentielle Suche und
        finde das Senderaten-Intervall.
      </li>
      <li>
        Führe eine binäre Suche innerhalb des ermittelten Intervalls durch.
      </li>
    </ol>
  </>
);

const LatencyInfo = () => (
  <>
    <h4>
      Latency-Test{" "}
      <a href="https://www.ietf.org/rfc/rfc2544.txt">(Section 26.2)</a>
    </h4>
    Ermitteln der Latenz für die angegebene Framegröße. Ein Stream mit einer
    eingestellten Frame-Größe und dem zuvor ermittelten Durchsatz
    <sup>*</sup> durch das DUT (Device Under Test) gesendet.
    <br />
    <br />
    <sup>*</sup>Falls der Latency-Test einzeln ausgeführt wird, so wird die
    eingestellte Frame-Rate der Stream(s) verwendet.
    <br />
    <br />
    Dieser Test dauert <strong>120 Sekunden</strong> und wird{" "}
    <strong>20 Mal</strong> wiederholt.
    <br />
    <br />
    <strong>Vorgehensweise:</strong>
    <ol>
      <li>Ermitteln des Throughput für die angegebene Framegröße.</li>
      <li>
        Stream mit angegebener Frame-Größe und ermitteltem Throughput durch das
        DUT senden.
      </li>
      <li>Mindestens 120 Sekunden Sendezeit.</li>
      <li>
        Ermittle Latenz durch Berechnung der Durchschnitt RTT (Round-Trip-Time)
        über alle Ports.
      </li>
      <li>
        Teile die durchschnittliche RTT durch 2, um die Einweg-Latenz zu
        berechnen (Annahme: Die Verzögerung in beiden Richtungen ist gleich).
      </li>
      <li>Test 20 Mal wiederholen.</li>
    </ol>
    Der berichtete Latenz-Wert ist der Durchschnitt der nach jedem Testdurchlauf
    berechneten Latenz-Werte. Beachten Sie, dass die Methode annimmt, dass die
    Verzögerung in beiden Richtungen gleich ist und die Netzwerkvariabilität
    sowie die Verarbeitungszeit am Ziel und der Quelle berücksichtigt werden.
  </>
);

const FrameLossInfo = () => (
  <>
    <h4>
      Frame-Loss-Rate-Test{" "}
      <a href="https://www.ietf.org/rfc/rfc2544.txt">(Section 26.3)</a>
    </h4>
    Ein Stream mit einer angegebenen Frame-Größe, sowie einer definierten
    Senderate wird durch das DUT (Device Under Test) gesendet. Dieser Tests
    dauert <strong>10 Sekunden</strong> und wird <strong>10 Mal</strong>{" "}
    wiederholt.
    <br />
    <br />
    <strong>Vorgehensweise:</strong>
    <ol>
      <li>
        Anzahl von Frames mit bestimmter Rate durch das DUT senden und
        empfangene Frames zählen.
      </li>
      <li>
        Berechnung der Frame-Verlust-Rate:
        <br />
        <code>
          Frame Loss Rate = ((input_count - output_count) * 100) / input_count
        </code>
      </li>
      <li>Erster Testlauf mit einer Senderate von 100%.</li>
      <li>
        Wiederholung bei 90%, 80% der maximalen Rate, usw., bis zwei
        aufeinanderfolgende Testläufe keinen Frame-Verlust aufweisen.
      </li>
    </ol>
    Der User gibt die maximale Senderate des DUT an. Es werden 10 Tests mit
    entsprechenden Abstufungen um 10% um diese maximale Rate durchgeführt. Falls
    zwei aufeinanderfolgende Tests eine Frame Loss Ratio von 0 aufweisen, wird
    die maximale Rate angegeben.
  </>
);

const ResetInfo = () => (
  <>
    <h4>
      Reset-Test{" "}
      <a href="https://www.ietf.org/rfc/rfc2544.txt">(Section 26.6)</a>
    </h4>
  </>
);

const renderCell = (
  data: any,
  size: string,
  unit: string,
  running: boolean
) => {
  return data?.[size] !== undefined
    ? `${data[size].toFixed(3)} ${unit}`
    : running
    ? "Not finished"
    : "Not running";
};

const renderFrameLossCell = (data: any, size: string, running: boolean) => {
  const frameLossData = data?.[size];
  if (!frameLossData) {
    return running ? "Not finished" : "Not running";
  }

  const entries = Object.entries(frameLossData).map(([key, value]) => ({
    key,
    value: (value as number).toFixed(3),
  }));

  const midpoint = Math.ceil(entries.length / 2);
  const firstHalf = entries.slice(0, midpoint);
  const secondHalf = entries.slice(midpoint);

  return (
    <Table bordered size="sm" className="m-0">
      <thead>
        <tr>
          <th>Bandwidth</th>
          <th>Frame-Loss-Rate</th>
          <th>Bandwidth</th>
          <th>Frame-Loss-Rate</th>
        </tr>
      </thead>
      <tbody>
        {firstHalf.map((entry, index) => (
          <tr key={index}>
            <td>{entry.key}%</td>
            <td>{entry.value}</td>
            {secondHalf[index] && (
              <>
                <td>{secondHalf[index].key}%</td>
                <td>{secondHalf[index].value}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
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
                    <ThroughputInfo />
                  </InfoBox>
                </th>
                <th>
                  Latency{" "}
                  <InfoBox>
                    <LatencyInfo />
                  </InfoBox>
                </th>
                <th>
                  Frame-Loss{" "}
                  <InfoBox>
                    <FrameLossInfo />
                  </InfoBox>
                </th>
                <th>
                  Reset{" "}
                  <InfoBox>
                    <ResetInfo />
                  </InfoBox>
                </th>
              </tr>
            </thead>
            <tbody>
              {frameSizes.map((size) => (
                <tr key={size}>
                  <td>{`${size} Bytes`}</td>
                  <td>
                    {renderCell(results.throughput, size, "Gbps", running)}
                  </td>
                  <td>{renderCell(results.latency, size, "µs", running)}</td>
                  <td>
                    {renderFrameLossCell(
                      results.frame_loss_rate,
                      size,
                      running
                    )}
                  </td>
                  <td>
                    {size === "64"
                      ? renderCell(results.reset, size, "s", running)
                      : ""}
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
