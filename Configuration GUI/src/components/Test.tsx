import { useState, useEffect } from "react";
import { get } from "../common/API";
import { Alert, Row, Col, Tabs, Tab } from "react-bootstrap";
import {
  Statistics as StatInterface,
  TimeStatistics,
  TrafficGenData,
} from "../common/Interfaces";
import StatView from "./StatView";
import translate from "./translation/Translate";
import {
  activePorts,
  getStreamFrameSize,
  getStreamIDsByPort,
} from "../common/utils/StatisticUtils";
import StreamView from "./StreamView";

const Test = () => {
  const [statistics, setStatistics] = useState<StatInterface | null>(null);
  const [timeStatistics, setTimeStatistics] = useState<TimeStatistics | null>(
    null
  );
  const [trafficGenData, setTrafficGenData] = useState<TrafficGenData[] | null>(
    null
  );
  const [message, setMessage] = useState<string | null>(null);
  const [currentTest, setCurrentTest] = useState<number | null>(null);
  const [selectedTest, setSelectedTest] = useState<{
    statistics: StatInterface | null;
    timeStatistics: TimeStatistics | null;
    trafficGen: TrafficGenData | null;
  }>({
    statistics: null,
    timeStatistics: null,
    trafficGen: null,
  });

  const loadStatistics = async () => {
    try {
      const [responseStatistics, responseTimeStatistics, responseTrafficGen] =
        await Promise.all([
          get({ route: "/statistics" }),
          get({ route: "/time_statistics" }),
          get({ route: "/multiple_trafficgen" }),
        ]);

      if (
        responseStatistics?.status === 200 &&
        responseTimeStatistics?.status === 200 &&
        responseTrafficGen?.status === 200
      ) {
        setStatistics(responseStatistics.data || null);
        setTimeStatistics(responseTimeStatistics.data || null);
        setTrafficGenData(responseTrafficGen.data || null);
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
    const selectedStatistics =
      statistics?.previous_statistics?.[testNumber - 1] || null;
    const selectedTimeStatistics =
      timeStatistics?.previous_time_statistics?.[testNumber - 1] || null;
    const selectedTrafficGen = trafficGenData
      ? trafficGenData[testNumber - 1]
      : null;

    setSelectedTest({
      statistics: selectedStatistics,
      timeStatistics: selectedTimeStatistics,
      trafficGen: selectedTrafficGen,
    });
    setCurrentTest(testNumber); // Update the current test number
  };

  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem("language") || "en-US"
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const storedLanguage = localStorage.getItem("language") || "en-US";
      if (storedLanguage !== currentLanguage) {
        setCurrentLanguage(storedLanguage);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [currentLanguage]);

  return (
    <>
      {message && <Alert variant="info">{message}</Alert>}
      {statistics && timeStatistics && (
        <Tabs
          defaultActiveKey="Test 1"
          onSelect={(eventKey) => handleSelectTest(Number(eventKey))}
        >
          {(statistics.previous_statistics || []).map((test, index) => (
            <Tab
              key={index + 1}
              eventKey={index + 1}
              title={`Test ${index + 1}`}
            >
              {selectedTest.statistics && selectedTest.timeStatistics && (
                <>
                  <Tabs defaultActiveKey="Summary" className="mt-3">
                    <Tab
                      eventKey="Summary"
                      title={translate("Summary", currentLanguage)}
                    >
                      <StatView
                        stats={selectedTest.statistics}
                        time_stats={selectedTest.timeStatistics}
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
                      let mapping: { [name: number]: number } = {
                        [v.tx]: v.rx,
                      };
                      return (
                        <Tab eventKey={i} key={i} title={v.tx + "->" + v.rx}>
                          <Tabs
                            defaultActiveKey={"Overview"}
                            className={"mt-3"}
                          >
                            <Tab eventKey={"Overview"} title={"Overview"}>
                              {selectedTest.statistics &&
                                selectedTest.timeStatistics && (
                                  <>
                                    <StatView
                                      stats={selectedTest.statistics}
                                      time_stats={selectedTest.timeStatistics}
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
                                  selectedTest.trafficGen?.stream_settings ||
                                    [],
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
                                      {selectedTest.statistics &&
                                        selectedTest.timeStatistics && (
                                          <>
                                            <StreamView
                                              stats={selectedTest.statistics}
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
                      <h3>Details für Test {index + 1}</h3>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <h4>Statistics:</h4>
                      <pre>
                        {JSON.stringify(selectedTest.statistics, null, 2)}
                      </pre>
                    </Col>
                    <Col>
                      <h4>Time Statistics:</h4>
                      <pre>
                        {JSON.stringify(selectedTest.timeStatistics, null, 2)}
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
            </Tab>
          ))}
        </Tabs>
      )}
    </>
  );
};

export default Test;
