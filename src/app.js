require("dotenv").config();
const express    = require("express");
const http       = require("http");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const session    = require("express-session");
const passport   = require("./config/passport");

const path             = require("path");
const connectDB        = require("./config/db");
const { initSockets }  = require("./sockets/interview.socket");
const errorHandler     = require("./middleware/errorHandler");

// ── Routes ──
const authRoutes      = require("./routes/auth.routes");
const resumeRoutes    = require("./routes/resume.routes");
const aiRoutes        = require("./routes/ai.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const interviewRoutes = require("./routes/interview.routes");
const adminRoutes     = require("./routes/admin.routes");
const feedbackRoutes  = require("./routes/feedback.routes");

const app    = express();
const server = http.createServer(app);

// ── Connect Database ──
connectDB();

// ── Init Socket.io ──
initSockets(server);

// ── Global Middleware ──
app.use(helmet({
  contentSecurityPolicy: false,   // allow OAuth redirects
  crossOriginOpenerPolicy: false, // allow Google popup flow
}));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Session (required for OAuth state) ──
app.use(session({
  secret: process.env.JWT_SECRET || "session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 10 * 60 * 1000 }, // 10 min — only needed during OAuth handshake
}));
app.use(passport.initialize());
app.use(passport.session());

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── API Routes ──
app.use("/api/auth",      authRoutes);
app.use("/api/resume",    resumeRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/admin",     adminRoutes);
app.use("/api/feedback",  feedbackRoutes);

// ── Serve Uploaded Resumes (admin access via static URL) ──
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, timestamp: new Date() });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ──
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = { app, server };
