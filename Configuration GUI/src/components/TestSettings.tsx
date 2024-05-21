import { useEffect, useState } from "react";
import { Button, Tab, Tabs } from "react-bootstrap";
import Settings from "../sites/Settings";
import Form from "react-bootstrap/Form";

const TestSettings = () => {
  const [key, setKey] = useState("home");
  const [totalDuration, setTotalDuration] = useState(0);

  const DurationInput = () => {
    const [duration, setDuration] = useState(0);

    const handleSubmit = (e: any) => {
      e.preventDefault();
      setTotalDuration((prevTotal) => prevTotal + duration);
    };

    return (
      <>
        <Form
          onSubmit={handleSubmit}
          style={{ width: "15%", position: "absolute", left: "850px" }}
        >
          <Form.Group className="mb-3" controlId="numberInput">
            <Form.Label>Enter test duration</Form.Label>
            <Form.Control
              type="number"
              min={0}
              placeholder="Number of seconds"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </Form.Group>
        </Form>
        <Settings />
      </>
    );
  };

  const [tabs, setTabs] = useState([
    {
      eventKey: "home",
      title: "Test 1",
      content: <DurationInput />,
      titleEditable: false,
    },
    { eventKey: "add", title: "+", content: "", titleEditable: false },
  ]);

  const addTab = () => {
    const newTabKey = `tab-${new Date().getTime()}`;
    const newTab = {
      eventKey: newTabKey,
      title: `Test ${tabs.length}`,
      content: <DurationInput />,
      titleEditable: false,
    };
    const newTabs = [...tabs];
    newTabs.splice(tabs.length - 1, 0, newTab);
    setTabs(newTabs);
    setKey(newTabKey);
  };

  const deleteTab = (eventKey: string) => {
    const index = tabs.findIndex((tab) => tab.eventKey === eventKey);
    const newTabs = tabs.filter((tab) => tab.eventKey !== eventKey);

    // Update the tab titles to follow the default naming convention
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, tabs]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "start",
          marginBottom: "20px",
        }}
      >
        <div>
          <Button variant="secondary" disabled={true}>
            <i className="bi bi-clock-history" /> Total Duration:{" "}
            {totalDuration} seconds
          </Button>
        </div>
      </div>
      <div>
        <Tabs
          className="mb-3"
          activeKey={key}
          onSelect={(k: string | null) => {
            if (k === "add") {
              addTab();
            } else if (k !== null) {
              setKey(k);
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              eventKey={tab.eventKey}
              title={
                tab.eventKey !== "add" ? (
                  <div className="d-flex align-items-center">
                    {tab.eventKey !== "home" && (
                      <button
                        className="outline-none border-0 bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTab(tab.eventKey);
                        }}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    )}
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
                          color: "black",
                        }} // why is it not black???
                      >
                        {tab.title}
                      </span>
                    )}
                  </div>
                ) : (
                  tab.title
                )
              }
              key={tab.eventKey}
            >
              {tab.content}
            </Tab>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default TestSettings;
