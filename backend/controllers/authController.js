const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const userModel = require("../models/userModel");


// REGISTRO
const register = async (req, res) => {

    const {
        nombre,
        correo,
        password,
        rol
    } = req.body || {};

    if (!nombre || !correo || !password || !rol) {
        return res.status(400).json({
            message: "Todos los campos son obligatorios"
        });
    }

    try {

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        userModel.createUser(
            nombre,
            correo,
            hashedPassword,
            rol,

            (err) => {

                if (err) {

                    if (err.code === "ER_DUP_ENTRY") {
                        return res.status(400).json({
                            message: "El correo ya está registrado"
                        });
                    }

                    return res.status(500).json({
                        message: "Error al registrar usuario",
                        error: err
                    });

                }

                res.status(201).json({
                    message: "Usuario registrado correctamente"
                });

            }
        );

    } catch (error) {

        res.status(500).json({
            message: "Error servidor",
            error
        });

    }

};


// LOGIN
const login = (req, res) => {

    const {
        correo,
        password
    } = req.body || {};

    if (!correo || !password) {
        return res.status(400).json({
            message: "Correo y contraseña son obligatorios"
        });
    }

    userModel.findUserByEmail(
        correo,

        async (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Error servidor"
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    message: "Usuario no encontrado"
                });

            }

            const user = results[0];

            const validPassword = await bcrypt.compare(
                password,
                user.password
            );

            if (!validPassword) {

                return res.status(401).json({
                    message: "Contraseña incorrecta"
                });

            }

            if (user.estado === "inactivo") {
                return res.status(403).json({
                    message: "Usuario inactivo. Contacte al administrador."
                });
            }

            const token = jwt.sign(

                {
                    id: user.id,
                    rol: user.rol
                },

                "secretKey",

                {
                    expiresIn: "8h"
                }

            );

            res.status(200).json({

                message: "Login exitoso",

                token,

                user: {
                    id: user.id,
                    nombre: user.nombre,
                    correo: user.correo,
                    rol: user.rol,
                    estado: user.estado
                }

            });

        }

    );

};

module.exports = {
    register,
    login
};