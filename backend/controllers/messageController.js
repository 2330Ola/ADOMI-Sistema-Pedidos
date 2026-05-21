const messageModel = require("../models/messageModel");

const createMessage = (req, res) => {
    const usuarioId = req.user.id;
    const pedidoId = req.params.pedidoId;

    const { mensaje } = req.body || {};

    if (!mensaje) {
        return res.status(400).json({
            message: "El mensaje es obligatorio"
        });
    }

    messageModel.createMessage(
        pedidoId,
        usuarioId,
        mensaje,
        (err, result) => {
            if (err) {
                return res.status(500).json({
                    message: "Error al enviar mensaje",
                    error: err
                });
            }

            res.status(201).json({
                message: "Mensaje enviado correctamente",
                mensaje_id: result.insertId
            });
        }
    );
};

const getMessagesByOrder = (req, res) => {
    const pedidoId = req.params.pedidoId;

    messageModel.getMessagesByOrder(pedidoId, (err, results) => {
        if (err) {
            return res.status(500).json({
                message: "Error al obtener mensajes",
                error: err
            });
        }

        res.json({
            message: "Mensajes del pedido",
            mensajes: results
        });
    });
};

module.exports = {
    createMessage,
    getMessagesByOrder
};