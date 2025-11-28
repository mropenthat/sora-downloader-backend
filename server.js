// server.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// ✅ Trust first proxy (Render)
app.set('trust proxy', 1);

// ✅ Middleware
app.use(cors()); // allow all origins
app.use(express.json()); // parse JSON requests

// ✅ Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use(limiter);

// ✅ Main endpoint
app.post('/api/resolve', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: 'No URL provided' });
  }

  try {
    // Replace this with your Sora resolving logic
    // Example: returning a dummy MP4 URL
    const mp4Url = 'https://example.com/video.mp4';

    res.json({ success: true, mp4Url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

