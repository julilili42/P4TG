import { useEffect, useState } from "react";
import {
  Button,
  Col,
  Form,
  Row,
  Tab,
  Tabs,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { del, get, post } from "../common/API";
import SendReceiveMonitor from "../components/SendReceiveMonitor";
import StatView from "../components/StatView";
import Loader from "../components/Loader";
import {
  GenerationMode,
  TestMode,
  Statistics as StatInterface,
  StatisticsObject,
  TimeStatistics,
  TimeStatisticsObject,
  TrafficGenData,
  TrafficGenList,
} from "../common/Interfaces";
import styled from "styled-components";
import StreamView from "../components/StreamView";
import translate from "../components/translation/Translate";
import HiddenGraphs from "../components/pdf/HiddenVisuals";
import Download from "../components/Download";

import {
  activePorts,
  getStreamFrameSize,
  getStreamIDsByPort,
} from "../common/utils/StatisticUtils";

const StyledLink = styled.a`
  color: var(--color-secondary);
  text-decoration: none;
  opacity: 0.5;

  :hover {
    opacity: 1;
    color: var(--color-primary);
  }
`;

export const GitHub = () => {
  return (
    <Row className="mt-2">
      <Col className="text-center col-12 mt-3">
        <StyledLink href="https://github.com/uni-tue-kn/P4TG" target="_blank">
          P4TG @ <i className="bi bi-github"></i>
        </StyledLink>
      </Col>
    </Row>
  );
};

const Home = () => {
  const [loaded, set_loaded] = useState(false);
  const [overlay, set_overlay] = useState(false);
  const [running, set_running] = useState(false);
  const [visual, set_visual] = useState(true);

  const [imageData, setImageData] = useState<string[]>([]);

  const [test_mode, set_test_mode] = useState(
    parseInt(localStorage.getItem("test-mode") || String(TestMode.SINGLE))
  );

  const [traffic_gen_list, set_traffic_gen_list] = useState<TrafficGenList>(
    JSON.parse(localStorage.getItem("traffic_gen") ?? "{}")
  );

  const [statistics, set_statistics] =
    useState<StatInterface>(StatisticsObject);
  const [time_statistics, set_time_statistics] =
    useState<TimeStatistics>(TimeStatisticsObject);

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

  const [currentTestNumber, setCurrentTestNumber] = useState<number>(1);
  const [totalTestsNumber, setTotalTestsNumber] = useState<number>(1);
  const [currentTestDuration, setCurrentTestDuration] = useState<number>(0);

  useEffect(() => {
    refresh();

    const interval_stats = setInterval(
      async () => await Promise.all([loadStatistics()]),
      500
    );
    const test_number = setInterval(
      async () => await Promise.all([loadTestInfo()]),
      500
    );
    const interval_loadgen = setInterval(
      async () => await Promise.all([loadGen()]),
      5000
    );
    const inverval_timestats = setInterval(
      async () => await Promise.all([loadTimeStatistics()]),
      2000
    );

    return () => {
      clearInterval(interval_stats);
      clearInterval(test_number);
      clearInterval(interval_loadgen);
      clearInterval(inverval_timestats);
    };
  }, []);

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

  const refresh = async () => {
    await loadGen();
    await loadStatistics();
    await loadTestInfo();
    set_loaded(true);
  };

  const onSubmit = async (event: any) => {
    event.preventDefault();
    set_overlay(true);

    if (running) {
      await del({ route: "/trafficgen" });
      set_running(false);
    } else {
      const oneModeAnalyze = Object.values(traffic_gen_list).some(
        (test) => test.mode === GenerationMode.ANALYZE
      );

      const streamsIsZero = Object.values(traffic_gen_list).every(
        (test) => test.streams.length === 0
      );

      if (streamsIsZero && oneModeAnalyze) {
        alert("You need to define at least one stream.");
      } else {
        let overall_rates = [];

        for (const test of Object.values(traffic_gen_list)) {
          let overall_rate = 0;
          test.streams.forEach((v: any) => {
            overall_rate += v.traffic_rate;
          });
          overall_rates.push(overall_rate);
        }

        const max_rate = Math.max(...overall_rates);

        const oneModeMPPS = Object.values(traffic_gen_list).some(
          (test) => test.gen_mode === GenerationMode.MPPS
        );

        if (oneModeMPPS && max_rate > 100) {
          alert("Sum of stream rates > 100 Gbps!");
        } else {
          if (test_mode === TestMode.SINGLE) {
            const singleTest = traffic_gen_list[1];
            localStorage.setItem(
              "traffic_gen",
              JSON.stringify({ "1": { ...singleTest, duration: 0 } })
            );

            await post({
              route: "/trafficgen",
              body: {
                streams: singleTest.streams,
                stream_settings: singleTest.stream_settings,
                port_tx_rx_mapping: singleTest.port_tx_rx_mapping,
                mode: singleTest.mode,
              },
            });
          } else if (test_mode === TestMode.MULTI) {
            const traffic_generations = Object.keys(traffic_gen_list).map(
              (test_number: any) => ({
                streams: traffic_gen_list[test_number].streams,
                stream_settings: traffic_gen_list[test_number].stream_settings,
                port_tx_rx_mapping:
                  traffic_gen_list[test_number].port_tx_rx_mapping,
                mode: traffic_gen_list[test_number].mode,
                duration: traffic_gen_list[test_number].duration,
              })
            );

            console.log(traffic_generations);
            await post({
              route: "/multiple_trafficgen",
              body: traffic_generations,
            });
            setTotalTestsNumber(traffic_generations.length);
          }
          set_running(true);
        }
      }
    }
    set_overlay(false);
  };

  const loadTestInfo = async () => {
    let stats = await get({ route: "/statistics" });
    let tg = await get({ route: "/trafficgen" });

    if (tg != undefined && tg.status === 200) {
      const allTests = tg.data.all_test ?? {};
      const newTotalTestsNumber =
        Object.keys(allTests).length > 0 ? Object.keys(allTests).length : 1;
      setTotalTestsNumber(newTotalTestsNumber);

      if (stats != undefined && stats.status === 200) {
        const previousStats = stats.data.previous_statistics ?? {};
        const testNumbersArray = Object.keys(previousStats).map(Number);

        let currentTestNumber =
          testNumbersArray.length > 0 ? Math.max(...testNumbersArray) + 1 : 1;

        if (currentTestNumber > newTotalTestsNumber) {
          currentTestNumber = newTotalTestsNumber;
        }

        setCurrentTestNumber(currentTestNumber);

        const newTestDuration =
          traffic_gen_list[currentTestNumber]?.duration || 0;
        setCurrentTestDuration(newTestDuration);
      }
    }
  };

  const loadStatistics = async () => {
    let stats = await get({ route: "/statistics" });

    if (stats != undefined && stats.status === 200) {
      set_statistics(stats.data);
    }
  };

  const loadTimeStatistics = async () => {
    let stats = await get({ route: "/time_statistics?limit=100" });

    if (stats != undefined && stats.status === 200) {
      set_time_statistics(stats.data);
    }
  };

  const loadGen = async () => {
    let stats = await get({ route: "/trafficgen" });

    if (stats != undefined && Object.keys(stats.data).length > 1) {
      const allTests = stats.data.all_test ?? {
        1: {
          streams: stats.data.streams,
          stream_settings: stats.data.stream_settings,
          port_tx_rx_mapping: stats.data.port_tx_rx_mapping,
          mode: stats.data.mode,
          duration: stats.data.duration,
        },
      };

      // Convert allTests to the new traffic_gen_list structure
      const trafficGenList: TrafficGenList = Object.fromEntries(
        Object.entries(allTests).map(([testKey, test]: any) => [
          parseInt(testKey, 10),
          {
            streams: test.streams,
            stream_settings: test.stream_settings,
            port_tx_rx_mapping: test.port_tx_rx_mapping,
            mode: test.mode,
            duration: test.duration,
          } as TrafficGenData,
        ])
      );

      // Save the trafficGenList to the local storage
      localStorage.setItem("traffic_gen", JSON.stringify(trafficGenList));

      // Update the state
      set_traffic_gen_list(trafficGenList);
      set_running(true);
    } else {
      set_running(false);
    }
  };

  const reset = async () => {
    set_overlay(true);
    await get({ route: "/reset" });
    set_overlay(false);
  };

  const restart = async () => {
    set_overlay(true);
    await get({ route: "/restart" });
    set_overlay(false);
  };

  const shouldShowDownloadButton = (
    running: boolean,
    statistics: TimeStatistics
  ) => {
    return !running && Object.keys(statistics.tx_rate_l1).length > 0;
  };

  const handleGraphConvert = (newImageData: string[]) => {
    setImageData(newImageData);
  };

  const handleSelectTest = (testNumber: number) => {
    const selectedStatistics =
      statistics?.previous_statistics?.[testNumber] || null;
    const selectedTimeStatistics =
      time_statistics?.previous_time_statistics?.[testNumber] || null;

    const selectedTrafficGen = traffic_gen_list[testNumber] || null;

    setSelectedTest({
      statistics: selectedStatistics,
      timeStatistics: selectedTimeStatistics,
      trafficGen: selectedTrafficGen,
    });

    setCurrentTest(testNumber);
  };

  return (
    <Loader loaded={loaded} overlay={overlay}>
      <form onSubmit={onSubmit}>
        <Row className={"mb-3"}>
          <SendReceiveMonitor stats={statistics} running={running} />
          <Col className={"text-end col-4"}>
            {running ? (
              <>
                <Button type={"submit"} className="mb-1" variant="danger">
                  <i className="bi bi-stop-fill" /> Stop
                </Button>{" "}
                <Button onClick={restart} className="mb-1" variant="primary">
                  <i className="bi bi-arrow-clockwise" />{" "}
                  {translate("Restart", currentLanguage)}{" "}
                </Button>
              </>
            ) : (
              <>
                <div style={{ display: "inline-block", position: "relative" }}>
                  <div>
                    <Button type={"submit"} className="mb-1" variant="primary">
                      <i className="bi bi-play-circle-fill" /> Start{" "}
                    </Button>{" "}
                    <Button
                      onClick={() => {
                        reset();
                      }}
                      className="mb-1"
                      variant="warning"
                    >
                      <i className="bi bi-trash-fill" />{" "}
                      {translate("Reset", currentLanguage)}{" "}
                    </Button>{" "}
                  </div>
                  {shouldShowDownloadButton(running, time_statistics) ? (
                    <>
                      <HiddenGraphs
                        data={time_statistics}
                        stats={statistics}
                        port_mapping={
                          traffic_gen_list[currentTestNumber]
                            ?.port_tx_rx_mapping || {}
                        }
                        onConvert={handleGraphConvert}
                      />
                      <Download
                        data={time_statistics}
                        stats={statistics}
                        portTxRxMappingList={Object.fromEntries(
                          Object.entries(traffic_gen_list).map(
                            ([key, value]) => [key, value.port_tx_rx_mapping]
                          )
                        )}
                        modeList={Object.fromEntries(
                          Object.entries(traffic_gen_list).map(
                            ([key, value]) => [key, value.mode]
                          )
                        )}
                        streamsList={Object.fromEntries(
                          Object.entries(traffic_gen_list).map(
                            ([key, value]) => [key, value.streams]
                          )
                        )}
                        streamSettingsList={Object.fromEntries(
                          Object.entries(traffic_gen_list).map(
                            ([key, value]) => [key, value.stream_settings]
                          )
                        )}
                        graph_images={imageData}
                      />
                    </>
                  ) : (
                    <></>
                  )}
                </div>
              </>
            )}
          </Col>
        </Row>
      </form>
      <Row className="d-flex align-items-center">
        <Col className={"col-auto"}>
          <Form>
            <Form.Check // prettier-ignore
              type="switch"
              id="custom-switch"
              checked={visual}
              onClick={() => set_visual(!visual)}
              label={translate("Visualization", currentLanguage)}
            />
          </Form>
        </Col>
        {running && test_mode === TestMode.MULTI ? (
          <Col className={"col-auto"}>
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="test-info-tooltip">
                  Test {currentTestNumber} of {totalTestsNumber}
                  <br />
                  Duration {currentTestDuration} seconds
                </Tooltip>
              }
            >
              <i className="bi bi-info-circle" style={{ cursor: "pointer" }} />
            </OverlayTrigger>{" "}
            Test info
          </Col>
        ) : (
          <></>
        )}
      </Row>
      <Tabs
        defaultActiveKey="current"
        className="mt-3"
        onSelect={(eventKey) => handleSelectTest(Number(eventKey))}
      >
        <Tab eventKey="current" title={`Current`}>
          <Tabs defaultActiveKey="Summary" className="mt-3">
            <Tab
              eventKey="Summary"
              title={translate("Summary", currentLanguage)}
            >
              <StatView
                stats={statistics}
                time_stats={time_statistics}
                port_mapping={
                  traffic_gen_list[currentTestNumber]?.port_tx_rx_mapping || {}
                }
                visual={visual}
                mode={traffic_gen_list[currentTestNumber]?.mode || 0}
              />
            </Tab>
            {activePorts(
              traffic_gen_list[currentTestNumber]?.port_tx_rx_mapping || {}
            ).map((v, i) => {
              let mapping: { [name: number]: number } = { [v.tx]: v.rx };
              return (
                <Tab eventKey={i} key={i} title={v.tx + "->" + v.rx}>
                  <Tabs defaultActiveKey={"Overview"} className={"mt-3"}>
                    <Tab eventKey={"Overview"} title={"Overview"}>
                      <StatView
                        stats={statistics}
                        time_stats={time_statistics}
                        port_mapping={mapping}
                        mode={traffic_gen_list[currentTestNumber]?.mode || 0}
                        visual={visual}
                      />
                    </Tab>
                    {Object.keys(mapping)
                      .map(Number)
                      .map((v) => {
                        let stream_ids = getStreamIDsByPort(
                          v,
                          traffic_gen_list[currentTestNumber]
                            ?.stream_settings || [],
                          traffic_gen_list[currentTestNumber]?.streams || []
                        );
                        return stream_ids.map((stream: number, i) => {
                          let stream_frame_size: any = getStreamFrameSize(
                            traffic_gen_list[currentTestNumber]?.streams || [],
                            stream
                          );
                          return (
                            <Tab
                              key={i}
                              eventKey={stream}
                              title={"Stream " + stream}
                            >
                              <StreamView
                                stats={statistics}
                                port_mapping={mapping}
                                stream_id={stream}
                                frame_size={stream_frame_size}
                              />
                            </Tab>
                          );
                        });
                      })}
                  </Tabs>
                </Tab>
              );
            })}
          </Tabs>
        </Tab>
        {Object.keys(statistics.previous_statistics || {}).map((key) => (
          <Tab key={Number(key)} eventKey={Number(key)} title={`Test ${key}`}>
            <Tabs defaultActiveKey="Summary" className="mt-3">
              <Tab
                eventKey="Summary"
                title={translate("Summary", currentLanguage)}
              >
                {selectedTest.statistics && selectedTest.timeStatistics && (
                  <>
                    <StatView
                      stats={selectedTest.statistics}
                      time_stats={selectedTest.timeStatistics}
                      port_mapping={
                        selectedTest.trafficGen?.port_tx_rx_mapping || {}
                      }
                      mode={selectedTest.trafficGen?.mode || 0}
                      visual={visual}
                    />
                  </>
                )}
              </Tab>
              {activePorts(
                selectedTest.trafficGen?.port_tx_rx_mapping || {}
              ).map((v, i) => {
                let mapping: { [name: number]: number } = { [v.tx]: v.rx };
                return (
                  <Tab eventKey={i} key={i} title={v.tx + "->" + v.rx}>
                    <Tabs defaultActiveKey={"Overview"} className={"mt-3"}>
                      <Tab eventKey={"Overview"} title={"Overview"}>
                        {selectedTest.statistics &&
                          selectedTest.timeStatistics && (
                            <>
                              <StatView
                                stats={selectedTest.statistics}
                                time_stats={selectedTest.timeStatistics}
                                port_mapping={mapping}
                                mode={selectedTest.trafficGen?.mode || 0}
                                visual={visual}
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
          </Tab>
        ))}
      </Tabs>
      <GitHub />
    </Loader>
  );
};

export default Home;
