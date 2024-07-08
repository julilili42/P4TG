import React, { useState, useEffect } from "react";
import { Col, Row } from "react-bootstrap";

const ThemeBtn = () => {
  const [theme, setTheme] = useState(() => {
    let storedTheme = localStorage.getItem("theme");
    if (!storedTheme) {
      localStorage.setItem("theme", "light");
      storedTheme = "light";
    }
    return storedTheme;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <Row className="mb-3">
      <Col className="text-center col-12 mt-1">
        <i
          className={
            theme === "light" ? "bi bi-moon-fill" : "bi bi-brightness-high-fill"
          }
          style={{
            color: theme === "dark" ? "white" : "black",
            fontSize: "1.3rem",
            fontWeight: "bold",
          }}
          onClick={toggleTheme}
        ></i>
      </Col>
    </Row>
  );
};

export default ThemeBtn;
