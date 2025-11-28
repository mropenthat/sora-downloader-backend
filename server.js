import express from "express";
import cors from "cors";
import { parse } from "node-html-parser";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const limiter = rateLimit({
  windowMs: 60000,
  max: 20
});
app.use(limiter);

app.post("/api/resolve", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const response = await fetch(url, { redirect: "follow" });
    const contentType = response.headers.get("content-type");
    const finalUrl = response.url;

    if (contentType?.includes("video") || finalUrl.endsWith(".mp4")) {
      return res.json({ success: true, mp4Url: finalUrl });
    }

    const text = await response.text();
    const root = parse(text);

    const videoTag = root.querySelector("video");
    if (videoTag?.getAttribute("src")) {
      return res.json({
        success: true,
        mp4Url: new URL(videoTag.getAttribute("src"), finalUrl).toString()
      });
    }

    const match = text.match(/https?:\/\/[^"']+\.mp4/);
    if (match) {
      return res.json({ success: true, mp4Url: match[0] });
    }

    res.json({ success: false, error: "MP4 not found" });
  } catch (err) {
    res.status(500).json({ error: "Server error resolving URL" });
  }
});

app.listen(10000, () => console.log("Server running on port 10000"));
