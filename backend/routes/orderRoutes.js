const express = require("express");

const router = express.Router();

const orderController = require("../controllers/orderController");

const {
    verifyToken,
    isCliente,
    isRepartidor,
    isAdmin
} = require("../middleware/authMiddleware");

router.post(
    "/",
    verifyToken,
    isCliente,
    orderController.createOrder
);

router.get(
    "/mis-pedidos",
    verifyToken,
    isCliente,
    orderController.getMyOrders
);

router.get(
    "/pendientes",
    verifyToken,
    isRepartidor,
    orderController.getPendingOrders
);

router.get(
    "/mis-entregas",
    verifyToken,
    isRepartidor,
    orderController.getMyDeliveries
);

router.put(
    "/:id/aceptar",
    verifyToken,
    isRepartidor,
    orderController.acceptOrder
);

router.put(
    "/:id/rechazar",
    verifyToken,
    isRepartidor,
    orderController.rejectOrder
);

router.put(
    "/:id/estado",
    verifyToken,
    isRepartidor,
    orderController.updateOrderStatus
);

router.put(
    "/:id/confirmar-total",
    verifyToken,
    isRepartidor,
    orderController.confirmRealTotal
);

router.get(
    "/:id/historial",
    verifyToken,
    orderController.getOrderHistory
);

router.get(
    "/",
    verifyToken,
    isAdmin,
    orderController.getAllOrders
);

module.exports = router;