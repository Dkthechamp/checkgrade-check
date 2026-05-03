const express = require("express");
const cors = require("cors");
const multer = require("multer");
const sharp = require("sharp");
const pixelmatch = require("pixelmatch");
const { PNG } = require("pngjs");
const fs = require("fs");
const path = require("path");

const app = express();

/* ===============================
   🔹 MIDDLEWARE
   =============================== */
app.use(cors()); // 🔥 REQUIRED for frontend → backend
app.use(express.json());

/* ===============================
   🔹 STATIC FILES
   =============================== */
const uploadDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadDir));
app.use("/public", express.static(path.join(__dirname, "..", "public")));

/* ===============================
   🔹 ENSURE UPLOAD DIR
   =============================== */
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ===============================
   🔹 MULTER CONFIG
   =============================== */
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

/* ===============================
   🔹 IMAGE COMPARISON API
   =============================== */
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    if (!req.body.referenceImage) {
      return res.status(400).json({ error: "Reference image missing" });
    }

    const uploadedPath = req.file.path;

    const referenceImagePath = path.join(
      __dirname,
      "..",
      "public",
      req.body.referenceImage
    );

    if (!fs.existsSync(referenceImagePath)) {
      return res.status(400).json({
        error: "Reference image not found",
        referenceImagePath
      });
    }

    const WIDTH = 260;
    const HEIGHT = 180;

    /* ---------- PREPROCESS ---------- */
    const preprocess = async (imgPath) =>
      sharp(imgPath)
        .resize(WIDTH, HEIGHT, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0 }
        })
        .grayscale()
        .raw()
        .toBuffer();

    const refGray = await preprocess(referenceImagePath);
    const actGray = await preprocess(uploadedPath);

    /* ---------- SIMPLE DIFFERENCE (STABLE) ---------- */
    let diffSum = 0;
    for (let i = 0; i < refGray.length; i++) {
      diffSum += Math.abs(refGray[i] - actGray[i]);
    }

    const avgDiff = diffSum / refGray.length;
    const similarityPercentage = Math.max(
      0,
      Math.min(100, Math.round(100 - avgDiff))
    );

    /* ---------- HEATMAP ---------- */
    const refPNG = PNG.sync.read(
      await sharp(referenceImagePath)
        .resize(WIDTH, HEIGHT, { fit: "contain" })
        .png()
        .toBuffer()
    );

    const actPNG = PNG.sync.read(
      await sharp(uploadedPath)
        .resize(WIDTH, HEIGHT, { fit: "contain" })
        .png()
        .toBuffer()
    );

    const diff = new PNG({ width: WIDTH, height: HEIGHT });

    pixelmatch(
      refPNG.data,
      actPNG.data,
      diff.data,
      WIDTH,
      HEIGHT,
      {
        threshold: 0.15,
        includeAA: true
      }
    );

    const heatmapName = path
      .basename(uploadedPath)
      .replace(/\.(jpg|jpeg|png)$/i, "-diff.png");

    fs.writeFileSync(
      path.join(uploadDir, heatmapName),
      PNG.sync.write(diff)
    );

    /* ---------- RESPONSE ---------- */
    res.json({
      similarityPercentage,
      heatmapImage: `/uploads/${heatmapName}`,
      uploadedFileName: path.basename(uploadedPath)
    });

  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* ===============================
   🔹 SUBMIT AUDIT (TRAINING DATA)
   =============================== */
app.post("/submit-audit", async (req, res) => {
  try {
    const {
      zoneId,
      sectionName,
      similarity,
      autoScore,
      finalScore,
      questionOverrides,
      referenceImage,
      actualImagePath
    } = req.body;

    if (!zoneId || !sectionName || !actualImagePath) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const baseDir = path.join(
      __dirname,
      "training_data",
      `zone_${zoneId}`,
      sectionName.replace(/\s+/g, "_")
    );

    fs.mkdirSync(baseDir, { recursive: true });

    const ts = Date.now();

    fs.writeFileSync(
      path.join(baseDir, `audit_${ts}.json`),
      JSON.stringify(
        { similarity, autoScore, finalScore, questionOverrides },
        null,
        2
      )
    );

    fs.copyFileSync(
      path.join(uploadDir, path.basename(actualImagePath)),
      path.join(baseDir, `actual_${ts}.jpg`)
    );

    fs.copyFileSync(
      path.join(__dirname, "..", "public", referenceImage),
      path.join(baseDir, `reference_${ts}.jpg`)
    );

    res.json({
      message: "Audit saved for learning ✅",
      trainingPath: baseDir
    });

  } catch (err) {
    console.error("❌ submit-audit failed:", err);
    res.status(500).json({ error: "Submit audit failed" });
  }
});

/* ===============================
   🔹 START SERVER
   =============================== */
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
