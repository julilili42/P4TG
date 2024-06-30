import { useEffect, useRef, useState } from "react";
import { Col, Form, Row, Tab, Tabs } from "react-bootstrap";
import { get } from "../../common/API";
import {
  GenerationMode,
  DefaultStream,
  DefaultStreamSettings,
  TestMode,
  TrafficGenData,
} from "../../common/Interfaces";
import Loader from "../Loader";
import { GitHub } from "../../sites/Home";
import translate from "../translation/Translate";
import InfoBox from "../InfoBox";
import {
  SaveResetButtons,
  AddStreamButton,
  GenerationModeSelection,
  TestModeSelection,
  TotalDuration,
} from "./Utils";
import StreamTable from "./StreamTable";
import PortMappingTable from "./PortMappingTable";

interface TrafficGenList {
  [testId: number]: TrafficGenData;
}

interface Tab {
  eventKey: string;
  title: string;
  titleEditable: boolean;
}

const ListSettings = () => {
  const [traffic_gen_list, set_traffic_gen_list] = useState<TrafficGenList>(
    JSON.parse(localStorage.getItem("traffic_gen") ?? "{}")
  );
  const [currentTest, setCurrentTest] = useState<TrafficGenData | null>(null);

  const [currentTestMode, setCurrentTestMode] = useState(
    parseInt(localStorage.getItem("test-mode") || String(TestMode.SINGLE))
  );

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [key, setKey] = useState<string>("");
  const [currentTabIndex, setCurrentTabIndex] = useState<string | null>(null);
  const [running, set_running] = useState(false);
  const [ports, set_ports] = useState<
    {
      pid: number;
      port: number;
      channel: number;
      loopback: string;
      status: boolean;
    }[]
  >([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);

  const handleTestModeChange = (event: any) => {
    const value = Number(event.target.value);
    localStorage.setItem("test-mode", String(value));
    setCurrentTestMode(value);
  };

  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem("language") || "en-US"
  );

  const [loaded, set_loaded] = useState(true);

  const handleTitleChange = (eventKey: string, newTitle: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.eventKey === eventKey ? { ...tab, title: newTitle } : tab
      )
    );
  };

  const toggleTitleEdit = (eventKey: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.eventKey === eventKey
          ? { ...tab, titleEditable: !tab.titleEditable }
          : tab
      )
    );
  };

  const isTabValid = (
    index: number,
    currentTestMode: TestMode,
    trafficGenList: TrafficGenList
  ) => {
    const isEmptyObject = (obj: any) => {
      return Object.keys(obj).length === 0 && obj.constructor === Object;
    };

    const test = trafficGenList[index];

    if (currentTestMode === TestMode.MULTI) {
      return test.duration !== 0 && !isEmptyObject(test.port_tx_rx_mapping);
    } else {
      return !isEmptyObject(test.port_tx_rx_mapping);
    }
  };

  const initializeTabs = () => {
    if (currentTestMode === TestMode.MULTI) {
      const initializedTabs: Tab[] = Object.keys(traffic_gen_list).map(
        (key) => ({
          eventKey: `tab-${key}`,
          title: `Test ${key}`,
          titleEditable: false,
        })
      );
      initializedTabs.push({
        eventKey: "add",
        title: "+",
        titleEditable: false,
      });
      setTabs(initializedTabs);

      if (initializedTabs.length > 0) {
        setKey(initializedTabs[0].eventKey);
        setCurrentTabIndex(Object.keys(traffic_gen_list)[0]);
        setCurrentTest(
          traffic_gen_list[Object.keys(traffic_gen_list)[0] as any]
        );
      }
    } else {
      const initializedTabs: Tab[] = [
        {
          eventKey: "tab-1",
          title: "Test 1",
          titleEditable: false,
        },
      ];
      setTabs(initializedTabs);
      setKey("tab-1");
      setCurrentTabIndex("1");
      setCurrentTest(traffic_gen_list[1]);
    }
  };

  const saveToLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const addTab = () => {
    const newTabNumber = Object.keys(traffic_gen_list).length + 1;
    const newTabKey = `tab-${newTabNumber}`;

    const initialStream = DefaultStream(1);
    const initialStreamSettings = ports
      .filter((v) => v.loopback === "BF_LPBK_NONE")
      .map((v) => {
        const settings = DefaultStreamSettings(1, v.pid);
        return settings;
      });

    const newTrafficGenData: TrafficGenData = {
      streams: [initialStream],
      stream_settings: initialStreamSettings,
      port_tx_rx_mapping: {},
      mode: GenerationMode.CBR,
      duration: 0,
    };

    const updatedTrafficGenList = {
      ...traffic_gen_list,
      [newTabNumber]: newTrafficGenData,
    };

    saveToLocalStorage("traffic_gen", updatedTrafficGenList);
    set_traffic_gen_list(updatedTrafficGenList);

    const newTab = {
      eventKey: newTabKey,
      title: `Test ${newTabNumber}`,
      titleEditable: false,
      duration: 0,
    };

    const newTabs = [...tabs];
    newTabs.splice(tabs.length - 1, 0, newTab);
    setTabs(newTabs);
    setKey(newTabKey);
    setCurrentTabIndex(newTabNumber.toString());
    setCurrentTest(newTrafficGenData);
  };

  const deleteLocalStorageEntry = (key: string) => {
    const trafficGenData = JSON.parse(
      localStorage.getItem("traffic_gen") || "{}"
    );
    delete trafficGenData[key];

    // Update keys to ensure no gaps
    const updatedData: any = {};
    let newIndex = 1;
    Object.keys(trafficGenData).forEach((k) => {
      updatedData[newIndex] = trafficGenData[k];
      newIndex++;
    });

    localStorage.setItem("traffic_gen", JSON.stringify(updatedData));
  };

  const deleteStatesEntry = (key: string) => {
    const updatedTrafficGenList = { ...traffic_gen_list };
    delete updatedTrafficGenList[key as any];

    // Update keys to ensure no gaps
    const newTrafficGenList: any = {};
    let newIndex = 1;
    Object.keys(updatedTrafficGenList).forEach((k) => {
      newTrafficGenList[newIndex] = updatedTrafficGenList[k as any];
      newIndex++;
    });

    set_traffic_gen_list(newTrafficGenList);
  };

  const deleteTab = (eventKey: string) => {
    const tabNumber = eventKey.split("-")[1];

    deleteLocalStorageEntry(tabNumber);
    deleteStatesEntry(tabNumber);

    const newTabs = tabs.filter((tab) => tab.eventKey !== eventKey);

    newTabs.forEach((tab, i) => {
      if (tab.title.startsWith("Test")) {
        tab.title = `Test ${i + 1}`;
      }
    });

    setTabs(newTabs);

    if (eventKey === key && newTabs.length >= 2) {
      const newIndex = tabs.findIndex((tab) => tab.eventKey === eventKey);
      const newActiveTabIndex =
        newIndex < newTabs.length - 1 ? newIndex : newIndex - 1;
      setKey(newTabs[newActiveTabIndex].eventKey);
      setCurrentTabIndex(newTabs[newActiveTabIndex].eventKey.split("-")[1]);
      setCurrentTest(
        traffic_gen_list[
          newTabs[newActiveTabIndex].eventKey.split("-")[1] as any
        ]
      );
    } else if (newTabs.length === 1) {
      setKey(newTabs[0].eventKey);
      setCurrentTabIndex(newTabs[0].eventKey.split("-")[1]);
      setCurrentTest(
        traffic_gen_list[newTabs[0].eventKey.split("-")[1] as any]
      );
    }
  };

  const loadPorts = async () => {
    let stats = await get({ route: "/ports" });

    if (stats.status === 200) {
      set_ports(stats.data);
    }
  };

  const handlePortChange = (event: any, pid: number) => {
    if (!currentTest || currentTabIndex === null) return;

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

    const updatedTrafficGenList: TrafficGenList = {
      ...traffic_gen_list,
      [currentTabIndex]: updatedTest,
    };

    saveToLocalStorage("traffic_gen", updatedTrafficGenList);
    set_traffic_gen_list(updatedTrafficGenList);
    setCurrentTest(updatedTest);
  };

  const save = () => {
    if (currentTabIndex && currentTest) {
      const updatedTest: TrafficGenData = {
        streams: currentTest.streams,
        stream_settings: currentTest.stream_settings,
        port_tx_rx_mapping: currentTest.port_tx_rx_mapping,
        mode: currentTest.mode,
        duration: currentTest.duration,
      };

      const updatedTrafficGenList: TrafficGenList = {
        ...traffic_gen_list,
        [currentTabIndex]: updatedTest,
      };

      saveToLocalStorage("traffic_gen", updatedTrafficGenList);
      set_traffic_gen_list(updatedTrafficGenList);
      setCurrentTest(updatedTest);

      alert("Settings saved.");
    } else {
      alert("No test selected.");
    }
  };

  const reset = () => {
    const initialStream = DefaultStream(1);
    const initialStreamSettings = ports
      .filter((v) => v.loopback === "BF_LPBK_NONE")
      .map((v) => {
        const settings = DefaultStreamSettings(1, v.pid);
        return settings;
      });

    if (currentTabIndex) {
      const updatedTest: TrafficGenData = {
        streams: [initialStream],
        stream_settings: initialStreamSettings,
        port_tx_rx_mapping: {},
        mode: GenerationMode.CBR,
        duration: 0,
      };

      const updatedTrafficGenList: TrafficGenList = {
        ...traffic_gen_list,
        [currentTabIndex]: updatedTest,
      };

      saveToLocalStorage("traffic_gen", updatedTrafficGenList);
      set_traffic_gen_list(updatedTrafficGenList);
      setCurrentTest(updatedTest);

      alert("Reset complete.");
    } else {
      alert("No test selected.");
    }
  };

  const removeStream = (id: number) => {
    if (!currentTest || currentTabIndex === null) return;

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

    const updatedTrafficGenList: TrafficGenList = {
      ...traffic_gen_list,
      [currentTabIndex]: updatedTest,
    };

    saveToLocalStorage("traffic_gen", updatedTrafficGenList);
    set_traffic_gen_list(updatedTrafficGenList);
    setCurrentTest(updatedTest);
  };

  const addStream = () => {
    if (!currentTest || currentTabIndex === null) return;

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

      const updatedTrafficGenList: TrafficGenList = {
        ...traffic_gen_list,
        [currentTabIndex]: updatedTest,
      };

      set_traffic_gen_list(updatedTrafficGenList);
      setCurrentTest(updatedTest);
    }
  };

  const handleModeChange = (event: any) => {
    if (!currentTest || currentTabIndex === null) return;

    const newMode = parseInt(event.target.value);

    const updatedTest: TrafficGenData = {
      ...currentTest,
      mode: newMode,
    };

    const updatedTrafficGenList: TrafficGenList = {
      ...traffic_gen_list,
      [currentTabIndex]: updatedTest,
    };

    set_traffic_gen_list(updatedTrafficGenList);
    setCurrentTest(updatedTest);
  };

  const handleDurationChange = (event: any) => {
    if (!currentTest || currentTabIndex === null) return;

    const newDuration = isNaN(parseInt(event.target.value))
      ? 0
      : parseInt(event.target.value);

    const updatedTest: TrafficGenData = {
      ...currentTest,
      duration: newDuration,
    };

    const updatedTrafficGenList: TrafficGenList = {
      ...traffic_gen_list,
      [currentTabIndex]: updatedTest,
    };

    set_traffic_gen_list(updatedTrafficGenList);
    setCurrentTest(updatedTest);
  };

  const handleTotalDurationChange = (tests: TrafficGenList) => {
    let total = 0;
    Object.keys(tests).forEach((key) => {
      const test = tests[key as any];
      if (test && test.duration) {
        total += test.duration;
      }
    });
    setTotalDuration(total);
  };

  useEffect(() => {
    loadPorts();
    initializeTabs();
  }, [currentTestMode]);

  useEffect(() => {
    handleTotalDurationChange(traffic_gen_list);
  }, [traffic_gen_list]);

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
    <Loader loaded={loaded}>
      <Row className="align-items-end justify-content-between">
        <TestModeSelection
          currentLanguage={currentLanguage}
          currentTestMode={currentTestMode}
          handleTestModeChange={handleTestModeChange}
        />
        {currentTestMode ? (
          <TotalDuration
            currentLanguage={currentLanguage}
            totalDuration={totalDuration}
          />
        ) : (
          <></>
        )}
      </Row>

      <div style={{ marginTop: "20px" }}></div>

      <Tabs
        onSelect={(k: string | null) => {
          if (k === "add") {
            addTab();
          } else if (k) {
            setKey(k);
            setCurrentTabIndex(k.split("-")[1]);
            setCurrentTest(traffic_gen_list[k.split("-")[1] as any]);
          }
        }}
        activeKey={key}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.eventKey}
            eventKey={tab.eventKey}
            title={
              tab.eventKey !== "add" ? (
                <div className="d-flex align-items-center">
                  {tab.titleEditable ? (
                    <input
                      type="text"
                      value={tab.title}
                      onChange={(e) =>
                        handleTitleChange(tab.eventKey, e.target.value)
                      }
                      onBlur={() => toggleTitleEdit(tab.eventKey)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          toggleTitleEdit(tab.eventKey);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      onDoubleClick={() => toggleTitleEdit(tab.eventKey)}
                      style={{
                        color: "inherit",
                        textAlign: "inherit",
                        flexGrow: "inherit",
                        display: "inline",
                        opacity: "1",
                      }}
                    >
                      {isTabValid(
                        index + 1,
                        currentTestMode,
                        traffic_gen_list
                      ) ? (
                        tab.title
                      ) : (
                        <div>
                          <i className="bi bi-exclamation-triangle"></i>{" "}
                          {tab.title}
                        </div>
                      )}
                    </span>
                  )}

                  {tab.eventKey !== "tab-1" ? (
                    <button
                      className="outline-none border-0 bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTab(tab.eventKey);
                      }}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  ) : (
                    <></>
                  )}
                </div>
              ) : (
                tab.title
              )
            }
          >
            <div style={{ marginTop: "20px" }}></div>

            <Row>
              <Col className={"col-2"}>
                <Form.Text className="text-muted">
                  {translate("Generation Mode", currentLanguage)}
                </Form.Text>
              </Col>
              {currentTestMode === TestMode.MULTI ? (
                <Col className={"col-2"}>
                  <Form.Text className="text-muted">
                    {translate("Enter Test Duration", currentLanguage)}
                  </Form.Text>
                </Col>
              ) : (
                <></>
              )}
            </Row>

            <Row className="align-items-end">
              <GenerationModeSelection
                {...{
                  currentLanguage,
                  currentTest,
                  handleModeChange,
                  running,
                }}
              />
              <Col className={"col-3 d-flex flex-row align-items-center"}>
                {currentTestMode === TestMode.MULTI && (
                  <>
                    <Form onChange={handleDurationChange}>
                      <Form.Control
                        type="number"
                        min={0}
                        placeholder={translate(
                          "Number of seconds",
                          currentLanguage
                        )}
                        value={currentTest?.duration}
                        required
                      />
                    </Form>
                  </>
                )}
              </Col>
            </Row>

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
          </Tab>
        ))}
      </Tabs>
      <GitHub />
    </Loader>
  );
};

export default ListSettings;
