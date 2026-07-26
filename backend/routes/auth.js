const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

const router = express.Router();

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID || 'afe50167e9a44d7fb99dfe22a75cbe4a';
const CLIENT_SECRET  = process.env.SPOTIFY_CLIENT_SECRET || 'baaff70d77284be5a44002397e56c447';

const SCOPE = 'user-read-private user-read-email user-library-read playlist-read-private playlist-read-collaborative';

const generateRandomString = (length) => {
  return crypto.randomBytes(60).toString('hex').slice(0, length);
};

// In-memory store for pending OAuth sessions: state -> { status: 'pending'|'success'|'error', access_token, refresh_token, expires_in, createdAt }
const pendingSessions = new Map();

// Periodic cleanup of expired sessions (older than 10 mins)
setInterval(() => {
  const now = Date.now();
  for (const [state, session] of pendingSessions.entries()) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      pendingSessions.delete(state);
    }
  }
}, 60000);

function getRedirectUri(req) {
  if (process.env.SPOTIFY_REDIRECT_URI) return process.env.SPOTIFY_REDIRECT_URI;
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${protocol}://${host}/api/auth/callback`;
}

function buildSpotifyAuthUrl(req, state) {
  const redirectUri = getRedirectUri(req);
  return 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPE,
      redirect_uri: redirectUri,
      state: state,
      show_dialog: true,
    });
}

// 1. Initiate login: Generate state & session, return Auth URL and state to client
router.get('/url', (req, res) => {
  const state = generateRandomString(16);
  pendingSessions.set(state, { status: 'pending', createdAt: Date.now() });
  
  res.json({
    url: buildSpotifyAuthUrl(req, state),
    state: state
  });
});

// Standard browser redirect fallback
router.get('/login', (req, res) => {
  const state = generateRandomString(16);
  pendingSessions.set(state, { status: 'pending', createdAt: Date.now() });
  res.redirect(buildSpotifyAuthUrl(req, state));
});

// 2. OAuth Callback from Spotify (opened in External Browser or Webview)
router.get('/callback', async (req, res) => {
  const code  = req.query.code || null;
  const state = req.query.state || null;
  const redirectUri = getRedirectUri(req);

  if (!state || !pendingSessions.has(state)) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Aks Raag - Auth Error</title></head>
        <body style="background:#121212;color:#fff;font-family:sans-serif;text-align:center;padding-top:50px;">
          <h1 style="color:#f44336;">Invalid or Expired Session</h1>
          <p>Please return to Aks Raag and try connecting again.</p>
        </body>
      </html>
    `);
  }

  try {
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
      }
    };

    const response = await axios.post(authOptions.url, authOptions.data, { headers: authOptions.headers });
    const { access_token, refresh_token, expires_in } = response.data;

    // Save tokens in session store so the polling app client can retrieve them
    pendingSessions.set(state, {
      status: 'success',
      access_token,
      refresh_token,
      expires_in,
      createdAt: Date.now()
    });

    // Also set cookies on the callback response
    res.cookie('spotify_access_token', access_token, { maxAge: expires_in * 1000, httpOnly: true, sameSite: 'Lax' });
    res.cookie('spotify_refresh_token', refresh_token, { maxAge: 30 * 24 * 3600 * 1000, httpOnly: true, sameSite: 'Lax' });

    // Success Page presented in the browser tab
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Aks Raag - Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { background: #121212; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #1e1e1e; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.5); max-width: 400px; width: 100%; border: 1px solid #333; }
            h1 { color: #1ed760; font-size: 26px; margin-top: 0; margin-bottom: 12px; }
            p { color: #b3b3b3; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
            .badge { background: rgba(30, 215, 96, 0.15); color: #1ed760; font-weight: 600; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>? Spotify Connected</h1>
            <p>Your account was authorized successfully. You may close this tab and return to <strong>Aks Raag</strong>.</p>
            <div class="badge">Session Active</div>
          </div>
          <script>
            setTimeout(() => {
              try { window.close(); } catch(e){}
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error during token exchange:', error.response?.data || error.message);
    pendingSessions.set(state, { status: 'error', error: error.message });
    res.status(500).send('Authentication failed. Please try again.');
  }
});

// 3. Polling endpoint: App checks state and receives cookies / tokens upon completion
router.get('/check-session', (req, res) => {
  const { state } = req.query;

  if (!state || !pendingSessions.has(state)) {
    return res.json({ loggedIn: false, message: 'Invalid or expired state' });
  }

  const session = pendingSessions.get(state);

  if (session.status === 'success') {
    res.cookie('spotify_access_token', session.access_token, { maxAge: session.expires_in * 1000, httpOnly: true, sameSite: 'Lax' });
    res.cookie('spotify_refresh_token', session.refresh_token, { maxAge: 30 * 24 * 3600 * 1000, httpOnly: true, sameSite: 'Lax' });

    pendingSessions.delete(state);

    return res.json({
      loggedIn: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }

  if (session.status === 'error') {
    pendingSessions.delete(state);
    return res.json({ loggedIn: false, error: session.error });
  }

  return res.json({ loggedIn: false, status: 'pending' });
});

router.get('/refresh_token', async (req, res) => {
  const refresh_token = req.cookies.spotify_refresh_token || req.headers['x-refresh-token'];

  if (!refresh_token) {
    return res.status(401).json({ error: 'No refresh token available' });
  }

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
    }
  };

  try {
    const response = await axios.post(authOptions.url, authOptions.data, { headers: authOptions.headers });
    const { access_token, expires_in } = response.data;
    
    res.cookie('spotify_access_token', access_token, { maxAge: expires_in * 1000, httpOnly: true, sameSite: 'Lax' });
    res.json({ access_token });
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    res.status(400).json({ error: 'Failed to refresh token' });
  }
});

router.get('/me', (req, res) => {
    let access_token = req.cookies ? req.cookies.spotify_access_token : null;
    if (!access_token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') access_token = parts[1];
    }
    
    if (access_token) {
        res.json({ loggedIn: true, access_token });
    } else {
        res.json({ loggedIn: false });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('spotify_access_token');
    res.clearCookie('spotify_refresh_token');
    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
