// api/activities.js
import { Redis } from '@upstash/redis';

function getRedis() {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function refreshTokenIfNeeded(redis, athleteId) {
  const athlete = await redis.hgetall(`athlete:${athleteId}`);
  if (!athlete) return null;

  const now = Math.floor(Date.now() / 1000);
  if (athlete.expires_at > now + 300) return athlete.access_token;

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: athlete.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    await redis.hset(`athlete:${athleteId}`, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });
    return data.access_token;
  }
  return null;
}

async function fetchActivities(accessToken, year) {
  const after = Math.floor(new Date(`${year}-01-01`).getTime() / 1000);
  const before = Math.floor(new Date(`${year}-12-31T23:59:59`).getTime() / 1000);
  let allActivities = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=200&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const activities = await response.json();
    if (!Array.isArray(activities) || activities.length === 0) break;
    const rides = activities.filter(a => a.type === 'Ride' || a.type === 'VirtualRide' || a.sport_type === 'Ride');
    allActivities = allActivities.concat(rides);
    if (activities.length < 200) break;
    page++;
  }

  return allActivities.map(a => ({
    date: a.start_date_local.split('T')[0],
    km: parseFloat((a.distance / 1000).toFixed(2)),
    name: a.name,
  }));
}

function buildCumulativeData(activities, year) {
  const dailyKm = {};
  activities.forEach(a => { dailyKm[a.date] = (dailyKm[a.date] || 0) + a.km; });

  const startDate = new Date(`${year}-01-01`);
  const today = new Date();
  const endDate = today.getFullYear() === year ? today : new Date(`${year}-12-31`);

  const cumulative = [];
  let running = 0;
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    running += dailyKm[dateStr] || 0;
    cumulative.push({ date: dateStr, km: parseFloat(running.toFixed(2)) });
  }
  return cumulative;
}

function buildMonthlyData(activities) {
  const monthly = {};
  activities.forEach(a => {
    const month = a.date.substring(0, 7);
    monthly[month] = (monthly[month] || 0) + a.km;
  });
  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, km]) => ({ month, km: parseFloat(km.toFixed(2)) }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const redis = getRedis();

    const player1Id = await redis.get('player1_id');
    const player2Id = await redis.get('player2_id');

    if (!player1Id || !player2Id) {
      return res.json({
        status: 'incomplete',
        connectedCount: player1Id ? 1 : 0,
        players: [],
      });
    }

    const [p1Info, p2Info] = await Promise.all([
      redis.hgetall(`athlete:${player1Id}`),
      redis.hgetall(`athlete:${player2Id}`),
    ]);

    const [p1Token, p2Token] = await Promise.all([
      refreshTokenIfNeeded(redis, player1Id),
      refreshTokenIfNeeded(redis, player2Id),
    ]);

    const [p1Activities, p2Activities] = await Promise.all([
      fetchActivities(p1Token, year),
      fetchActivities(p2Token, year),
    ]);

    res.json({
      status: 'ready',
      year,
      players: [
        {
          id: player1Id,
          name: p1Info.name,
          profile: p1Info.profile,
          totalKm: parseFloat(p1Activities.reduce((s, a) => s + a.km, 0).toFixed(2)),
          cumulative: buildCumulativeData(p1Activities, year),
          monthly: buildMonthlyData(p1Activities),
          activities: p1Activities,
        },
        {
          id: player2Id,
          name: p2Info.name,
          profile: p2Info.profile,
          totalKm: parseFloat(p2Activities.reduce((s, a) => s + a.km, 0).toFixed(2)),
          cumulative: buildCumulativeData(p2Activities, year),
          monthly: buildMonthlyData(p2Activities),
          activities: p2Activities,
        },
      ],
    });
  } catch (err) {
    console.error('Activities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities', details: err.message });
  }
}
