// server.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { parse } from 'node-html-parser';

const app = express();

// Trust proxy (for Render)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.post('/api/resolve', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'Missing URL' });
  }

  try {
    // First, fetch the URL, follow redirects
    const resp = await fetch(url, { method: 'GET', redirect: 'follow' });

    // If direct MP4 (or video) — e.g. content-type includes video or URL ends .mp4
    const contentType = resp.headers.get('content-type') || '';
    const finalUrl = resp.url;

    if (contentType.startsWith('video/') || finalUrl.toLowerCase().endsWith('.mp4')) {
      return res.json({ success: true, mp4Url: finalUrl });
    }

    // Else — treat as HTML page: parse for video src or .mp4 links
    const text = await resp.text();
    const root = parse(text);

    // Try <video> tags
    const videoEl = root.querySelector('video');
    if (videoEl) {
      const src = videoEl.getAttribute('src') || (videoEl.querySelector('source') && videoEl.querySelector('source').getAttribute('src'));
      if (src) {
        const absolute = new URL(src, finalUrl).toString();
        return res.json({ success: true, mp4Url: absolute });
      }
    }

    // Try any <a> or <source> with .mp4
    const links = root.querySelectorAll('a');
    for (const a of links) {
      const href = a.getAttribute('href');
      if (href && href.toLowerCase().includes('.mp4')) {
        const absolute = new URL(href, finalUrl).toString();
        return res.json({ success: true, mp4Url: absolute });
      }
    }

    const sources = root.querySelectorAll('source');
    for (const s of sources) {
      const src = s.getAttribute('src');
      if (src && src.toLowerCase().includes('.mp4')) {
        const absolute = new URL(src, finalUrl).toString();
        return res.json({ success: true, mp4Url: absolute });
      }
    }

    // Fallback: plain regex for .mp4 URLs in HTML
    const re = /https?:\/\/[^'"\\s>]+\\.mp4(\\?[^'"\\s>]*)?/i;
    const match = text.match(re);
    if (match) {
      return res.json({ success: true, mp4Url: match[0] });
    }

    // Nothing found
    return res.status(404).json({ success: false, error: 'Could not find mp4 link' });
  } catch (err) {
    console.error('Resolve error:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

