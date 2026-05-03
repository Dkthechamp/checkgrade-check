import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ZoneDetails from "./pages/ZoneDetails";
import { AppBar, Toolbar, Typography } from "@mui/material";

function App() {
  return (
    <BrowserRouter>
      <AppBar position="static" sx={{ bgcolor: "#4b1c1c" }}>
        <Toolbar>
          <Typography variant="h6">
            CheckGrade
          </Typography>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/zone/:id" element={<ZoneDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
