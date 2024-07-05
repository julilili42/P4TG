import styled from "styled-components";
import Accordion from "react-bootstrap/Accordion";
import { Button } from "react-bootstrap";
import { useEffect, useState } from "react";
import { get } from "../../common/API";

const Profiles = () => {
  const [profiles, set_profiles] = useState([]);

  const loadProfiles = async () => {
    let profiles = await get({ route: "/profiles" });

    if (profiles != undefined && profiles.status === 200) {
      set_profiles(profiles.data);
    }
  };

  useEffect(() => {
    loadProfiles();
  });

  const saveProfile = (profileName: string) => {
    if (profileName === "RFC 2544") {
      localStorage.setItem("traffic_gen", JSON.stringify(profiles));
      localStorage.setItem("test-mode", String(3));

      alert(`${profileName} settings have been saved.`);
    } else if (profileName === "IMIX") {
    }
  };

  return (
    <>
      <Accordion defaultActiveKey="0">
        <Accordion.Item eventKey="0">
          <Accordion.Header>RFC 2544</Accordion.Header>
          <Accordion.Body>
            <div style={{ marginBottom: "10px" }}>
              RFC 2544 is a benchmarking methodology used to evaluate the
              performance of network devices. This profile includes tests for
              throughput, latency, frame loss, and back-to-back frames. The goal
              is to ensure the network device can handle data traffic
              efficiently and reliably. By selecting this profile, you initiate
              a series of tests that measure the network’s capacity and
              performance under various conditions, helping you identify
              potential bottlenecks and optimize network performance. Click
              'Save' to apply the RFC 2544 test profile and start evaluating
              your network's capabilities.
            </div>
            <Button variant="primary" onClick={() => saveProfile("RFC 2544")}>
              <i className="bi bi-check" /> Save
            </Button>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="1">
          <Accordion.Header>IMIX</Accordion.Header>
          <Accordion.Body>
            <div style={{ marginBottom: "10px" }}>
              IMIX, or Internet Mix, simulates real-world internet traffic
              patterns by using a mix of packet sizes. This profile is crucial
              for testing how network devices handle diverse types of traffic,
              which can vary significantly in size and frequency. By running the
              IMIX profile, you can assess the network's performance in handling
              typical internet traffic, ensuring it can manage both large data
              transfers and smaller, more frequent packets efficiently. This
              helps in understanding the device’s behavior under realistic
              conditions, providing insights for improvements. Select 'Save' to
              activate the IMIX profile and simulate real-world network traffic.
            </div>
            <Button variant="primary">
              <i className="bi bi-check" /> Save
            </Button>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </>
  );
};

export default Profiles;
