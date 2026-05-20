export default function Loading() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Animated BnC logo cells */}
      <div style={{ display: "flex", gap: 10 }}>
        {["B", "n", "C"].map((c, i) => (
          <div
            key={i}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 900,
              background: "rgba(129,182,76,0.08)",
              border: "2px solid rgba(129,182,76,0.2)",
              color: "#81b64c",
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          >
            {c}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, color: "#595653", fontWeight: 600 }}>Loading…</div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
