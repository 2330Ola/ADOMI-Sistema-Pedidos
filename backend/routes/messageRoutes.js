const express = require("express");

const router = express.Router();

const messageController = require("../controllers/messageController");

const {
    verifyToken
} = require("../middleware/authMiddleware");

router.post(
    "/pedido/:pedidoId",
    verifyToken,
    messageController.createMessage
);

router.get(
    "/pedido/:pedidoId",
    verifyToken,
    messageController.getMessagesByOrder
);

module.exports = router;