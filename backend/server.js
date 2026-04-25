const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Route modules
const authRoutes = require("./routes/auth");
const arenaRoutes = require("./routes/arenas");
const bookingRoutes = require("./routes/bookings");
const shopRoutes = require("./routes/shop");
const trainerRoutes = require("./routes/trainers");
const reviewRoutes = require("./routes/reviews");
// const matchmakingRoutes = require('./routes/matchmaking');

dotenv.config();

const app = express();

// Static files (assets)
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Uploaded files (arena images, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors());
app.use(express.json());

// Global health check for the backend
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Alleyoop backend is running" });
});
// Mount route modules (all routes share the same app and port)
app.use(authRoutes);
app.use(arenaRoutes);
app.use(bookingRoutes);
app.use(shopRoutes);
app.use(trainerRoutes);
app.use(reviewRoutes);
// app.use(matchmakingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
