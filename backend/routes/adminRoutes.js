const express = require("express");

const router = express.Router();

const adminController = require("../controllers/adminController");

const {
    verifyToken,
    isAdmin
} = require("../middleware/authMiddleware");

router.get(
    "/usuarios",
    verifyToken,
    isAdmin,
    adminController.getAllUsers
);

router.get(
    "/clientes",
    verifyToken,
    isAdmin,
    adminController.getClients
);

router.get(
    "/repartidores",
    verifyToken,
    isAdmin,
    adminController.getDeliveryUsers
);

router.put(
    "/usuarios/:id/estado",
    verifyToken,
    isAdmin,
    adminController.updateUserStatus
);

router.get(
    "/dashboard",
    verifyToken,
    isAdmin,
    adminController.getDashboardStats
);

module.exports = router;