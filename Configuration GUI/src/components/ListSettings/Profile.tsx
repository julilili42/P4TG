import { useEffect, useState } from "react";
import { get } from "../../common/API";
import {
  TrafficGenData,
  DefaultStream,
  DefaultStreamSettings,
} from "../../common/Interfaces";
import StreamTable from "./StreamTable";
import { AddStreamButton, SaveResetButtons } from "./Utils";
import PortMappingTable from "./PortMappingTable";
import {
  ButtonGroup,
  Col,
  Dropdown,
  DropdownButton,
  Row,
  Form,
} from "react-bootstrap";
import InfoBox from "../InfoBox";

const Profiles = () => {
  const [profiles, set_profiles] = useState<{ [key: string]: TrafficGenData }>(
    {}
  );
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
  const [selected_profile, set_selected_profile] = useState<string>("RFC 2544");
  const [duration, set_duration] = useState<number>(0);

  const loadProfiles = async () => {
    try {
      let profiles = await get({ route: "/profiles" });

      if (profiles && profiles.status === 200) {
        set_profiles(profiles.data);
        if (profiles.data[selected_profile]) {
          set_duration(profiles.data[selected_profile].duration ?? 0);
        }
      } else {
        console.error("Failed to load profiles:", profiles);
      }
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadPorts = async () => {
    try {
      let stats = await get({ route: "/ports" });

      if (stats && stats.status === 200) {
        set_ports(stats.data);
      } else {
        console.error("Failed to load ports:", stats);
      }
    } catch (error) {
      console.error("Error loading ports:", error);
    }
  };

  useEffect(() => {
    loadProfiles();
    loadPorts();
  }, []);

  const removeStream = (id: number) => {
    const updatedProfiles = { ...profiles };
    const profile = updatedProfiles[selected_profile as keyof typeof profiles];

    if (!profile) return;

    const updatedStreams = profile.streams.filter(
      (stream) => stream.stream_id !== id
    );
    profile.streams = updatedStreams;

    set_profiles(updatedProfiles);
  };

  const addStream = () => {
    const updatedProfiles = { ...profiles };
    const profile = updatedProfiles[selected_profile as keyof typeof profiles];

    if (!profile) return;

    const newStreamId =
      profile.streams.length > 0
        ? Math.max(...profile.streams.map((s) => s.stream_id)) + 1
        : 1;
    const newStream = DefaultStream(newStreamId);
    const newStreamSettings = ports
      .filter((v) => v.loopback === "BF_LPBK_NONE")
      .map((v) => DefaultStreamSettings(newStreamId, v.pid));

    profile.streams.push(newStream);
    profile.stream_settings.push(...newStreamSettings);

    set_profiles(updatedProfiles);
  };

  const handlePortChange = (event: any, pid: number) => {
    const updatedProfiles = { ...profiles };
    const profile = updatedProfiles[selected_profile as keyof typeof profiles];

    if (!profile) return;

    const newPortTxRxMapping = { ...profile.port_tx_rx_mapping };

    if (parseInt(event.target.value) === -1) {
      delete newPortTxRxMapping[pid];
    } else {
      newPortTxRxMapping[pid] = parseInt(event.target.value);
    }

    updatedProfiles[selected_profile as keyof typeof profiles] = {
      ...profile,
      port_tx_rx_mapping: newPortTxRxMapping,
    };

    set_profiles(updatedProfiles);
  };

  const handleDurationChange = (event: any) => {
    const newDuration = isNaN(parseInt(event.target.value))
      ? 0
      : parseInt(event.target.value);

    if (newDuration >= 0) {
      set_duration(newDuration);
    }
  };

  const save = () => {
    const updatedProfiles = { ...profiles };
    if (updatedProfiles[selected_profile]) {
      updatedProfiles[selected_profile].duration = duration;
    }
    const trafficGen = {
      "1": updatedProfiles[selected_profile as keyof typeof profiles],
    };
    localStorage.setItem("traffic_gen", JSON.stringify(trafficGen));
    localStorage.setItem("test-mode", String(2));
    alert(`${selected_profile} settings have been saved.`);
  };

  const reset = async () => {
    await loadProfiles();
    const profile = profiles[selected_profile];
    if (profile) {
      set_duration(profile.duration || 0);
    }
    window.location.reload();
  };

  const handleSelectProfile = (profileName: string) => {
    set_selected_profile(profileName);
    if (profiles[profileName]) {
      set_duration(profiles[profileName].duration || 0);
    }
  };

  const currentProfile = profiles[selected_profile as keyof typeof profiles];

  return (
    <>
      <Row>
        <Col className="col-2">
          <Form.Text className="text-muted">Selected Test</Form.Text>
        </Col>
        <Col className="col-2">
          <Form.Text className="text-muted">Duration</Form.Text>
        </Col>
      </Row>
      <Row className="align-items-end">
        <Col className="col-2">
          <DropdownButton
            as={ButtonGroup}
            className="me-3"
            variant={"secondary"}
            key={"Select Profile"}
            title={selected_profile}
            onSelect={(eventKey) => handleSelectProfile(eventKey as string)}
          >
            {Object.keys(profiles).map((profileName) => (
              <Dropdown.Item
                eventKey={profileName}
                active={profileName === selected_profile}
                key={profileName}
              >
                {profileName}
              </Dropdown.Item>
            ))}
          </DropdownButton>
          <InfoBox>
            <>
              <h4>RFC 2544</h4>
              <p>
                RFC 2544 definiert Methoden zur Leistungsbewertung von
                Netzwerkgeräten. Die wichtigsten Tests sind:
              </p>
              <ul>
                <li>
                  <strong>Durchsatz:</strong> Maximale Datenrate ohne
                  Paketverlust.
                </li>
                <li>
                  <strong>Latenz:</strong> Zeit für ein Paket, durch das Gerät
                  zu gelangen.
                </li>
                <li>
                  <strong>Paketverlust:</strong> Anzahl verlorener Pakete bei
                  verschiedenen Datenraten.
                </li>
                <li>
                  <strong>Jitter:</strong> Variabilität der Paketlatenz.
                </li>
                <li>
                  <strong>Back-to-Back Frames:</strong> Verarbeitung
                  aufeinanderfolgender Pakete.
                </li>
                <li>
                  <strong>System-Recovery:</strong> Erholungszeit nach
                  Überlastung.
                </li>
              </ul>

              <h4>IMIX</h4>
              <p>
                IMIX (Internet Mix) ist ein Testverfahren, das verwendet wird,
                um die Leistung von Netzwerkgeräten unter realen Bedingungen zu
                bewerten. Es berücksichtigt die Tatsache, dass Netzwerkverkehr
                aus Paketen unterschiedlicher Größe besteht.
              </p>
              <h5>Paketgrößen-Mix</h5>
              <p>
                IMIX verwendet eine Mischung aus verschiedenen Paketgrößen, um
                den realen Netzwerkverkehr nachzubilden. Typischerweise werden
                kleine, mittlere und große Pakete gemischt.
              </p>
              <h5>Ziel</h5>
              <p>
                Der Zweck des IMIX-Tests ist es, die Leistungsfähigkeit eines
                Netzwerkgeräts unter realistischen Bedingungen zu bewerten, da
                reiner Durchsatz- oder Latenztests mit einer einheitlichen
                Paketgröße nicht die tatsächlichen Netzwerkbedingungen
                widerspiegeln.
              </p>
            </>
          </InfoBox>
        </Col>
        <Col className="col-2">
          <Form>
            <Form.Control
              type="number"
              min={0}
              placeholder={"Number of seconds"}
              value={duration}
              onChange={handleDurationChange}
              required
            />
          </Form>
        </Col>
      </Row>
      <StreamTable
        {...{
          removeStream,
          running,
          currentTest: currentProfile,
        }}
      />

      <AddStreamButton
        {...{
          addStream,
          running,
          currentTest: currentProfile,
        }}
      />

      <PortMappingTable
        {...{
          ports,
          running,
          handlePortChange,
          currentTest: currentProfile,
        }}
      />

      <SaveResetButtons onSave={save} onReset={reset} running={running} />
    </>
  );
};

export default Profiles;
