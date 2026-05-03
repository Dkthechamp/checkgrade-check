import { Card, CardMedia, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function ZoneCard({ zone }) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/zone/${zone.id}`)}
      sx={{
        borderRadius: 2,
        cursor: "pointer",
        transition: "0.3s",
        "&:hover": { transform: "scale(1.03)" }
      }}
    >
      <CardMedia
        component="img"
        height="180"
        image={zone.image}
        alt={zone.name}
      />

      <CardContent sx={{ textAlign: "center" }}>
        <Typography fontWeight="bold">
          {zone.name}
        </Typography>
      </CardContent>
    </Card>
  );
}
