import { ImageResponse } from "next/og";
export const alt = "ClientBrief — Turn client meetings into project briefs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#f6f2ea",
        padding: "56px 70px",
        color: "#252521",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 30 }}>
        ClientBrief<span style={{ color: "#6f2737" }}>.</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 55,
          fontSize: 77,
          lineHeight: 1.03,
          letterSpacing: -3,
        }}
      >
        <span>Turn client meetings</span>
        <span>
          into <span style={{ color: "#6f2737" }}>project briefs.</span>
        </span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 23,
          color: "#6d6862",
          marginTop: 38,
        }}
      >
        A recording. A reviewed brief. A shared next step.
      </div>
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #ddd6ca",
          paddingTop: 22,
          marginTop: "auto",
          fontSize: 16,
          color: "#6f2737",
          letterSpacing: 2,
        }}
      >
        THE AGENCY’S AFTER-MEETING WORKSPACE
      </div>
    </div>,
    size,
  );
}
