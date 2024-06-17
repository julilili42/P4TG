import { useState, useEffect } from "react";
import { get } from "../common/API";
import {
  Alert,
  DropdownButton,
  Dropdown,
  Row,
  Col,
  Tabs,
  Tab,
} from "react-bootstrap";
import {
  Statistics as StatInterface,
  TimeStatistics,
  Stream,
  StreamSettings,
  GenerationMode,
} from "../common/Interfaces";
import StatView from "./StatView";
import translate from "./translation/Translate";
import {
  activePorts,
  getStreamFrameSize,
  getStreamIDsByPort,
} from "../common/utils/StatisticUtils";
import StreamView from "./StreamView";

export interface TrafficGenData {
  mode: GenerationMode;
  streams: Stream[];
  stream_settings: StreamSettings[];
  port_tx_rx_mapping: { [name: number]: number };
}

interface MultipleStatistics {
  test_number: number;
  completed: boolean;
  duration: number;
  statistics: StatInterface;
}

interface MultipleTimeStatistics {
  test_number: number;
  completed: boolean;
  duration: number;
  time_statistics: TimeStatistics;
}

interface MultipleTrafficGen {
  traffic_generations: TrafficGenData[];
  durations: number[];
}

const Test = () => {
  const [multipleStatistics, setMultipleStatistics] = useState<
    MultipleStatistics[]
  >([]);
  const [multipleTimeStatistics, setMultipleTimeStatistics] = useState<
    MultipleTimeStatistics[]
  >([]);
  const [trafficGenData, setTrafficGenData] =
    useState<MultipleTrafficGen | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [currentTest, setCurrentTest] = useState<number | null>(null);
  const [selectedTest, setSelectedTest] = useState<{
    multipleStatistics: MultipleStatistics | null;
    multipleTimeStatistics: MultipleTimeStatistics | null;
    trafficGen: TrafficGenData | null;
  }>({
    multipleStatistics: null,
    multipleTimeStatistics: null,
    trafficGen: null,
  });

  const loadStatistics = async () => {
    try {
      const [responseStatistics, responseTimeStatistics, responseTrafficGen] =
        await Promise.all([
          get({ route: "/multiple_statistics" }),
          get({ route: "/multiple_time_statistics" }),
          get({ route: "/multiple_trafficgen" }),
        ]);

      if (
        responseStatistics?.status === 200 &&
        responseTimeStatistics?.status === 200 &&
        responseTrafficGen?.status === 200
      ) {
        setMultipleStatistics(responseStatistics.data || []);
        setMultipleTimeStatistics(responseTimeStatistics.data || []);
        setTrafficGenData(responseTrafficGen.data[0] || null); // Assuming the data is wrapped in an array
        setMessage("Statistiken erfolgreich geladen.");
      } else {
        setMessage("Fehler beim Laden der Statistiken.");
      }
    } catch (error) {
      setMessage("Fehler beim Laden der Statistiken.");
    }
  };

  useEffect(() => {
    loadStatistics();

    const interval = setInterval(() => {
      loadStatistics();
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleSelectTest = (testNumber: number) => {
    const selectedMultipleStatistics =
      multipleStatistics.find((test) => test.test_number === testNumber) ||
      null;
    const selectedMultipleTimeStatistics =
      multipleTimeStatistics.find((test) => test.test_number === testNumber) ||
      null;
    const selectedTrafficGen =
      trafficGenData?.traffic_generations[testNumber - 1] || null;

    setSelectedTest({
      multipleStatistics: selectedMultipleStatistics,
      multipleTimeStatistics: selectedMultipleTimeStatistics,
      trafficGen: selectedTrafficGen,
    });
    setCurrentTest(testNumber); // Update the current test number
    console.log(selectedTest);
  };

  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem("language") || "en-US"
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const storedLanguage = localStorage.getItem("language") || "en-US";
      if (storedLanguage != currentLanguage) {
        setCurrentLanguage(storedLanguage);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [currentLanguage]);

  return (
    <>
      {message && <Alert variant="info">{message}</Alert>}
      {multipleStatistics.length > 0 && multipleTimeStatistics.length > 0 && (
        <>
          <DropdownButton
            id="dropdown-basic-button"
            title={
              selectedTest.multipleStatistics !== null
                ? `Test ${selectedTest.multipleStatistics.test_number}`
                : "Wähle einen Test"
            }
            onSelect={(eventKey) => handleSelectTest(Number(eventKey))}
          >
            {multipleStatistics.map((test) => (
              <Dropdown.Item key={test.test_number} eventKey={test.test_number}>
                Test {test.test_number}
              </Dropdown.Item>
            ))}
          </DropdownButton>
          {selectedTest.multipleStatistics &&
            selectedTest.multipleTimeStatistics && (
              <>
                <Tabs defaultActiveKey="Summary" className="mt-3">
                  <Tab
                    eventKey="Summary"
                    title={translate("Summary", currentLanguage)}
                  >
                    <StatView
                      stats={selectedTest.multipleStatistics.statistics}
                      time_stats={
                        selectedTest.multipleTimeStatistics.time_statistics
                      }
                      port_mapping={
                        selectedTest.trafficGen?.port_tx_rx_mapping || {}
                      }
                      visual={true}
                      mode={selectedTest.trafficGen?.mode || 0}
                    />
                  </Tab>
                  {activePorts(
                    selectedTest.trafficGen?.port_tx_rx_mapping || {}
                  ).map((v, i) => {
                    let mapping: { [name: number]: number } = { [v.tx]: v.rx };
                    return (
                      <Tab eventKey={i} key={i} title={v.tx + "->" + v.rx}>
                        <Tabs defaultActiveKey={"Overview"} className={"mt-3"}>
                          <Tab eventKey={"Overview"} title={"Overview"}>
                            {selectedTest.multipleStatistics &&
                              selectedTest.multipleTimeStatistics && (
                                <>
                                  <StatView
                                    stats={
                                      selectedTest.multipleStatistics.statistics
                                    }
                                    time_stats={
                                      selectedTest.multipleTimeStatistics
                                        .time_statistics
                                    }
                                    port_mapping={mapping}
                                    mode={selectedTest.trafficGen?.mode || 0}
                                    visual={true}
                                  />
                                </>
                              )}
                          </Tab>
                          {Object.keys(mapping)
                            .map(Number)
                            .map((v) => {
                              let stream_ids = getStreamIDsByPort(
                                v,
                                selectedTest.trafficGen?.stream_settings || [],
                                selectedTest.trafficGen?.streams || []
                              );
                              return stream_ids.map((stream: number, i) => {
                                let stream_frame_size = getStreamFrameSize(
                                  selectedTest.trafficGen?.streams || [],
                                  stream
                                );
                                return (
                                  <Tab
                                    key={i}
                                    eventKey={stream}
                                    title={"Stream " + stream}
                                  >
                                    {selectedTest.multipleStatistics &&
                                      selectedTest.multipleTimeStatistics && (
                                        <>
                                          <StreamView
                                            stats={
                                              selectedTest.multipleStatistics
                                                .statistics
                                            }
                                            port_mapping={mapping}
                                            stream_id={stream}
                                            frame_size={stream_frame_size}
                                          />
                                        </>
                                      )}
                                  </Tab>
                                );
                              });
                            })}
                        </Tabs>
                      </Tab>
                    );
                  })}
                </Tabs>
                <Row>
                  <Col>
                    <h3>
                      Details für Test{" "}
                      {selectedTest.multipleStatistics.test_number}
                    </h3>
                  </Col>
                </Row>
                <Row>
                  <Col>
                    <h4>Statistics:</h4>
                    <pre>
                      {JSON.stringify(
                        selectedTest.multipleStatistics.statistics,
                        null,
                        2
                      )}
                    </pre>
                  </Col>
                  <Col>
                    <h4>Time Statistics:</h4>
                    <pre>
                      {JSON.stringify(
                        selectedTest.multipleTimeStatistics.time_statistics,
                        null,
                        2
                      )}
                    </pre>
                  </Col>
                  <Col>
                    <h4>Port Mappings:</h4>
                    <pre>
                      {JSON.stringify(
                        selectedTest.trafficGen?.port_tx_rx_mapping,
                        null,
                        2
                      )}
                    </pre>
                  </Col>
                </Row>
              </>
            )}
        </>
      )}
    </>
  );
};

export default Test;
