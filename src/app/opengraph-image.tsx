import { ImageResponse } from "next/og";

export const alt = "LaBolita — Seu palpite. Sua resenha. Sua taça.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "68px 76px",
          color: "white",
          background: "linear-gradient(145deg, #075c32, #064526)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ position: "absolute", width: 460, height: 460, borderRadius: 999, right: -110, top: -170, background: "rgba(223,255,101,.18)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 800 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 60, height: 60, borderRadius: 999, background: "#08713c" }}>
              <div style={{ width: 23, height: 23, borderRadius: 999, border: "6px solid #dfff65" }} />
            </div>
            LaBolita
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 78, lineHeight: 1.03, fontWeight: 900, letterSpacing: -4 }}>
            <span>Seu palpite.</span>
            <span>Sua resenha.</span>
            <span style={{ color: "#dfff65" }}>Sua taça.</span>
          </div>
          <div style={{ display: "flex", fontSize: 25, color: "rgba(255,255,255,.72)" }}>
            O bolão da Copa para jogar com quem importa.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
