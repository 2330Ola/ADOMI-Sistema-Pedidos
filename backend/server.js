const express = require("express");
const cors = require("cors");
const http = require("http");

const { Server } = require("socket.io");

require("./config/db");

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const locationRoutes = require("./routes/locationRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    }
});

app.set("io", io);

app.use(cors());
app.use(express.json());


// =========================
// SOCKET.IO
// =========================

io.on("connection", (socket) => {

    console.log("Cliente conectado:", socket.id);

    socket.on("joinOrderRoom", (pedidoId) => {
        socket.join(`pedido_${pedidoId}`);

        console.log(
            `Socket ${socket.id} unido al pedido ${pedidoId}`
        );
    });

    socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);
    });
});


// =========================
// RUTAS
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/messages", messageRoutes);


// =========================
// HOME
// =========================

app.get("/", (req, res) => {
    res.send("Servidor ADOMI funcionando");
});


// =========================
// SERVIDOR
// =========================

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});