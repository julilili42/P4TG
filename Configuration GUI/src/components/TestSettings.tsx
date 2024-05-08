import { useEffect, useState } from "react";
import { Tab, Tabs } from "react-bootstrap";
import Settings from "../sites/Settings";

const TestSettings = () => {
  const [key, setKey] = useState("home");
  const [tabs, setTabs] = useState([
    { eventKey: "home", title: "Test 1", content: <Settings /> },
    { eventKey: "add", title: "+", content: "" },
  ]);

  const addTab = () => {
    const newTabKey = `tab-${new Date().getTime()}`;
    const newTab = {
      eventKey: newTabKey,
      title: `Test ${tabs.length}`,
      content: <Settings />,
    };
    const newTabs = [...tabs];
    newTabs.splice(tabs.length - 1, 0, newTab);
    setTabs(newTabs);
    setKey(newTabKey);
  };

  const deleteTab = (eventKey: string) => {
    const index = tabs.findIndex((tab) => tab.eventKey === eventKey);
    const newTabs = tabs.filter((tab) => tab.eventKey !== eventKey);
    newTabs.map((tab, index) => {
      tab.title !== "+" ? (tab.title = `Test ${index + 1}`) : (tab.title = "+");
    });
    setTabs(newTabs);
    if (eventKey === key && newTabs.length >= 2) {
      const newIndex = index < newTabs.length - 1 ? index : index - 1;
      setKey(newTabs[newIndex].eventKey);
    }
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
    <Tabs
      id="uncontrolled-tab-example"
      className="mb-3"
      activeKey={key}
      onSelect={(k) => {
        if (k === "add") {
          addTab();
        } else {
          // @ts-ignore
          setKey(k);
        }
      }}
    >
      {tabs.map((tab, index) => (
        <Tab
          eventKey={tab.eventKey}
          title={
            tab.eventKey !== "add" ? (
              <div className="">
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
                {tab.title}
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
  );
};

export default TestSettings;
