const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");

// In-memory session store (replace with Redis in production)
const activeSessions = new Map();

const initSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin:      process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // ── JWT Auth middleware for sockets ──
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded  = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId  = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] User connected: ${socket.userId}`);

    // ── Start interview session ──
    socket.on("interview:start", ({ sessionId, track, difficulty }) => {
      activeSessions.set(socket.id, { sessionId, track, difficulty, userId: socket.userId, startedAt: Date.now() });
      socket.join(`session:${sessionId}`);
      socket.emit("interview:ready", { message: "Session started", sessionId });
    });

    // ── User submits an answer ──
    socket.on("interview:answer", async ({ sessionId, question, answer, qIndex }) => {
      try {
        const orchestrator = require("../../ai/orchestrator");
        const evaluation   = await orchestrator.evaluateAnswer({ question, answer });

        io.to(`session:${sessionId}`).emit("interview:feedback", {
          qIndex,
          evaluation,
        });
      } catch (err) {
        socket.emit("interview:error", { message: "Evaluation failed" });
      }
    });

    // ── End session ──
    socket.on("interview:end", ({ sessionId }) => {
      activeSessions.delete(socket.id);
      socket.leave(`session:${sessionId}`);
      socket.emit("interview:ended", { sessionId });
    });

    socket.on("disconnect", () => {
      activeSessions.delete(socket.id);
      console.log(`[Socket] User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

module.exports = { initSockets };
