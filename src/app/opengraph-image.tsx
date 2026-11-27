import { ImageResponse } from "next/og";
import { BrandMark } from "@/components/brand";

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
        background: "#f7f7f8",
        padding: "56px 70px",
        color: "#111111",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30 }}>
        <BrandMark size={36} />
        <span>ClientBrief</span>
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
        <span>into project briefs.</span>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 23,
          color: "#53535b",
          marginTop: 38,
        }}
      >
        Meeting transcription, editable briefs, and client approvals.
      </div>
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #dedee3",
          paddingTop: 22,
          marginTop: "auto",
          fontSize: 16,
          color: "#53535b",
          letterSpacing: 2,
        }}
      >
        THE AGENCY’S AFTER-MEETING WORKSPACE
      </div>
    </div>,
    size,
  );
}
