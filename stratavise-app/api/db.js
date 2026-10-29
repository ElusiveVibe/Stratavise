/* =========================================================
   Stratavise — /api/db  (Vercel Serverless Function)
   Stores the whole app database as one JSON document in
   Upstash Redis (Vercel Marketplace -> Storage -> Upstash Redis).

   Env vars (added automatically when you connect the database
   to your Vercel project):
     KV_REST_API_URL + KV_REST_API_TOKEN
     (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)

   GET  /api/db?since=<version>  -> { configured, version, db | unchanged }
   POST /api/db {baseVersion, db} -> { ok, version }  |  409 { conflict, version, db }
   ========================================================= */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const DB_KEY = 'stratavise:db';
const VER_KEY = 'stratavise:version';

// Atomic read of version + data
const LUA_READ = `
local v = redis.call('GET', KEYS[1])
local d = redis.call('GET', KEYS[2])
if not v then v = '0' end
if not d then d = '' end
return {v, d}`;

// Atomic compare-and-set: only writes if the caller's baseVersion is still current
const LUA_WRITE = `
local cur = tonumber(redis.call('GET', KEYS[1]) or '0')
if cur ~= tonumber(ARGV[1]) then
  local d = redis.call('GET', KEYS[2])
  if not d then d = '' end
  return {'0', tostring(cur), d}
end
redis.call('SET', KEYS[2], ARGV[2])
redis.call('SET', KEYS[1], tostring(cur + 1))
return {'1', tostring(cur + 1), ''}`;

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error || 'Redis HTTP ' + r.status);
  return j.result;
}

function validDb(db) {
  return db && typeof db === 'object' && Array.isArray(db.users) && Array.isArray(db.admins) && db.admins.length > 0 &&
    Array.isArray(db.evaluations) && Array.isArray(db.departments);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(200).json({ configured: false });

  try {
    if (req.method === 'GET') {
      const since = Number(req.query && req.query.since);
      const ver = Number((await redis(['GET', VER_KEY])) || 0);
      if (ver === 0) return res.status(200).json({ configured: true, version: 0, db: null });
      if (since === ver) return res.status(200).json({ configured: true, version: ver, unchanged: true });
      const [v, d] = await redis(['EVAL', LUA_READ, '2', VER_KEY, DB_KEY]);
      return res.status(200).json({ configured: true, version: Number(v), db: d ? JSON.parse(d) : null });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
      if (!body || !validDb(body.db)) return res.status(400).json({ error: 'Invalid database payload.' });
      const base = Number(body.baseVersion) || 0;
      const [ok, ver, data] = await redis(['EVAL', LUA_WRITE, '2', VER_KEY, DB_KEY, String(base), JSON.stringify(body.db)]);
      if (ok === '1') return res.status(200).json({ ok: true, version: Number(ver) });
      return res.status(409).json({ ok: false, conflict: true, version: Number(ver), db: data ? JSON.parse(data) : null });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
