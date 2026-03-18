import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

const P1_COLOR = "#FF6B35";
const P2_COLOR = "#4ECDC4";
const GOAL_KM = 4000;

function formatKm(km) {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}K` : `${Math.round(km)}`;
}

function getMonthName(monthStr) {
  const m = parseInt(monthStr.split("-")[1]);
  return ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][m - 1];
}

function getPaceKmForDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const elapsed = (date - start) / (end - start);
  return parseFloat((elapsed * GOAL_KM).toFixed(2));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <p style={{ color: "#888", marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0" }}>
          <strong>{p.name}:</strong> {Number(p.value).toFixed(1)} km
        </p>
      ))}
    </div>
  );
}

function countCrowns(players) {
  const crowns = { [players[0].name]: 0, [players[1].name]: 0 };
  const p1 = players[0];
  const p2 = players[1];
  const allMonths = [...new Set([...p1.monthly.map(d => d.month), ...p2.monthly.map(d => d.month)])].sort();
  const p1Map = Object.fromEntries(p1.monthly.map(d => [d.month, d.km]));
  const p2Map = Object.fromEntries(p2.monthly.map(d => [d.month, d.km]));
  const now = new Date();
  allMonths.forEach(month => {
    const [y, m] = month.split("-").map(Number);
    const isComplete = now.getFullYear() > y || (now.getFullYear() === y && now.getMonth() + 1 > m);
    if (!isComplete) return;
    const p1km = p1Map[month] ?? 0;
    const p2km = p2Map[month] ?? 0;
    if (p1km > p2km) crowns[p1.name]++;
    else if (p2km > p1km) crowns[p2.name]++;
  });
  return crowns;
}

function CrownRow({ count }) {
  if (count === 0) return <span style={{ color: "#555", fontSize: 12 }}>noch keine Krone</span>;
  return (
    <span style={{ fontSize: 15, letterSpacing: 2 }}>
      {"👑".repeat(Math.min(count, 8))}
      {count > 8 ? <span style={{ color: "#888", fontSize: 12 }}> +{count - 8}</span> : null}
    </span>
  );
}

function LeaderboardCard({ players }) {
  const sorted = [...players].sort((a, b) => b.totalKm - a.totalKm);
  const leader = sorted[0];
  const trailer = sorted[1];
  const diff = leader.totalKm - trailer.totalKm;
  const leaderColor = leader.id === players[0].id ? P1_COLOR : P2_COLOR;
  const trailerColor = trailer.id === players[0].id ? P1_COLOR : P2_COLOR;
  const crowns = countCrowns(players);

  return (
    <div style={{ background: "linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)", border: "1px solid #2a2d3a", borderRadius: 16, padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>🏆 Leaderboard {new Date().getFullYear()}</h2>
        <span style={{ color: "#888", fontSize: 13 }}>Live</span>
      </div>
      {[{ player: leader, emoji: "🥇", color: leaderColor, role: "Führend" }, { player: trailer, emoji: "🥈", color: trailerColor, role: "Verfolger" }].map(({ player, emoji, color, role }) => (
        <div key={player.id} style={{
          display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 12,
          background: role === "Führend" ? `${color}15` : "#ffffff08",
          border: `1px solid ${role === "Führend" ? color + "40" : "#2a2d3a"}`,
          marginBottom: 10,
        }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          {player.profile && <img src={player.profile} alt="" style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${color}` }} />}
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", margin: 0, fontWeight: 700, fontSize: 15 }}>{player.name}</p>
            <div style={{ marginTop: 3 }}>
              <CrownRow count={crowns[player.name]} />
            </div>
          </div>
          <p style={{ color, margin: 0, fontWeight: 800, fontSize: 24, fontFamily: "monospace" }}>
            {player.totalKm.toFixed(0)}<span style={{ fontSize: 13, fontWeight: 400 }}> km</span>
          </p>
        </div>
      ))}
      <div style={{ textAlign: "center", padding: 10, background: "#ffffff05", borderRadius: 8 }}>
        <span style={{ color: "#888", fontSize: 13 }}>
          Rückstand: <strong style={{ color: "#fff" }}>{diff.toFixed(1)} km</strong>
          {" — "}ca. <strong style={{ color: "#fff" }}>{Math.round(diff / 30)} Tages-Rides</strong>
        </span>
      </div>
    </div>
  );
}

function GoalCard({ players }) {
  const today = new Date().toISOString().split("T")[0];
  const paceNow = getPaceKmForDate(today);
  const year = new Date().getFullYear();
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year}-12-31`);
  const progressPct = ((new Date() - start) / (end - start)) * 100;

  return (
    <div style={{ background: "linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)", border: "1px solid #2a2d3a", borderRadius: 16, padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: "#fff", fontSize: 18, margin: 0 }}>🎯 Jahresziel {GOAL_KM.toLocaleString()} km</h2>
        <span style={{ color: "#888", fontSize: 13 }}>Pace: {Math.round(paceNow)} km</span>
      </div>

      {/* Year progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#666", fontSize: 12 }}>Jahresfortschritt</span>
          <span style={{ color: "#666", fontSize: 12 }}>{progressPct.toFixed(1)}% des Jahres</span>
        </div>
        <div style={{ height: 6, background: "#1e2235", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #444, #666)", borderRadius: 3 }} />
        </div>
      </div>

      {players.map((player, pi) => {
        const color = pi === 0 ? P1_COLOR : P2_COLOR;
        const diff = player.totalKm - paceNow;
        const pct = Math.min((player.totalKm / GOAL_KM) * 100, 100);
        const isAhead = diff >= 0;
        return (
          <div key={player.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {player.profile && <img src={player.profile} alt="" style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid ${color}` }} />}
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{player.name}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ color, fontSize: 13, fontWeight: 700 }}>{player.totalKm.toFixed(0)} km</span>
                <span style={{ fontSize: 12, marginLeft: 8, color: isAhead ? "#4ECDC4" : "#ff6b6b", fontWeight: 600 }}>
                  {isAhead ? "+" : ""}{diff.toFixed(0)} km vs. Pace
                </span>
              </div>
            </div>
            {/* Progress bar with pace marker */}
            <div style={{ position: "relative", height: 10, background: "#1e2235", borderRadius: 5, overflow: "visible" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 5, transition: "width 0.3s" }} />
              {/* Pace marker */}
              <div style={{
                position: "absolute", top: -3, left: `${progressPct}%`,
                width: 2, height: 16, background: "#fff", borderRadius: 1,
                transform: "translateX(-50%)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: "#555", fontSize: 11 }}>{pct.toFixed(1)}% des Ziels</span>
              <span style={{ color: "#555", fontSize: 11 }}>noch {(GOAL_KM - player.totalKm).toFixed(0)} km</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("cumulative");
  const year = new Date().getFullYear();

  const params = new URLSearchParams(window.location.search);
  const justConnected = params.get("connected");
  const connectedName = params.get("name");
  const connectError = params.get("error");

  useEffect(() => {
    if (justConnected || connectError) window.history.replaceState({}, "", "/");
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, actRes] = await Promise.all([
        fetch("/api/status"),
        fetch(`/api/activities?year=${year}`),
      ]);
      const statusData = await statusRes.json();
      const actData = await actRes.json();
      setStatus(statusData);
      if (actData.status === "ready") setData(actData);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function handleConnect() {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
    const redirectUri = window.location.origin + "/api/auth";
    window.location.href =
      `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=activity:read_all&approval_prompt=force`;
  }

  function getMergedCumulative() {
    if (!data) return [];
    const p1 = data.players[0];
    const p2 = data.players[1];
    const p1Map = Object.fromEntries(p1.cumulative.map((d) => [d.date, d.km]));
    const p2Map = Object.fromEntries(p2.cumulative.map((d) => [d.date, d.km]));
    const allDates = [...new Set([...p1.cumulative.map(d => d.date), ...p2.cumulative.map(d => d.date)])].sort();
    return allDates.map((date, i) => ({
      date: i % 14 === 0 ? date.substring(5) : "",
      fullDate: date,
      [p1.name]: p1Map[date] ?? null,
      [p2.name]: p2Map[date] ?? null,
      "Ziel-Pace": getPaceKmForDate(date),
    }));
  }

  function getMergedMonthly() {
    if (!data) return [];
    const p1 = data.players[0];
    const p2 = data.players[1];
    const p1Map = Object.fromEntries(p1.monthly.map((d) => [d.month, d.km]));
    const p2Map = Object.fromEntries(p2.monthly.map((d) => [d.month, d.km]));
    const allMonths = [...new Set([...p1.monthly.map(d => d.month), ...p2.monthly.map(d => d.month)])].sort();
    return allMonths.map((month) => {
      const p1km = p1Map[month] ?? 0;
      const p2km = p2Map[month] ?? 0;
      // only award crown for completed months
      const now = new Date();
      const [y, m] = month.split("-").map(Number);
      const isComplete = now.getFullYear() > y || (now.getFullYear() === y && now.getMonth() + 1 > m);
      const winner = isComplete ? (p1km > p2km ? p1.name : p2km > p1km ? p2.name : null) : null;
      return {
        month: getMonthName(month),
        [p1.name]: p1km,
        [p2.name]: p2km,
        winner,
        p1Name: p1.name,
        p2Name: p2.name,
      };
    });
  }

  // Custom bar label for monthly winner crown
  function MonthWinnerLabel(props) {
    const { x, width, value, index, monthData, playerName } = props;
    if (!monthData || !monthData[index]) return null;
    const row = monthData[index];
    if (row.winner !== playerName) return null;
    const otherKm = playerName === row.p1Name ? row[row.p2Name] : row[row.p1Name];
    const topY = props.y - 8;
    if (value < otherKm) return null;
    return (
      <text x={x + width / 2} y={topY} textAnchor="middle" fontSize={14}>👑</text>
    );
  }

  const s = {
    app: { minHeight: "100vh", background: "#080a10", color: "#fff", fontFamily: "'Space Grotesk', sans-serif", paddingBottom: 40 },
    container: { padding: "0 16px", maxWidth: 480, margin: "0 auto" },
    card: { background: "linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%)", border: "1px solid #2a2d3a", borderRadius: 16, padding: 20, marginBottom: 16 },
    cardTitle: { fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 },
    tab: (active) => ({ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: active ? "#1e2235" : "transparent", color: active ? "#fff" : "#888", fontWeight: active ? 700 : 400, fontSize: 13, cursor: "pointer" }),
  };

  const monthlyData = data ? getMergedMonthly() : [];

  return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ padding: "20px 20px 0", background: "linear-gradient(180deg, #0f1117 0%, transparent 100%)" }}>
        <div style={{ ...s.container, paddingTop: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px", background: `linear-gradient(90deg, ${P1_COLOR}, ${P2_COLOR})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🚴 Duel
          </h1>
          <p style={{ color: "#888", fontSize: 13 }}>Jahreswettbewerb {year}</p>
        </div>
      </div>

      <div style={s.container}>
        {justConnected && (
          <div style={{ ...s.card, borderColor: "#4ECDC440", background: "#4ECDC410", marginTop: 20 }}>
            <p style={{ margin: 0, color: "#4ECDC4" }}>✅ <strong>{connectedName}</strong> ist jetzt verbunden!</p>
          </div>
        )}
        {connectError && (
          <div style={{ ...s.card, borderColor: "#ff4444", background: "#ff444410", marginTop: 20 }}>
            <p style={{ margin: 0, color: "#ff6666" }}>❌ Fehler beim Verbinden. Bitte nochmal versuchen.</p>
          </div>
        )}
        {error && (
          <div style={{ ...s.card, borderColor: "#ff4444", background: "#ff444410", marginTop: 20 }}>
            <p style={{ margin: 0, color: "#ff6666" }}>Fehler: {error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p>Lade Daten von Strava...</p>
          </div>
        ) : !status?.ready ? (
          <div style={{ paddingTop: 32 }}>
            <div style={s.card}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Verbinde dein Strava</h2>
              <p style={{ color: "#888", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                Beide Fahrer müssen ihre Strava-Accounts verbinden.
                {status?.connectedCount === 1 && <span> <strong style={{ color: P2_COLOR }}>1/2 verbunden</strong> — noch eine Person fehlt.</span>}
              </p>
              {status?.players?.map((p) => (
                <div key={p.slot} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #2a2d3a", marginBottom: 8 }}>
                  {p.profile && <img src={p.profile} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />}
                  <span style={{ color: "#fff" }}>{p.name}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 20, background: "#4ECDC420", color: "#4ECDC4", fontSize: 12, fontWeight: 600 }}>✓ Verbunden</span>
                </div>
              ))}
              <button style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: `linear-gradient(90deg, ${P1_COLOR}, #ff8c42)`, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 8 }} onClick={handleConnect}>
                Mit Strava verbinden →
              </button>
              <p style={{ color: "#666", fontSize: 12, textAlign: "center", marginTop: 10 }}>Schick den Link auch deinem Kumpel – er muss dasselbe tun.</p>
            </div>
          </div>
        ) : data ? (
          <>
            <div style={{ marginTop: 24 }}>
              <LeaderboardCard players={data.players} />
              <GoalCard players={data.players} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button style={s.tab(tab === "cumulative")} onClick={() => setTab("cumulative")}>📈 Verlauf</button>
              <button style={s.tab(tab === "monthly")} onClick={() => setTab("monthly")}>📊 Monate</button>
            </div>

            {tab === "cumulative" && (
              <div style={s.card}>
                <p style={s.cardTitle}>Kumulative km – {year}</p>
                <p style={{ color: "#666", fontSize: 12, marginBottom: 16, marginTop: -8 }}>
                  Gestrichelt = Pace für {GOAL_KM.toLocaleString()} km Ziel
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={getMergedCumulative()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="date" tick={{ fill: "#666", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 11 }} width={42} tickFormatter={formatKm} domain={[0, GOAL_KM]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                    <Line type="monotone" dataKey="Ziel-Pace" stroke="#555" strokeWidth={1.5} dot={false} strokeDasharray="5 3" connectNulls />
                    <Line type="monotone" dataKey={data.players[0].name} stroke={P1_COLOR} strokeWidth={2.5} dot={false} connectNulls />
                    <Line type="monotone" dataKey={data.players[1].name} stroke={P2_COLOR} strokeWidth={2.5} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {tab === "monthly" && (
              <div style={s.card}>
                <p style={s.cardTitle}>Monatliche km – {year}</p>
                <p style={{ color: "#666", fontSize: 12, marginBottom: 16, marginTop: -8 }}>👑 = Monatssieger</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2235" />
                    <XAxis dataKey="month" tick={{ fill: "#666", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#666", fontSize: 11 }} width={42} tickFormatter={formatKm} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                    <Bar dataKey={data.players[0].name} fill={P1_COLOR} radius={[4, 4, 0, 0]}
                      label={<MonthWinnerLabel monthData={monthlyData} playerName={data.players[0].name} />} />
                    <Bar dataKey={data.players[1].name} fill={P2_COLOR} radius={[4, 4, 0, 0]}
                      label={<MonthWinnerLabel monthData={monthlyData} playerName={data.players[1].name} />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div style={s.card}>
              <p style={s.cardTitle}>Letzte Aktivitäten</p>
              {data.players.map((player, pi) => {
                const color = pi === 0 ? P1_COLOR : P2_COLOR;
                const lastRides = [...player.activities].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
                return (
                  <div key={String(player.id)} style={{ marginBottom: 16 }}>
                    <p style={{ color, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{player.name}</p>
                    {lastRides.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1e2235", fontSize: 13 }}>
                        <span style={{ color: "#aaa" }}>{r.date.substring(5)} – {r.name}</span>
                        <span style={{ color: "#fff", fontWeight: 600 }}>{r.km} km</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <button style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", background: "#1e2235", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }} onClick={loadData}>
              🔄 Aktualisieren
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#888" }}>
            <p>Keine Daten verfügbar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
