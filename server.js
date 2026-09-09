const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);
  
  // Exponer la instancia de Socket.io globalmente en Node
  global.io = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join a specific event room
    socket.on("join-event", (eventId) => {
      socket.join(eventId);
      console.log(`Socket ${socket.id} joined event ${eventId}`);
    });

    // Handle status updates
    socket.on("update-status", (data) => {
      // Broadcast to everyone in that event
      io.to(data.eventId).emit("status-changed", data);
    });

    // Handle judge ready signal
    socket.on("judge-ready", (data) => {
      io.to(data.eventId).emit("announcer-alert", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
