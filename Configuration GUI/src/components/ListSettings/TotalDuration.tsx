import React from "react";
import { Col, Button } from "react-bootstrap";
import translate from "../translation/Translate";

const TotalDuration = ({ currentLanguage, totalDuration }: any) => (
  <Col className={"col-3"} style={{ display: "flex", justifyContent: "right" }}>
    <Button variant="secondary" disabled={true}>
      <i className="bi bi-clock-history" />
      {translate("Total Duration", currentLanguage)}: {totalDuration}{" "}
      {translate("seconds", currentLanguage)}
    </Button>
  </Col>
);

export default TotalDuration;
