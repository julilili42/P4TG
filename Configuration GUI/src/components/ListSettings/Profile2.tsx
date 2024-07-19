import { useEffect, useState } from "react";
import {
  DefaultTrafficGenData,
  DefaultStream,
  DefaultStreamSettings,
  TrafficGenData,
  TrafficGenList,
  GenerationMode,
  RFCTestResults,
  RFC,
} from "../../common/Interfaces";

import PortMappingTable from "./PortMappingTable";
import StreamTable from "./StreamTable";

import { get } from "../../common/API";
import {
  ButtonGroup,
  Col,
  Dropdown,
  DropdownButton,
  Form,
  Row,
} from "react-bootstrap";
import InfoBox from "../InfoBox";
import { AddStreamButton, ResultTable, SaveResetButtons } from "./Utils";

const Profile2 = () => {
  const [ports, set_ports] = useState<
    {
      pid: number;
      port: number;
      channel: number;
      loopback: string;
      status: boolean;
    }[]
  >([]);

  const [running, set_running] = useState(false);
  const [selected_profile, set_selected_profile] = useState<string>("RFC 2544");

  const [results, set_results] = useState<RFCTestResults>({
    throughput: null,
    latency: null,
    frame_loss_rate: null,
    back_to_back: null,
    reset: null,
  });

  const [trafficGenList, set_trafficGenList] = useState<TrafficGenList>(
    JSON.parse(localStorage.getItem("traffic_gen") ?? "{}")
  );
  const [currentTest, setCurrentTest] = useState<TrafficGenData | null>(null);

  const [rfc, setRFC] = useState<RFC>(RFC.ALL);

  const handleRFCChange = (event: any) => {
    setRFC(event.target.value);
  };

  const loadPorts = async () => {
    try {
      let stats = await get({ route: "/ports" });

      if (stats && stats.status === 200) {
        set_ports(stats.data);
        if (Object.keys(trafficGenList).length === 0) {
          const defaultData = DefaultTrafficGenData(stats.data);
          set_trafficGenList({
            ...trafficGenList,
            [selected_profile]: defaultData,
          });
          setCurrentTest(defaultData);
        } else {
          const savedCurrentTest = trafficGenList[1];
          setCurrentTest(savedCurrentTest);
          setRFC(Number(savedCurrentTest?.name) || RFC.ALL);
        }
      } else {
        console.error("Failed to load ports:", stats);
      }
    } catch (error) {
      console.error("Error loading ports:", error);
    }
  };

  const loadTestResults = async () => {
    try {
      let results = await get({ route: "/profiles" });

      if (results && results.status === 200) {
        set_results(results.data);
        if (!results.data.running) {
          set_running(false);
        } else {
          set_running(true);
        }
      } else {
        console.error("Failed to load results:", results);
      }
    } catch (error) {
      console.error("Error loading results:", error);
    }
  };

  useEffect(() => {
    const savedTrafficGenList = JSON.parse(
      localStorage.getItem("traffic_gen") ?? "{}"
    );
    set_trafficGenList(savedTrafficGenList);
    setCurrentTest(savedTrafficGenList[selected_profile as any] || null);
    loadPorts();
    loadTestResults();
  }, []);

  useEffect(() => {
    loadTestResults();
  }, [results]);

  const handlePortChange = (event: any, pid: number) => {
    if (!currentTest) return;

    const newPortTxRxMapping = { ...currentTest.port_tx_rx_mapping };

    if (parseInt(event.target.value) === -1) {
      delete newPortTxRxMapping[pid];
    } else {
      newPortTxRxMapping[pid] = parseInt(event.target.value);
    }

    const updatedTest: TrafficGenData = {
      ...currentTest,
      port_tx_rx_mapping: newPortTxRxMapping,
    };

    setCurrentTest(updatedTest);
  };

  // Remove this function and make the
  const removeStream = () => {
    return;
  };

  const save = () => {
    if (!currentTest) return;

    const updatedTrafficGenList: TrafficGenList = {
      "1": { ...currentTest, name: rfc.toString() },
    };

    localStorage.setItem("traffic_gen", JSON.stringify(updatedTrafficGenList));
    set_trafficGenList(updatedTrafficGenList);
    alert("Settings saved.");
  };

  const reset = () => {
    if (!currentTest) return;

    const initialStream = DefaultStream(1);
    const initialStreamSettings = ports
      .filter((v) => v.loopback === "BF_LPBK_NONE")
      .map((v) => DefaultStreamSettings(1, v.pid));

    const updatedTest: TrafficGenData = {
      ...currentTest,
      streams: [initialStream],
      stream_settings: initialStreamSettings,
      port_tx_rx_mapping: {},
      mode: GenerationMode.CBR,
      duration: 0,
    };

    const updatedTrafficGenList: TrafficGenList = {
      "1": updatedTest,
    };

    localStorage.setItem("traffic_gen", JSON.stringify(updatedTrafficGenList));
    set_trafficGenList(updatedTrafficGenList);
    setCurrentTest(updatedTest);
    window.location.reload();
  };

  return (
    <>
      <Row className="align-items-end d-flex justify-content-between">
        <Col className="col-2">
          <DropdownButton
            as={ButtonGroup}
            className="me-3"
            variant={"secondary"}
            key={"Select Profile"}
            title={selected_profile}
          >
            <Dropdown.Item
              eventKey={"RFC2544"}
              active={"RFC2544" === selected_profile}
              key={"RFC2544"}
            >
              RFC2544
            </Dropdown.Item>
          </DropdownButton>
          <InfoBox>
            <>
              <h4>RFC 2544</h4>
              <p>
                RFC 2544 definiert Methoden zur Leistungsbewertung von
                Netzwerkgeräten. Die wichtigsten Tests sind:
              </p>
              <ul>
                <li>
                  <strong>Durchsatz:</strong> Maximale Datenrate ohne
                  Paketverlust.
                </li>
                <li>
                  <strong>Latenz:</strong> Zeit für ein Paket, durch das Gerät
                  zu gelangen.
                </li>
                <li>
                  <strong>Paketverlust:</strong> Anzahl verlorener Pakete bei
                  verschiedenen Datenraten.
                </li>
                <li>
                  <strong>Jitter:</strong> Variabilität der Paketlatenz.
                </li>
                <li>
                  <strong>Back-to-Back Frames:</strong> Verarbeitung
                  aufeinanderfolgender Pakete.
                </li>
                <li>
                  <strong>System-Recovery:</strong> Erholungszeit nach
                  Überlastung.
                </li>
              </ul>
            </>
          </InfoBox>
        </Col>
        <Col className="col-2">
          <Form.Text className="text-muted">Selected Test</Form.Text>
          <Form.Select
            disabled={running}
            required
            onChange={handleRFCChange}
            className="me-3"
            value={rfc}
          >
            <option value={RFC.ALL}>All</option>
            <option value={RFC.THROUGHPUT}>Throughput</option>
            <option value={RFC.LATENCY}>Latency</option>
            <option value={RFC.FRAME_LOSS_RATE}>Frame-Loss</option>
            <option value={RFC.BACK_TO_BACK}>Back-To-Back Frames</option>
            <option value={RFC.RESET}>Reset</option>
          </Form.Select>
        </Col>
      </Row>

      <ResultTable results={results} running={running} />

      <StreamTable
        {...{
          removeStream,
          running,
          currentTest,
        }}
      />

      <PortMappingTable
        {...{
          ports,
          running,
          handlePortChange,
          currentTest,
        }}
      />
      <SaveResetButtons onSave={save} onReset={reset} running={running} />
    </>
  );
};

export default Profile2;
