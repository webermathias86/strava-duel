// api/auth.js - Strava OAuth Handler
import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) return res.redirect('/?error=access_denied');
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) return res.redirect('/?error=token_exchange_failed');

    const { access_token, refresh_token, expires_at, athlete } = tokenData;
    const athleteId = athlete.id.toString();

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    await redis.hset(`athlete:${athleteId}`, {
      access_token,
      refresh_token,
      expires_at,
      name: `${athlete.firstname} ${athlete.lastname}`,
      profile: athlete.profile_medium,
      athleteId,
    });

    const player1Id = await redis.get('player1_id');
    const player2Id = await redis.get('player2_id');

    if (!player1Id) {
      await redis.set('player1_id', athleteId);
    } else if (player1Id !== athleteId && !player2Id) {
      await redis.set('player2_id', athleteId);
    }

    res.redirect(`/?connected=true&name=${encodeURIComponent(athlete.firstname)}`);
  } catch (err) {
    console.error('Auth error:', err);
    res.redirect('/?error=server_error');
  }
}
