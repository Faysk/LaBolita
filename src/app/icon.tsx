import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "linear-gradient(145deg, #08713c, #064526)" }}>
        <div style={{ width: 190, height: 190, borderRadius: 999, border: "52px solid #dfff65", boxShadow: "0 24px 60px rgba(0,0,0,.2)" }} />
      </div>
    ),
    size,
  );
}
