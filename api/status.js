// api/status.js
import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const player1Id = await redis.get('player1_id');
    const player2Id = await redis.get('player2_id');

    const players = [];
    if (player1Id) {
      const p1 = await redis.hgetall(`athlete:${player1Id}`);
      if (p1) players.push({ name: p1.name, profile: p1.profile, slot: 1 });
    }
    if (player2Id) {
      const p2 = await redis.hgetall(`athlete:${player2Id}`);
      if (p2) players.push({ name: p2.name, profile: p2.profile, slot: 2 });
    }

    res.json({ connectedCount: players.length, players, ready: players.length === 2 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status' });
  }
}
