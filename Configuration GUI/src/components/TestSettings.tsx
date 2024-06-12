import { useEffect, useState } from "react";
import { Button, Col, Row, Tab, Tabs, Form } from "react-bootstrap";
import Settings from "../sites/Settings";
import translate from "./translation/Translate";

interface Tab {
  eventKey: string;
  title: string;
  content: any;
  duration: number;
  titleEditable: boolean;
}

const TestSettings = () => {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      eventKey: "home",
      title: "Test 1",
      content: (
        <div style={{ marginTop: "15px" }}>
          <Settings
            onTestChange={(duration) => handleDurationChange(duration, "home")}
            showDuration={true}
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
  const [currentMode, setCurrentMode] = useState(0);

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
    const newTab = {
      eventKey: newTabKey,
      title: `Test ${tabs.length}`,
      content: (
        <div style={{ marginTop: "15px" }}>
          <Settings
            onTestChange={(duration) =>
              handleDurationChange(duration, newTabKey)
            }
            showDuration={true}
          />
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

      newTabs.forEach((tab, i) => {
        if (tab.title.startsWith("Test")) {
          tab.title = `Test ${i + 1}`;
        }
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
