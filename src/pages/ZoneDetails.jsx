import { useParams } from "react-router-dom";
import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  Divider,
  Chip,
  Grid,
  Paper
} from "@mui/material";
import DeskIcon from "@mui/icons-material/Desk";
import { useState } from "react";
import checklistbyzone from "../data/checklistbyzone";

/* ------------------ Helpers ------------------ */

const scoreFromSimilarity = (percent) => {
  if (percent >= 95) return 5;
  if (percent >= 90) return 4;
  if (percent >= 85) return 3;
  if (percent >= 80) return 2;
  return 1;
};

/* ------------------ Component ------------------ */

export default function ZoneDetails() {
  const { id } = useParams();
  const zoneChecklist = checklistbyzone[Number(id)];

  const [similarityMap, setSimilarityMap] = useState({});
  const [scores, setScores] = useState({});
  const [uploadedImages, setUploadedImages] = useState({});
  const [uploadedFileNames, setUploadedFileNames] = useState({});
  const [heatmapMap, setHeatmapMap] = useState({});

  /* ---------- IMAGE UPLOAD ---------- */
  const handleImageUpload = async (file, sectionIndex, referenceImage) => {
    if (!file || !referenceImage) return;

    const previewUrl = URL.createObjectURL(file);
    setUploadedImages((prev) => ({
      ...prev,
      [sectionIndex]: previewUrl
    }));

    const formData = new FormData();
    formData.append("image", file);
    formData.append("referenceImage", referenceImage);

    const res = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    setSimilarityMap((prev) => ({
      ...prev,
      [sectionIndex]: data.similarityPercentage
    }));

    setHeatmapMap((prev) => ({
      ...prev,
      [sectionIndex]: data.heatmapImage
    }));

    setUploadedFileNames((prev) => ({
      ...prev,
      [sectionIndex]: data.uploadedFileName
    }));
  };

  const handleScoreOverride = (questionId, value) => {
    setScores((prev) => ({
      ...prev,
      [questionId]: value
    }));
  };

  const submitAudit = async (section, sectionIndex, finalScore) => {
    await fetch("http://localhost:5000/submit-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zoneId: id,
        sectionName: section.section,
        similarity: similarityMap[sectionIndex],
        autoScore: scoreFromSimilarity(similarityMap[sectionIndex]),
        finalScore,
        questionOverrides: scores,
        referenceImage:
          section.referenceImage ||
          section.questions?.[0]?.referenceImage,
        actualImagePath: `uploads/${uploadedFileNames[sectionIndex]}`
      })
    });

    alert("✅ Audit submitted");
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* HEADER */}
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <DeskIcon fontSize="large" />
        <Typography variant="h5">Security Desk</Typography>
      </Stack>

      {zoneChecklist.map((section, sectionIndex) => {
        const questions =
          section.questions ||
          section.criteria ||
          section.items ||
          [];

        const similarity = similarityMap[sectionIndex];
        const autoScore =
          similarity !== undefined
            ? scoreFromSimilarity(similarity)
            : "--";

        const finalScore =
          similarity && questions.length
            ? (
                questions.reduce(
                  (sum, q, i) =>
                    sum + (scores[q.id ?? i] ?? autoScore),
                  0
                ) / questions.length
              ).toFixed(1)
            : "--";

        return (
          <Grid container spacing={4} key={sectionIndex}>
            {/* LEFT: CHECKLIST */}
            <Grid item xs={12} md={7}>
              {questions.map((q, idx) => (
                <Paper
                  key={idx}
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 2
                  }}
                >
                  <Typography fontWeight={600} mb={1}>
                    {q.pillar || q.name || q.category}:
                    <Typography component="span" fontWeight={400}>
                      {" "}
                      {q.text || q.label}
                    </Typography>
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <Button
                        key={val}
                        size="small"
                        variant={
                          scores[q.id ?? idx] === val
                            ? "contained"
                            : "outlined"
                        }
                        onClick={() =>
                          handleScoreOverride(q.id ?? idx, val)
                        }
                      >
                        {val}
                      </Button>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Grid>

            {/* RIGHT: IMAGES + SCORES */}
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  component="label"
                >
                  Upload Actual Image
                  <input
                    type="file"
                    hidden
                    onChange={(e) =>
                      handleImageUpload(
                        e.target.files[0],
                        sectionIndex,
                        section.referenceImage
                      )
                    }
                  />
                </Button>

                <Stack direction="row" spacing={1}>
                  <img
                    src={section.referenceImage}
                    width={220}
                  />
                  {uploadedImages[sectionIndex] && (
                    <Box position="relative">
                      <img
                        src={uploadedImages[sectionIndex]}
                        width={220}
                      />
                      {heatmapMap[sectionIndex] && (
                        <img
                          src={`http://localhost:5000${heatmapMap[sectionIndex]}`}
                          width={220}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            opacity: 0.6
                          }}
                        />
                      )}
                    </Box>
                  )}
                </Stack>

                <Stack direction="row" spacing={1}>
                  <Chip label={`Similarity: ${similarity ?? "--"}%`} />
                  <Chip label={`Auto Score: ${autoScore}`} />
                  <Chip label={`Final Score: ${finalScore}`} />
                </Stack>

                {similarity && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() =>
                      submitAudit(section, sectionIndex, finalScore)
                    }
                  >
                    SUBMIT AUDIT
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        );
      })}
    </Container>
  );
}
