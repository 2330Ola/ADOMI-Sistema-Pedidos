import { useEffect, useState } from "react";
import { loginUser } from "../services/authService";

function Login() {
    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userData = localStorage.getItem("user");

        if (token && userData) {
            try {
                const user = JSON.parse(userData);

                if (user.rol === "admin") {
                    window.location.href = "/admin";
                } else if (user.rol === "cliente") {
                    window.location.href = "/cliente";
                } else if (user.rol === "repartidor") {
                    window.location.href = "/repartidor";
                }
            } catch (error) {
                localStorage.clear();
            }
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();

        setMensaje("");
        setCargando(true);

        try {
            const data = await loginUser(correo, password);

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            if (data.user.rol === "admin") {
                window.location.href = "/admin";
            } else if (data.user.rol === "cliente") {
                window.location.href = "/cliente";
            } else if (data.user.rol === "repartidor") {
                window.location.href = "/repartidor";
            } else {
                setMensaje("Rol no reconocido");
            }

        } catch (error) {
            setMensaje(
                error.response?.data?.message || "Error al iniciar sesión"
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
                                        className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                        style={{ width: "75px", height: "75px" }}
                                    >
                                        <i className="bi bi-bag-check fs-1"></i>
                                    </div>

                                    <h2 className="fw-bold mb-1">
                                        ADOMI
                                    </h2>

                                    <p className="text-muted">
                                        Sistema de gestión de pedidos a domicilio
                                    </p>
                                </div>

                                {mensaje && (
                                    <div className="alert alert-danger text-center">
                                        {mensaje}
                                    </div>
                                )}

                                <form onSubmit={handleLogin}>

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
                                                placeholder="Ingrese su contraseña"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 py-2 fw-semibold"
                                        disabled={cargando}
                                    >
                                        {cargando ? "Ingresando..." : "Iniciar sesión"}
                                    </button>

                                </form>

                                <div className="text-center mt-4">
                                 <button
                                    className="btn btn-link text-decoration-none"
                                    onClick={() => window.location.href = "/registro"}
                                    >
                                     Crear cuenta nueva
                                  </button>
                                </div>

                                <hr className="my-4" />

                                <div className="small text-muted">
                                    
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Login;