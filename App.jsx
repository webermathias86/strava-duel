import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Config ──────────────────────────────────────────────────────────────────
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin + "/api/auth";

const P1_COLOR = "#FF6B35";
const P2_COLOR = "#4ECDC4";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatKm(km) {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}K` : `${Math.round(km)}`;
}

function getMonthName(monthStr) {
  const [, m] = monthStr.split("-");
  return ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][parseInt(m) - 1];
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f1117", border: "1px solid #2a2d3a",
      borderRadius: 8, padding: "10px 14px", fontSize: 13,
    }}>
      <p style={{ color: "#888", marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          <strong>{p.name}:</strong> {p.value.toFixed(1)} km
        </p>
      ))}
    </div>
  );
}

// ─── Leaderboard Card ─────────────────────────────────────────────────────────
function LeaderboardCard({ players }) {
  const sorted = [...players].sort((a, b) => b.totalKm - a.totalKm);
  const leader = sorted[0];
  const trailer = sorted[1];
  const diff = leader.totalKm - trailer.totalKm;
  const leaderColor = leader === players[0] ? P1_COLOR : P2_COLOR;
  const trailerColor = trailer === players[0] ? P1_COLOR : P2_COLOR;

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)",
      border: "1px solid #2a2d3a", borderRadius: 16, padding: "24px",
      marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#fff", fontSize: 18, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
          🏆 Leaderboard {new Date().getFullYear()}
        </h2>
        <span style={{ color: "#888", fontSize: 13 }}>Live</span>
      </div>

      {/* Leader */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px", borderRadius: 12,
        background: `${leaderColor}15`, border: `1px solid ${leaderColor}40`,
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 22 }}>🥇</span>
        {leader.profile && (
          <img src={leader.profile} alt="" style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${leaderColor}` }} />
        )}
        <div style={{ flex: 1 }}>
          <p style={{ color: "#fff", margin: 0, fontWeight: 700, fontSize: 16 }}>{leader.name}</p>
          <p style={{ color: "#888", margin: 0, fontSize: 12 }}>Führend</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: leaderColor, margin: 0, fontWeight: 800, fontSize: 24, fontFamily: "monospace" }}>
            {leader.totalKm.toFixed(0)}
            <span style={{ fontSize: 14, fontWeight: 400 }}> km</span>
          </p>
        </div>
      </div>

      {/* Trailer */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px", borderRadius: 12,
        background: "#ffffff08", border: "1px solid #2a2d3a",
        marginBottom: 16,
      }}>
        <span style={{ fontSize: 22 }}>🥈</span>
        {trailer.profile && (
          <img src={trailer.profile} alt="" style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${trailerColor}` }} />
        )}
        <div style={{ flex: 1 }}>
          <p style={{ color: "#fff", margin: 0, fontWeight: 700, fontSize: 16 }}>{trailer.name}</p>
          <p style={{ color: "#888", margin: 0, fontSize: 12 }}>Verfolger</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ color: trailerColor, margin: 0, fontWeight: 800, fontSize: 24, fontFamily: "monospace" }}>
            {trailer.totalKm.toFixed(0)}
            <span style={{ fontSize: 14, fontWeight: 400 }}> km</span>
          </p>
        </div>
      </div>

      {/* Gap */}
      <div style={{
        textAlign: "center", padding: "10px",
        background: "#ffffff05", borderRadius: 8,
      }}>
        <span style={{ color: "#888", fontSize: 13 }}>
          Rückstand: <strong style={{ color: "#fff" }}>{diff.toFixed(1)} km</strong>
          {" — "}das sind ca. <strong style={{ color: "#fff" }}>{Math.round(diff / 30)} Tages-Rides</strong>
        </span>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("cumulative");
  const [year] = useState(new Date().getFullYear());

  // Check URL params for connection feedback
  const params = new URLSearchParams(window.location.search);
  const justConnected = params.get("connected");
  const connectedName = params.get("name");
  const connectError = params.get("error");

  useEffect(() => {
    // Clean URL
    if (justConnected || connectError) {
      window.history.replaceState({}, "", "/");
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [statusRes, activitiesRes] = await Promise.all([
        fetch("/api/status"),
        fetch(`/api/activities?year=${year}`),
      ]);
      const statusData = await statusRes.json();
      const actData = await activitiesRes.json();
      setStatus(statusData);
      if (actData.status === "ready") setData(actData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function handleConnect() {
    const stravaAuthUrl =
      `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code&scope=activity:read_all&approval_prompt=force`;
    window.location.href = stravaAuthUrl;
  }

  // ── Merge cumulative data for chart ──────────────────────────────────────
  function getMergedCumulative() {
    if (!data) return [];
    const p1 = data.players[0];
    const p2 = data.players[1];
    const allDates = new Set([
      ...p1.cumulative.map((d) => d.date),
      ...p2.cumulative.map((d) => d.date),
    ]);
    const p1Map = Object.fromEntries(p1.cumulative.map((d) => [d.date, d.km]));
    const p2Map = Object.fromEntries(p2.cumulative.map((d) => [d.date, d.km]));
    return [...allDates]
      .sort()
      .map((date, i) => ({
        date: i % 14 === 0 ? date.substring(5) : "",
        fullDate: date,
        [p1.name]: p1Map[date] ?? null,
        [p2.name]: p2Map[date] ?? null,
      }));
  }

  function getMergedMonthly() {
    if (!data) return [];
    const p1 = data.players[0];
    const p2 = data.players[1];
    const allMonths = new Set([
      ...p1.monthly.map((d) => d.month),
      ...p2.monthly.map((d) => d.month),
    ]);
    const p1Map = Object.fromEntries(p1.monthly.map((d) => [d.month, d.km]));
    const p2Map = Object.fromEntries(p2.monthly.map((d) => [d.month, d.km]));
    return [...allMonths]
      .sort()
      .map((month) => ({
        month: getMonthName(month),
        [p1.name]: p1Map[month] ?? 0,
        [p2.name]: p2Map[month] ?? 0,
      }));
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = {
    app: {
      minHeight: "100vh",
      background: "#080a10",
      color: "#fff",
      fontFamily: "'Space Grotesk', sans-serif",
      padding: "0 0 40px",
    },
    header: {
      padding: "20px 20px 0",
      background: "linear-gradient(180deg, #0f1117 0%, transparent 100%)",
    },
    title: {
      fontSize: 26, fontWeight: 800, margin: "0 0 4px",
      background: `linear-gradient(90deg, ${P1_COLOR}, ${P2_COLOR})`,
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    },
    container: { padding: "0 16px", maxWidth: 480, margin: "0 auto" },
    tabBar: {
      display: "flex", gap: 8, marginBottom: 24, marginTop: 24,
    },
    tab: (active) => ({
      flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
      background: active ? "#1e2235" : "transparent",
      color: active ? "#fff" : "#888", fontWeight: active ? 700 : 400,
      fontSize: 13, cursor: "pointer",
      transition: "all 0.2s",
    }),
    card: {
      background: "linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)",
      border: "1px solid #2a2d3a", borderRadius: 16, padding: "20px",
      marginBottom: 20,
    },
    cardTitle: { fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 },
    connectBtn: {
      width: "100%", padding: "16px", borderRadius: 12, border: "none",
      background: `linear-gradient(90deg, ${P1_COLOR}, #ff8c42)`,
      color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
      marginBottom: 12,
    },
    badge: (color) => ({
      display: "inline-block", padding: "2px 8px", borderRadius: 20,
      background: `${color}20`, color: color, fontSize: 12, fontWeight: 600,
    }),
  };

  return (
    <div style={styles.app}>
      {/* Load Google Font */}
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={styles.header}>
        <div style={{ ...styles.container, paddingTop: 20 }}>
          <h1 style={styles.title}>🚴 Duel</h1>
          <p style={{ color: "#888", fontSize: 13, margin: 0 }}>
            Jahreswettbewerb {year}
          </p>
        </div>
      </div>

      <div style={styles.container}>
        {/* Connection feedback */}
        {justConnected && (
          <div style={{ ...styles.card, borderColor: "#4ECDC440", background: "#4ECDC410", marginTop: 20 }}>
            <p style={{ margin: 0, color: "#4ECDC4" }}>
              ✅ <strong>{connectedName}</strong> ist jetzt verbunden!
            </p>
          </div>
        )}
        {connectError && (
          <div style={{ ...styles.card, borderColor: "#ff4444", background: "#ff444410", marginTop: 20 }}>
            <p style={{ margin: 0, color: "#ff6666" }}>
              ❌ Fehler beim Verbinden. Bitte nochmal versuchen.
            </p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p>Lade Daten von Strava...</p>
          </div>
        ) : !status?.ready ? (
          /* ── Connection Screen ──────────────────────────────────── */
          <div style={{ paddingTop: 32 }}>
            <div style={styles.card}>
              <h2 style={{ ...styles.cardTitle, fontSize: 18, marginBottom: 8 }}>
                Verbinde dein Strava
              </h2>
              <p style={{ color: "#888", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Beide Fahrer müssen ihre Strava-Accounts verbinden.
                {status?.connectedCount === 1 && (
                  <span> <strong style={{ color: P2_COLOR }}>1/2 verbunden</strong> — noch eine Person fehlt.</span>
                )}
              </p>

              {status?.players?.map((p) => (
                <div key={p.slot} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid #2a2d3a",
                  marginBottom: 8,
                }}>
                  {p.profile && <img src={p.profile} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />}
                  <span style={{ color: "#fff" }}>{p.name}</span>
                  <span style={styles.badge("#4ECDC4")}>✓ Verbunden</span>
                </div>
              ))}

              <button style={styles.connectBtn} onClick={handleConnect}>
                Mit Strava verbinden →
              </button>
              <p style={{ color: "#666", fontSize: 12, textAlign: "center" }}>
                Schick den Link auch deinem Kumpel – er muss dasselbe tun.
              </p>
            </div>
          </div>
        ) : (
          /* ── Dashboard ──────────────────────────────────────────── */
          <>
            {/* Leaderboard */}
            <div style={{ marginTop: 24 }}>
              <LeaderboardCard players={data.players} />
            </div>

            {/* Tab bar */}
            <div style={styles.tabBar}>
              <button style={styles.tab(tab === "cumulative")} onClick={() => setTab("cumulative")}>
                📈 Verlauf
              </button>
              <button style={styles.tab(tab === "monthly")} onClick={() => setTab("monthly")}>
                📊 Monate
              </button>
            </div>

            {/* Cumulative chart */}
            {tab === "cumulative" && (
              <div style={styles.card}>
                <p style={styles.cardTitle}>Kumulative km – {year}</p>
                <p style={{ color: "#666", fontSize: 12, marginBottom: 16, marginTop: -8 }}>
                  Wer war wann vorne?
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={getMergedCumulative()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="date" tick={{ fill: "#666", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 11 }} width={42} tickFormatter={formatKm} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                    <Line
                      type="monotone" dataKey={data.players[0].name}
                      stroke={P1_COLOR} strokeWidth={2.5}
                      dot={false} connectNulls
                    />
                    <Line
                      type="monotone" dataKey={data.players[1].name}
                      stroke={P2_COLOR} strokeWidth={2.5}
                      dot={false} connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly chart */}
            {tab === "monthly" && (
              <div style={styles.card}>
                <p style={styles.cardTitle}>Monatliche km – {year}</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={getMergedMonthly()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="month" tick={{ fill: "#666", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 11 }} width={42} tickFormatter={formatKm} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                    <Bar dataKey={data.players[0].name} fill={P1_COLOR} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={data.players[1].name} fill={P2_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent activities */}
            <div style={styles.card}>
              <p style={styles.cardTitle}>Letzte Aktivitäten</p>
              {data.players.map((player, pi) => {
                const lastRides = [...player.activities]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 3);
                const color = pi === 0 ? P1_COLOR : P2_COLOR;
                return (
                  <div key={player.id} style={{ marginBottom: 16 }}>
                    <p style={{ color, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                      {player.name}
                    </p>
                    {lastRides.map((r, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between",
                        padding: "6px 0", borderBottom: "1px solid #1e2235",
                        fontSize: 13,
                      }}>
                        <span style={{ color: "#aaa" }}>{r.date.substring(5)} – {r.name}</span>
                        <span style={{ color: "#fff", fontWeight: 600 }}>{r.km} km</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <button
              style={{ ...styles.connectBtn, background: "#1e2235", marginTop: 4 }}
              onClick={loadData}
            >
              🔄 Aktualisieren
            </button>
          </>
        )}
      </div>
    </div>
  );
}
