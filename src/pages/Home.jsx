import { Grid, Container, Typography } from "@mui/material";
import { zones } from "../data/zones";
import ZoneCard from "../components/ZoneCard";

export default function Home() {
  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Home
      </Typography>

      <Grid container spacing={3}>
        {zones.map((zone) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={zone.id}>
            <ZoneCard zone={zone} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
