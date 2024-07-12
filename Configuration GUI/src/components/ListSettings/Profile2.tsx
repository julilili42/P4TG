import { useEffect, useState } from "react";
import {
  DefaultTrafficGenData,
  DefaultStream,
  DefaultStreamSettings,
  TrafficGenData,
  TrafficGenList,
  GenerationMode,
  RFCTestResults,
} from "../../common/Interfaces";

import PortMappingTable from "./PortMappingTable";
import StreamTable from "./StreamTable";

import { get } from "../../common/API";
import {
  ButtonGroup,
  Col,
  Dropdown,
  DropdownButton,
  Row,
  Table,
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
    throughput: -1,
    latency: -1,
    frame_loss_rate: -1,
    back_to_back: -1,
  });

  const [trafficGenList, set_trafficGenList] = useState<TrafficGenList>(
    JSON.parse(localStorage.getItem("traffic_gen") ?? "{}")
  );
  const [currentTest, setCurrentTest] = useState<TrafficGenData | null>(null);

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
          setCurrentTest(trafficGenList[1]);
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
        if (results.data.message === "Not running.") {
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

  const removeStream = (id: number) => {
    if (!currentTest) return;

    const updatedStreams = currentTest.streams.filter(
      (v) => v.stream_id !== id
    );
    const updatedStreamSettings = currentTest.stream_settings.filter(
      (v) => v.stream_id !== id
    );

    const updatedTest: TrafficGenData = {
      ...currentTest,
      streams: updatedStreams,
      stream_settings: updatedStreamSettings,
    };

    setCurrentTest(updatedTest);
  };

  const addStream = () => {
    if (!currentTest) return;

    if (currentTest.streams.length > 6) {
      alert("Only 7 different streams allowed.");
    } else {
      let id = 0;

      if (currentTest.streams.length > 0) {
        id = Math.max(...currentTest.streams.map((s) => s.stream_id));
      }

      const newStream = DefaultStream(id + 1);
      const newStreamSettings = ports
        .filter((v) => v.loopback === "BF_LPBK_NONE")
        .map((v) => DefaultStreamSettings(id + 1, v.pid));

      const updatedStreams = [...currentTest.streams, newStream];
      const updatedStreamSettings = [
        ...(currentTest.stream_settings || []),
        ...newStreamSettings,
      ];

      const updatedTest: TrafficGenData = {
        ...currentTest,
        streams: updatedStreams,
        stream_settings: updatedStreamSettings,
      };

      setCurrentTest(updatedTest);
    }
  };

  const save = () => {
    if (!currentTest) return;

    const updatedTrafficGenList: TrafficGenList = {
      "1": { ...currentTest, name: selected_profile },
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

  const showResults = async () => {
    let profile = await get({ route: "/profiles" });

    return Object.values(profile)[0] !== "Not running.";
  };

  return (
    <>
      <Row className="align-items-end">
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
      </Row>

      <ResultTable results={results} />

      <StreamTable
        {...{
          removeStream,
          running,
          currentTest,
        }}
      />

      <AddStreamButton
        {...{
          addStream,
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
