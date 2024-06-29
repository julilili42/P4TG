import { useEffect, useState } from "react";
import { Button, Col, Row, Tab, Tabs, Form, Table } from "react-bootstrap";
import Settings, { StyledCol } from "../sites/Settings";
import translate from "./translation/Translate";
import { TestMode } from "../common/Interfaces";
import { get } from "../common/API";
import StreamSettingsList from "./settings/StreamSettingsList";

interface Tab {
  eventKey: string;
  title: string;
  content: any;
  duration: number;
  titleEditable: boolean;
}

const TestSettings = () => {
  const [streamsList, setStreamsList] = useState<{ [key: number]: any }>({});
  const [streamSettingsList, setStreamSettingsList] = useState<{
    [key: number]: any;
  }>({});
  const [portTxRxMappingList, setPortTxRxMappingList] = useState<{
    [key: number]: any;
  }>({});
  const [modeList, setModeList] = useState<{ [key: number]: any }>({});

  const [ports, set_ports] = useState<
    {
      pid: number;
      port: number;
      channel: number;
      loopback: string;
      status: boolean;
    }[]
  >([]);

  const loadPorts = async () => {
    let stats = await get({ route: "/ports" });

    if (stats.status === 200) {
      set_ports(stats.data);
    }
  };

  useEffect(() => {
    setStreamsList(JSON.parse(localStorage.getItem("streamsList") || "{}"));
    setStreamSettingsList(
      JSON.parse(localStorage.getItem("streamSettingsList") || "{}")
    );
    setPortTxRxMappingList(
      JSON.parse(localStorage.getItem("port_tx_rx_mapping_list") || "{}")
    );
    setModeList(JSON.parse(localStorage.getItem("gen-mode-list") || "{}"));

    loadPorts();
  }, []);

  const [tabs, setTabs] = useState<Tab[]>([
    {
      eventKey: "home",
      title: "Test 1",
      content: (
        <div style={{ marginTop: "15px" }}>
          <Settings
            onTestChange={(duration) => handleDurationChange(duration, "home")}
            showDuration={true}
            TestNumber={1}
          />
        </div>
      ),
      duration: 0,
      titleEditable: false,
    },
    {
      eventKey: "add",
      title: "+",
      content: "",
      duration: 0,
      titleEditable: false,
    },
  ]);

  const [key, setKey] = useState("home");
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentMode, setCurrentMode] = useState(
    parseInt(localStorage.getItem("test-mode") || String(TestMode.SINGLE))
  );

  useEffect(() => {
    let total = 0;
    tabs.forEach((tab) => {
      total += tab.duration;
    });
    setTotalDuration(total);

    const handleKeyDown = (event: any) => {
      if (event.ctrlKey && event.key === "t") {
        event.preventDefault();
        addTab();
      } else if (event.ctrlKey && event.key === "w") {
        event.preventDefault();
        if (key !== "home") {
          deleteTab(key);
        }
      }
    };

    const handleMouseDown = (event: any) => {
      if (event.button === 1) {
        const tab = tabs.find((tab) => tab.eventKey === key);
        if (tab && key !== "home" && key !== "add") {
          deleteTab(key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [tabs, key]);

  const handleDurationChange = (duration: number, eventKey: string) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.eventKey === eventKey ? { ...tab, duration: duration } : tab
      )
    );
  };

  const handleModeChange = (event: any) => {
    const value = Number(event.target.value);
    localStorage.setItem("test-mode", String(value));
    setCurrentMode(value);
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

  const addTab = () => {
    const newTabKey = `tab-${new Date().getTime()}`;
    const newTabNumber = tabs.length;

    /* const newStreams = streamsList[newTabNumber] || [];
    const newStreamSettings = streamSettingsList[newTabNumber] || [];
    const newPortTxRxMapping = portTxRxMappingList[newTabNumber] || {};
    const running = false; */

    const newTab = {
      eventKey: newTabKey,
      title: `Test ${newTabNumber}`,
      content: (
        <div style={{ marginTop: "15px" }}>
          <Settings
            TestNumber={newTabNumber}
            onTestChange={(duration) =>
              handleDurationChange(duration, newTabKey)
            }
            showDuration={true}
          />

          {/* <Table
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
                {newStreams.map((v: any, i: any) => {
                  return <th key={i}>Stream {v.app_id}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {ports.map((v, i) => {
                if (v.loopback == "BF_LPBK_NONE") {
                  return (
                    <tr key={i}>
                      <StyledCol>
                        {v.port} ({v.pid})
                      </StyledCol>
                      <StyledCol>
                        <Form.Select
                          disabled={running || !v.status}
                          required
                          defaultValue={newPortTxRxMapping[v.pid] || -1}
                          onChange={(event: any) => {
                            let current = { ...newPortTxRxMapping };

                            if (parseInt(event.target.value) == -1) {
                              delete current[v.pid];
                            } else {
                              current[v.pid] = parseInt(event.target.value);
                            }

                            setPortTxRxMappingList((prev) => ({
                              ...prev,
                              [newTabNumber]: current,
                            }));
                          }}
                        >
                          <option value={-1}>
                            {translate("Select RX Port", currentLanguage)}
                          </option>
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
                        stream_settings={newStreamSettings}
                        streams={newStreams}
                        running={running}
                        port={v}
                      />
                    </tr>
                  );
                }
              })}
            </tbody>
          </Table> */}
        </div>
      ),
      duration: 0,
      titleEditable: false,
    };

    const newTabs = [...tabs];
    newTabs.splice(tabs.length - 1, 0, newTab);
    setTabs(newTabs);
    setKey(newTabKey);
  };

  const deleteTab = (eventKey: string) => {
    if (eventKey !== "home") {
      const index = tabs.findIndex((tab) => tab.eventKey === eventKey);
      const newTabs = tabs.filter((tab) => tab.eventKey !== eventKey);
      const tabNumber = index + 1;

      // Update titles
      newTabs.forEach((tab, i) => {
        if (tab.title.startsWith("Test")) {
          tab.title = `Test ${i + 1}`;
        }
      });

      const updateLocalStorage = (key: string, number: number) => {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        delete data[number];

        // Rebuild the object with updated keys
        const updatedData: any = {};
        let newIndex = 1;
        Object.keys(data).forEach((key) => {
          if (parseInt(key) !== number) {
            updatedData[newIndex] = data[key];
            newIndex++;
          }
        });

        localStorage.setItem(key, JSON.stringify(updatedData));
      };

      updateLocalStorage("streamsList", tabNumber);
      updateLocalStorage("streamSettingsList", tabNumber);
      updateLocalStorage("port_tx_rx_mapping_list", tabNumber);
      updateLocalStorage("gen-mode-list", tabNumber);

      setStreamsList((prev) => {
        const newStreamsList = { ...prev };
        delete newStreamsList[tabNumber];
        const updatedStreamsList: any = {};
        let newIndex = 1;
        Object.keys(newStreamsList).forEach((key: any) => {
          if (parseInt(key) !== tabNumber) {
            updatedStreamsList[newIndex] = newStreamsList[key];
            newIndex++;
          }
        });
        return updatedStreamsList;
      });

      setStreamSettingsList((prev) => {
        const newStreamSettingsList = { ...prev };
        delete newStreamSettingsList[tabNumber];
        const updatedStreamSettingsList: any = {};
        let newIndex = 1;
        Object.keys(newStreamSettingsList).forEach((key: any) => {
          if (parseInt(key) !== tabNumber) {
            updatedStreamSettingsList[newIndex] = newStreamSettingsList[key];
            newIndex++;
          }
        });
        return updatedStreamSettingsList;
      });

      setPortTxRxMappingList((prev) => {
        const newPortTxRxMappingList = { ...prev };
        delete newPortTxRxMappingList[tabNumber];
        const updatedPortTxRxMappingList: any = {};
        let newIndex = 1;
        Object.keys(newPortTxRxMappingList).forEach((key: any) => {
          if (parseInt(key) !== tabNumber) {
            updatedPortTxRxMappingList[newIndex] = newPortTxRxMappingList[key];
            newIndex++;
          }
        });
        return updatedPortTxRxMappingList;
      });

      setModeList((prev) => {
        const newModeList = { ...prev };
        delete newModeList[tabNumber];
        const updatedModeList: any = {};
        let newIndex = 1;
        Object.keys(newModeList).forEach((key: any) => {
          if (parseInt(key) !== tabNumber) {
            updatedModeList[newIndex] = newModeList[key];
            newIndex++;
          }
        });
        return updatedModeList;
      });

      setTabs(newTabs);

      if (eventKey === key && newTabs.length >= 2) {
        const newIndex = index < newTabs.length - 1 ? index : index - 1;
        setKey(newTabs[newIndex].eventKey);
      }
    }
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
      <Row
        className="align-items-end justify-content-between"
        style={{ marginBottom: "30px" }}
      >
        <Col className={"col-2"}>
          <Form.Text className="text-muted">
            {translate("Test mode", currentLanguage)}
          </Form.Text>
          <Form.Select value={currentMode} onChange={handleModeChange}>
            <option value={0}>Standard</option>
            <option value={1}>Automatic tests</option>
          </Form.Select>
        </Col>
        {currentMode === 1 ? (
          <Col
            className={"col-3"}
            style={{ display: "flex", justifyContent: "right" }}
          >
            <Button variant="secondary" disabled={true}>
              <i className="bi bi-clock-history" />{" "}
              {translate("Total Duration", currentLanguage)}: {totalDuration}{" "}
              {translate("seconds", currentLanguage)}
            </Button>
          </Col>
        ) : (
          <></>
        )}
      </Row>
      {currentMode === 1 ? (
        <Tabs
          onSelect={(k: string | null) => {
            if (k === "add") {
              addTab();
            } else if (k) {
              setKey(k);
            }
          }}
          activeKey={key}
        >
          {tabs.map((tab) => (
            <Tab
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
                        {tab.duration === 0 ? (
                          <div>
                            <i className="bi bi-exclamation-triangle"></i>{" "}
                            {tab.title}{" "}
                          </div>
                        ) : (
                          tab.title
                        )}
                      </span>
                    )}

                    {tab.eventKey !== "home" ? (
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
                ) : // prettier-ignore
                tab.duration === 0 && tab.eventKey !== "add" ? (<div><i className="bi bi-exclamation-triangle"></i> {tab.title} </div>) : (tab.title)
              }
            >
              {tab.content}
            </Tab>
          ))}
        </Tabs>
      ) : (
        <Settings showDuration={false} />
      )}
    </>
  );
};

export default TestSettings;
