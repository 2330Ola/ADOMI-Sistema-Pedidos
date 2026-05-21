import { useState } from "react";
import { registerUser } from "../services/authService";

function Register() {
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();

        setMensaje("");
        setError("");
        setCargando(true);

        try {
            await registerUser(
                nombre,
                correo,
                password,
                "cliente"
            );

            setMensaje("Cuenta creada correctamente. Ya puedes iniciar sesión.");

            setNombre("");
            setCorreo("");
            setPassword("");

        } catch (error) {
            setError(
                error.response?.data?.message || "Error al registrar usuario"
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">

            <div className="container">

                <div className="row justify-content-center">

                    <div className="col-12 col-md-8 col-lg-5">

                        <div className="card border-0 shadow-lg rounded-4">

                            <div className="card-body p-5">

                                <div className="text-center mb-4">
                                    <div
                                        className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                        style={{ width: "75px", height: "75px" }}
                                    >
                                        <i className="bi bi-person-plus fs-1"></i>
                                    </div>

                                    <h2 className="fw-bold mb-1">
                                        Crear cuenta
                                    </h2>

                                    <p className="text-muted">
                                        Regístrate como cliente de ADOMI
                                    </p>
                                </div>

                                {mensaje && (
                                    <div className="alert alert-success text-center">
                                        {mensaje}
                                    </div>
                                )}

                                {error && (
                                    <div className="alert alert-danger text-center">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleRegister}>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            Nombre completo
                                        </label>

                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="bi bi-person"></i>
                                            </span>

                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Ingrese su nombre"
                                                value={nombre}
                                                onChange={(e) => setNombre(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            Correo electrónico
                                        </label>

                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="bi bi-envelope"></i>
                                            </span>

                                            <input
                                                type="email"
                                                className="form-control"
                                                placeholder="correo@ejemplo.com"
                                                value={correo}
                                                onChange={(e) => setCorreo(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold">
                                            Contraseña
                                        </label>

                                        <div className="input-group">
                                            <span className="input-group-text">
                                                <i className="bi bi-lock"></i>
                                            </span>

                                            <input
                                                type="password"
                                                className="form-control"
                                                placeholder="Cree una contraseña"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-success w-100 py-2 fw-semibold"
                                        disabled={cargando}
                                    >
                                        {cargando ? "Registrando..." : "Crear cuenta"}
                                    </button>

                                </form>

                                <div className="text-center mt-4">
                                    <button
                                        className="btn btn-link text-decoration-none"
                                        onClick={() => window.location.href = "/"}
                                    >
                                        Ya tengo cuenta, iniciar sesión
                                    </button>
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Register;