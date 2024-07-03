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
  return (
    <>
      <Accordion defaultActiveKey="0">
        <Accordion.Item eventKey="0">
          <Accordion.Header>RFC 2544</Accordion.Header>
          <Accordion.Body>
            <div style={{ marginBottom: "10px" }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident,
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </div>
            <Button variant="primary">
              <i className="bi bi-check" /> Save
            </Button>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="1">
          <Accordion.Header>IMIX</Accordion.Header>
          <Accordion.Body>
            <div style={{ marginBottom: "10px" }}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
              enim ad minim veniam, quis nostrud exercitation ullamco laboris
              nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
              reprehenderit in voluptate velit esse cillum dolore eu fugiat
              nulla pariatur. Excepteur sint occaecat cupidatat non proident,
              sunt in culpa qui officia deserunt mollit anim id est laborum.
            </div>
            <Button variant="primary">
              <i className="bi bi-check" /> Save
            </Button>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      <>{JSON.stringify(profiles)}</>
    </>
  );
};

export default Profiles;
