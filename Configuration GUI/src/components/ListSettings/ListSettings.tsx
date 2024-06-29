import { useEffect, useRef, useState } from "react";
import { Button, Col, Form, Row, Tab, Table, Tabs } from "react-bootstrap";
import { get } from "../../common/API";
import {
  GenerationMode,
  StreamSettings,
  Stream,
  DefaultStream,
  DefaultStreamSettings,
  TestMode,
} from "../../common/Interfaces";
import { StyledCol } from "../../sites/Settings";
import StreamSettingsList from "../settings/StreamSettingsList";
import StreamElement from "../settings/StreamElement";
import Loader from "../Loader";
import { GitHub } from "../../sites/Home";
import translate from "../translation/Translate";
import InfoBox from "../InfoBox";
import { GenerationModeSelection, TestModeSelection } from "./ModeSelection";
import TotalDuration from "./TotalDuration";
import SaveResetButtons from "./Buttons";

interface Tab {
  eventKey: string;
  title: string;
  titleEditable: boolean;
}

const ListTestSettings = () => {
  // List States
  // prettier-ignore
  // @ts-ignore
  const [streamsList, set_streamsList] = useState<{ [key: number]: Stream[] }>(JSON.parse(localStorage.getItem("streamsList")) || {});

  // prettier-ignore
  // @ts-ignore
  const [streamSettingsList, set_streamSettingsList] = useState<{[key: number]: StreamSettings[];}>(JSON.parse(localStorage.getItem("streamSettingsList")) || {});

  // prettier-ignore
  // @ts-ignore
  const [portTxRxMappingList, set_portTxRxMappingList] = useState<{[key: number]: any;}>(JSON.parse(localStorage.getItem("port_tx_rx_mapping_list")) || {});

  // prettier-ignore
  // @ts-ignore
  const [modeList, set_modeList] = useState<{ [key: number]: number }>(JSON.parse(localStorage.getItem("gen-mode-list")) || {});

  // prettier-ignore
  // @ts-ignore
  const [durationList, set_durationList] = useState<{ [key: number]: number }>(JSON.parse(localStorage.getItem("duration-list")) || {});
  //

  const [currentTestMode, setCurrentTestMode] = useState(
    parseInt(localStorage.getItem("test-mode") || String(TestMode.SINGLE))
  );

  const [currentLanguage, setCurrentLanguage] = useState(
    localStorage.getItem("language") || "en-US"
  );

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [key, setKey] = useState<string>("");

  const [ports, set_ports] = useState<
    {
      pid: number;
      port: number;
      channel: number;
      loopback: string;
      status: boolean;
    }[]
  >([]);

  // is normally false, see Settings.tsx!
  const [loaded, set_loaded] = useState(true);

  const [running, set_running] = useState(false);
  const ref = useRef();

  /// Needs to be changed to number
  /// Hashmap is able to access numeric string keys as numbers
  const [currentTabIndex, setCurrentTabIndex] = useState<string | null>(null);

  // Settings of currently selected tab
  const [portTxRxMappingCurrentTab, setPortTxRxMappingCurrentTab] = useState<{
    [pid: string]: number;
  }>({});
  const [streamSettingCurrentTab, setStreamSettingCurrentTab] = useState<
    StreamSettings[]
  >([]);
  const [streamCurrentTab, setStreamCurrentTab] = useState<Stream[]>([]);

  const [modeCurrentTab, setModeCurrentTab] = useState<GenerationMode>(
    GenerationMode.CBR
  );

  const [durationCurrentTab, setDurationCurrentTab] = useState<number>(0);

  const [totalDuration, setTotalDuration] = useState<number>(0);

  const loadPorts = async () => {
    let stats = await get({ route: "/ports" });

    if (stats.status === 200) {
      set_ports(stats.data);
    }
  };

  // Should synchronize (overwrite) current settings (local Storage) if a test on another system is running
  const loadGen = async () => {
    let stats = await get({ route: "/trafficgen" });
    // check if test is running
    if (Object.keys(stats.data).length > 1) {
      if (stats.data.all_test) {
        console.log("multi_test");
        localStorage.setItem("test-mode", String(1));
        setCurrentTestMode(TestMode.MULTI);

        let newStreamsList: { [key: string]: Stream[] } = {};
        let newStreamSettingsList: { [key: string]: StreamSettings[] } = {};
        let newPortTxRxMappingList: {
          [key: string]: { [pid: string]: number };
        } = {};
        let newModeList: { [key: string]: number } = {};

        for (let key in stats.data.all_test) {
          const test = stats.data.all_test[key];
          newStreamsList[key] = test.streams;
          newStreamSettingsList[key] = test.stream_settings;
          newPortTxRxMappingList[key] = test.port_tx_rx_mapping;
          newModeList[key] = test.mode;
        }

        localStorage.setItem("streamsList", JSON.stringify(newStreamsList));
        set_streamsList(newStreamsList);

        localStorage.setItem(
          "streamSettingsList",
          JSON.stringify(newStreamSettingsList)
        );
        set_streamSettingsList(newStreamSettingsList);

        localStorage.setItem(
          "port_tx_rx_mapping_list",
          JSON.stringify(newPortTxRxMappingList)
        );
        set_portTxRxMappingList(newPortTxRxMappingList);

        localStorage.setItem("gen-mode-list", JSON.stringify(newModeList));
        set_modeList(newModeList);
      } else {
        console.log("single_test");
        localStorage.setItem("test-mode", String(0));
        setCurrentTestMode(TestMode.SINGLE);
      }
      set_running(false);

      // initializeTabs() muss hier vermutlich aufgerufen werden, nach dem überschreiben des localStorage muss nochmal initialisiert werden
      /* initializeTabs(); */
    }
  };

  const refresh = async () => {
    set_loaded(false);
    await loadPorts();
    await loadGen();
    //initializeTabs();
    set_loaded(true);
  };

  useEffect(() => {
    loadPorts();
    initializeTabs();
  }, [currentTestMode]);

  useEffect(() => {
    refresh();

    const interval = setInterval(loadGen, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const saveToLocalStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const initializeTabs = () => {
    if (currentTestMode === TestMode.MULTI) {
      const initializedTabs: Tab[] = Object.keys(streamsList).map((key) => ({
        eventKey: `tab-${key}`,
        title: `Test ${key}`,
        titleEditable: false,
      }));
      initializedTabs.push({
        eventKey: "add",
        title: "+",
        titleEditable: false,
      });
      setTabs(initializedTabs);

      // What should happen if there are no tabs/tests?
      if (initializedTabs.length > 0) {
        setKey(initializedTabs[0].eventKey);
        setCurrentTabIndex(Object.keys(streamsList)[0]);
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
    }
  };

  const deleteLocalStorageEntry = (key: string) => {
    const updateLocalStorage = (storageKey: string, entryKey: string) => {
      const data = JSON.parse(localStorage.getItem(storageKey) || "{}");
      delete data[entryKey];

      const updatedData: any = {};
      let newIndex = 1;
      Object.keys(data).forEach((k) => {
        if (k !== entryKey) {
          updatedData[newIndex] = data[k];
          newIndex++;
        }
      });

      localStorage.setItem(storageKey, JSON.stringify(updatedData));
    };

    updateLocalStorage("streamsList", key);
    updateLocalStorage("streamSettingsList", key);
    updateLocalStorage("port_tx_rx_mapping_list", key);
    updateLocalStorage("gen-mode-list", key);
    updateLocalStorage("duration-list", key);
  };

  const deleteStatesEntry = (key: string) => {
    const tabNumber = parseInt(key, 10);

    const updatedStreamsList = { ...streamsList };
    const updatedStreamSettingsList = { ...streamSettingsList };
    const updatedPortTxRxMappingList = { ...portTxRxMappingList };
    const updatedModeList = { ...modeList };
    const updatedDurationList = { ...durationList };

    delete updatedStreamsList[tabNumber];
    delete updatedStreamSettingsList[tabNumber];
    delete updatedPortTxRxMappingList[tabNumber];
    delete updatedModeList[tabNumber];
    delete updatedDurationList[tabNumber];

    set_streamsList(updatedStreamsList);
    set_streamSettingsList(updatedStreamSettingsList);
    set_portTxRxMappingList(updatedPortTxRxMappingList);
    set_modeList(updatedModeList);
    set_durationList(updatedDurationList);
  };

  const deleteTab = (eventKey: string) => {
    const index = tabs.findIndex((tab) => tab.eventKey === eventKey);
    const tabNumber = index + 1;

    deleteLocalStorageEntry(tabNumber.toString());
    deleteStatesEntry(tabNumber.toString());

    const newTabs = tabs.filter((tab) => tab.eventKey !== eventKey);

    newTabs.forEach((tab, i) => {
      if (tab.title.startsWith("Test")) {
        tab.title = `Test ${i + 1}`;
      }
    });

    setTabs(newTabs);

    if (eventKey === key && newTabs.length >= 2) {
      const newIndex = index < newTabs.length - 1 ? index : index - 1;
      setKey(newTabs[newIndex].eventKey);
      setCurrentTabIndex(newTabs[newIndex].eventKey.split("-")[1]);
    }
  };

  const addTab = () => {
    const newTabNumber = tabs.length;
    const newTabKey = `tab-${newTabNumber}`;

    const initialStream = DefaultStream(1);
    const initialStreamSettings = ports
      .filter((v) => v.loopback === "BF_LPBK_NONE")
      .map((v) => {
        const settings = DefaultStreamSettings(1, v.pid);
        return settings;
      });

    const updatedStreamsList = {
      ...streamsList,
      [newTabNumber]: [initialStream],
    };
    const updatedStreamSettingsList = {
      ...streamSettingsList,
      [newTabNumber]: initialStreamSettings,
    };
    const updatedPortTxRxMappingList = {
      ...portTxRxMappingList,
      [newTabNumber]: {},
    };
    const updatedModeList = {
      ...modeList,
      [newTabNumber]: GenerationMode.CBR,
    };
    const updatedDurationList = {
      ...durationList,
      [newTabNumber]: 0,
    };

    saveToLocalStorage("streamsList", updatedStreamsList);
    saveToLocalStorage("streamSettingsList", updatedStreamSettingsList);
    saveToLocalStorage("port_tx_rx_mapping_list", updatedPortTxRxMappingList);
    saveToLocalStorage("gen-mode-list", updatedModeList);
    saveToLocalStorage("duration-list", updatedDurationList);

    set_streamsList(updatedStreamsList);
    set_streamSettingsList(updatedStreamSettingsList);
    set_portTxRxMappingList(updatedPortTxRxMappingList);
    set_modeList(updatedModeList);
    set_durationList(updatedDurationList);

    // Erstellen und hinzufügen eines neuen Tabs
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
  };

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

  useEffect(() => {
    if (currentTabIndex) {
      setPortTxRxMappingCurrentTab(portTxRxMappingList[currentTabIndex as any]);
      setStreamSettingCurrentTab(streamSettingsList[currentTabIndex as any]);
      setStreamCurrentTab(streamsList[currentTabIndex as any]);
      setModeCurrentTab(modeList[currentTabIndex as any] || GenerationMode.CBR);
      setDurationCurrentTab(durationList[currentTabIndex as any] || 0);
      handleTotalDurationChange(durationList);
      loadPorts();
    }
  }, [
    currentTabIndex,
    portTxRxMappingList,
    streamSettingsList,
    streamsList,
    modeList,
    durationList,
  ]);

  const removeStream = (id: number) => {
    const updatedStreams = streamCurrentTab.filter((v) => v.stream_id !== id);
    const updatedStreamSettings = streamSettingCurrentTab.filter(
      (v) => v.stream_id !== id
    );

    updateStreamCurrentTab(updatedStreams);
    updateStreamSettingCurrentTab(updatedStreamSettings);
  };

  const save = () => {
    if (currentTabIndex) {
      saveToLocalStorage("streamsList", {
        ...streamsList,
        [currentTabIndex]: streamCurrentTab,
      });
      saveToLocalStorage("streamSettingsList", {
        ...streamSettingsList,
        [currentTabIndex]: streamSettingCurrentTab,
      });
      saveToLocalStorage("port_tx_rx_mapping_list", {
        ...portTxRxMappingList,
        [currentTabIndex]: portTxRxMappingCurrentTab,
      });
      saveToLocalStorage("gen-mode-list", {
        ...modeList,
        [currentTabIndex]: modeCurrentTab,
      });
      saveToLocalStorage("duration-list", {
        ...durationList,
        [currentTabIndex]: durationCurrentTab,
      });

      alert("Settings saved.");
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
      const updatedStreamsList = {
        ...streamsList,
        [currentTabIndex]: [initialStream],
      };
      const updatedStreamSettingsList = {
        ...streamSettingsList,
        [currentTabIndex]: initialStreamSettings,
      };
      const updatedPortTxRxMappingList = {
        ...portTxRxMappingList,
        [currentTabIndex]: {},
      };
      const updatedModeList = {
        ...modeList,
        [currentTabIndex]: GenerationMode.CBR,
      };
      const updatedDurationList = {
        ...durationList,
        [currentTabIndex]: 0,
      };

      saveToLocalStorage("streamsList", updatedStreamsList);
      saveToLocalStorage("streamSettingsList", updatedStreamSettingsList);
      saveToLocalStorage("port_tx_rx_mapping_list", updatedPortTxRxMappingList);
      saveToLocalStorage("gen-mode-list", updatedModeList);
      saveToLocalStorage("duration-list", updatedDurationList);

      set_streamsList(updatedStreamsList);
      set_streamSettingsList(updatedStreamSettingsList);
      set_portTxRxMappingList(updatedPortTxRxMappingList);
      set_modeList(updatedModeList);
      set_durationList(updatedDurationList);

      alert("Reset complete.");
    } else {
      alert("No test selected.");
    }
  };

  const updateStreamCurrentTab = (newStreams: Stream[]) => {
    const updatedStreams = {
      ...streamsList,
      [currentTabIndex as any]: newStreams,
    };
    set_streamsList(updatedStreams);
    setStreamCurrentTab(newStreams);
  };

  const updateStreamSettingCurrentTab = (
    newStreamSettings: StreamSettings[]
  ) => {
    const updatedStreamSettings = {
      ...streamSettingsList,
      [currentTabIndex as any]: newStreamSettings,
    };
    set_streamSettingsList(updatedStreamSettings);
    setStreamSettingCurrentTab(newStreamSettings);
  };

  const updatePortTxRxMappingCurrentTab = (newMapping: {
    [pid: string]: number;
  }) => {
    const updatedMapping = {
      ...portTxRxMappingList,
      [currentTabIndex as any]: newMapping,
    };
    set_portTxRxMappingList(updatedMapping);
    setPortTxRxMappingCurrentTab(newMapping);
  };

  const handlePortChange = (event: any, pid: number) => {
    let current = {
      ...portTxRxMappingCurrentTab,
    };

    if (parseInt(event.target.value) === -1) {
      delete current[pid];
    } else {
      current[pid] = parseInt(event.target.value);
    }

    updatePortTxRxMappingCurrentTab(current);
  };

  const addStream = () => {
    if (streamCurrentTab.length > 6) {
      alert("Only 7 different streams allowed.");
    } else {
      let id = 0;

      if (streamCurrentTab.length > 0) {
        id = Math.max(...streamCurrentTab.map((s) => s.stream_id));
      }

      const newStream = DefaultStream(id + 1);
      const newStreamSettings = ports
        .filter((v) => v.loopback === "BF_LPBK_NONE")
        .map((v) => DefaultStreamSettings(id + 1, v.pid));

      const updatedStreams = [...streamCurrentTab, newStream];
      const updatedStreamSettings = [
        ...streamSettingCurrentTab,
        ...newStreamSettings,
      ];

      updateStreamCurrentTab(updatedStreams);
      updateStreamSettingCurrentTab(updatedStreamSettings);
    }
  };

  const handleModeChange = (event: any) => {
    const newMode = parseInt(event.target.value);
    setModeCurrentTab(newMode);

    if (currentTabIndex) {
      const updatedModeList = {
        ...modeList,
        [currentTabIndex]: newMode,
      };
      set_modeList(updatedModeList);
    }
  };

  const handleDurationChange = (event: any) => {
    const newDuration = isNaN(parseInt(event.target.value))
      ? 0
      : parseInt(event.target.value);

    setDurationCurrentTab(newDuration);

    if (currentTabIndex) {
      const updatedDurationList = {
        ...durationList,
        [currentTabIndex]: newDuration,
      };
      set_durationList(updatedDurationList);
    }

    console.log(durationList);
  };
  const handleTestModeChange = (event: any) => {
    const value = Number(event.target.value);
    localStorage.setItem("test-mode", String(value));
    /* saveToLocalStorage("test-mode", value); */
    setCurrentTestMode(value);
  };
  const handleTotalDurationChange = (durations: { [key: string]: number }) => {
    let total = 0;
    Object.keys(durations).forEach((key) => {
      total += durations[key];
    });
    setTotalDuration(total);
  };
  const isEmptyObject = (obj: any) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  };

  const isTabValid = (
    index: number,
    currentTestMode: TestMode,
    durationList: { [key: number]: number },
    portTxRxMappingList: { [key: number]: any }
  ) => {
    if (currentTestMode === TestMode.MULTI) {
      return (
        durationList[index] !== 0 && !isEmptyObject(portTxRxMappingList[index])
      );
    } else {
      return !isEmptyObject(portTxRxMappingList[index]);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const storedLanguage = localStorage.getItem("language") || "en-US";
      if (storedLanguage != currentLanguage) {
        setCurrentLanguage(storedLanguage);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [currentLanguage]);

  console.log(currentTestMode);

  return (
    <Loader loaded={loaded}>
      <Row className="align-items-end justify-content-between">
        {/* Test mode selection */}
        <TestModeSelection
          currentLanguage={currentLanguage}
          currentTestMode={currentTestMode}
          handleTestModeChange={handleTestModeChange}
        />
        {/* Total Duration */}
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
                        durationList,
                        portTxRxMappingList
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
              {/* Generation Mode Selection */}
              <GenerationModeSelection
                currentLanguage={currentLanguage}
                modeCurrentTab={modeCurrentTab}
                handleModeChange={handleModeChange}
                running={running}
                currentTestMode={currentTestMode}
              />
              <Col className={"col-3 d-flex flex-row align-items-center"}>
                {currentTestMode === TestMode.MULTI ? (
                  <>
                    <Form className="me-3" onChange={handleDurationChange}>
                      <Form.Control
                        type="number"
                        min={0}
                        placeholder={translate(
                          "Number of seconds",
                          currentLanguage
                        )}
                        value={durationCurrentTab}
                        required
                      />
                    </Form>
                    <InfoBox>
                      <>
                        <p>
                          {translate(
                            "P4TG supports multiple modes.",
                            currentLanguage
                          )}
                        </p>

                        <h5>
                          {translate("Constant bit rate", currentLanguage)}{" "}
                          (CBR)
                        </h5>

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
                  </>
                ) : (
                  <></>
                )}
              </Col>
            </Row>

            {/* Streams Element */}

            {modeCurrentTab != GenerationMode.ANALYZE ? (
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
                        <th>Stream-ID</th>
                        <th>Frame Size</th>
                        <th>Rate</th>
                        <th>Mode</th>
                        <th>VxLAN &nbsp;</th>
                        <th>Encapsulation &nbsp;</th>
                        <th>Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streamCurrentTab.map((v, i) => {
                        v.app_id = i + 1;
                        return (
                          <StreamElement
                            key={i}
                            mode={modeCurrentTab}
                            data={v}
                            remove={removeStream}
                            running={running}
                            stream_settings={streamSettingCurrentTab}
                          />
                        );
                      })}
                    </tbody>
                  </Table>
                </Col>
              </Row>
            ) : null}

            {/* Add stream */}

            <Row className={"mb-3"}>
              <Col className={"text-start"}>
                {running ? null : modeCurrentTab === GenerationMode.CBR ||
                  modeCurrentTab == GenerationMode.MPPS ? (
                  <Button onClick={addStream} variant="primary">
                    <i className="bi bi-plus" /> Add stream
                  </Button>
                ) : null}
              </Col>
            </Row>

            {/* Stream settings element */}

            {/* modeCurrentTab anstatt modeList[currentTabIndex as any]*/}
            {/* (streamCurrentTab && streamCurrentTab.length > 0) entfernen? 
              Tritt auf falls ich alle Tabs lösche 
            */}
            {(streamCurrentTab && streamCurrentTab.length > 0) ||
            modeCurrentTab == GenerationMode.ANALYZE ? (
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
                        <th>TX Port</th>
                        <th>RX Port</th>
                        {streamCurrentTab &&
                          streamCurrentTab.map((v: any, i: any) => {
                            return <th key={i}>Stream {v.app_id}</th>;
                          })}
                      </tr>
                    </thead>
                    <tbody>
                      {ports.map((v, i) => {
                        if (v.loopback == "BF_LPBK_NONE") {
                          const selectValue =
                            portTxRxMappingCurrentTab[v.pid.toString()] || -1;
                          return (
                            <tr key={i}>
                              <StyledCol>
                                {v.port} ({v.pid})
                              </StyledCol>
                              <StyledCol>
                                <Form.Select
                                  disabled={running || !v.status}
                                  required
                                  value={selectValue}
                                  onChange={(event: any) =>
                                    handlePortChange(event, v.pid)
                                  }
                                >
                                  <option value={-1}>Select RX Port</option>
                                  {ports.map((v, i) => {
                                    if (v.loopback == "BF_LPBK_NONE") {
                                      return (
                                        <option key={i} value={v.pid}>
                                          {v.port} ({v.pid})
                                        </option>
                                      );
                                    }
                                  })}
                                </Form.Select>
                              </StyledCol>

                              <StreamSettingsList
                                stream_settings={streamSettingCurrentTab}
                                streams={streamCurrentTab}
                                running={running}
                                port={v}
                              />
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </Table>
                </Col>
              </Row>
            ) : null}

            <SaveResetButtons onSave={save} onReset={reset} running={running} />
          </Tab>
        ))}
      </Tabs>
      <GitHub />
    </Loader>
  );
};

export default ListTestSettings;
