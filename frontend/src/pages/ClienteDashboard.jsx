import { useEffect, useState } from "react";

import {
    createOrder,
    getMyOrders,
    getOrderHistory
} from "../services/orderService";

import { getDeliveryLocation } from "../services/locationService";

import DeliveryMap from "../components/DeliveryMap";

function ClienteDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [tipoServicio, setTipoServicio] = useState("restaurante");
    const [descripcion, setDescripcion] = useState("");
    const [direccion, setDireccion] = useState("");
    const [total, setTotal] = useState("");

    const [pedidos, setPedidos] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    const [pedidoMapa, setPedidoMapa] = useState(null);
    const [ubicacionRepartidor, setUbicacionRepartidor] = useState(null);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    const cargarPedidos = async () => {
        try {
            const data = await getMyOrders();
            setPedidos(data.pedidos);
        } catch (error) {
            setError("No se pudieron cargar los pedidos");
        }
    };

    const cargarHistorial = async (pedidoId) => {
        try {
            const data = await getOrderHistory(pedidoId);
            setHistorial(data.historial);
        } catch (error) {
            setError("No se pudo cargar el historial");
        }
    };

    const cargarUbicacion = async (repartidorId) => {
        try {
            const data = await getDeliveryLocation(repartidorId);
            setUbicacionRepartidor(data.ubicacion);
        } catch (error) {
            setUbicacionRepartidor(null);
            setError("Ubicación del repartidor no disponible");
        }
    };

    useEffect(() => {
        cargarPedidos();

        const interval = setInterval(() => {
            cargarPedidos();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!pedidoSeleccionado) return;

        cargarHistorial(pedidoSeleccionado.id);

        const interval = setInterval(() => {
            cargarHistorial(pedidoSeleccionado.id);
            cargarPedidos();
        }, 5000);

        return () => clearInterval(interval);
    }, [pedidoSeleccionado]);

    useEffect(() => {
        if (!pedidoMapa || !pedidoMapa.repartidor_id) return;

        cargarUbicacion(pedidoMapa.repartidor_id);

        const interval = setInterval(() => {
            cargarUbicacion(pedidoMapa.repartidor_id);
        }, 5000);

        return () => clearInterval(interval);
    }, [pedidoMapa]);

    const handleCrearPedido = async (e) => {
        e.preventDefault();

        setMensaje("");
        setError("");
        setCargando(true);

        try {
            await createOrder({
                tipo_servicio: tipoServicio,
                descripcion,
                direccion,
                total: Number(total)
            });

            setMensaje("Pedido creado correctamente");

            setDescripcion("");
            setDireccion("");
            setTotal("");
            setTipoServicio("restaurante");

            cargarPedidos();

        } catch (error) {
            setError(
                error.response?.data?.message || "Error al crear pedido"
            );
        } finally {
            setCargando(false);
        }
    };

    const verHistorial = async (pedido) => {
        setError("");
        setMensaje("");
        setPedidoSeleccionado(pedido);
        await cargarHistorial(pedido.id);
    };

    const verMapa = async (pedido) => {
        setError("");
        setMensaje("");
        setPedidoMapa(pedido);
        setUbicacionRepartidor(null);

        if (!pedido.repartidor_id) {
            setError("Este pedido aún no tiene repartidor asignado");
            return;
        }

        await cargarUbicacion(pedido.repartidor_id);
    };

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    const getEstadoBadge = (estado) => {
        if (estado === "pendiente") return "badge bg-secondary";
        if (estado === "aceptado") return "badge bg-primary";
        if (estado === "en camino") return "badge bg-warning text-dark";
        if (estado === "entregado") return "badge bg-success";
        if (estado === "cancelado") return "badge bg-danger";

        return "badge bg-dark";
    };

    const getDiferencia = (diferencia) => {
        if (diferencia === null || diferencia === undefined) {
            return "Pendiente";
        }

        if (Number(diferencia) > 0) {
            return (
                <span className="text-danger fw-bold">
                    + Q {diferencia}
                </span>
            );
        }

        if (Number(diferencia) < 0) {
            return (
                <span className="text-success fw-bold">
                    Q {diferencia}
                </span>
            );
        }

        return (
            <span className="text-secondary fw-bold">
                Q 0.00
            </span>
        );
    };

    return (
        <div className="min-vh-100 bg-light">

            <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
                <div className="container">
                    <span className="navbar-brand fw-bold">
                        <i className="bi bi-bag-check me-2"></i>
                        ADOMI Cliente
                    </span>

                    <div className="d-flex align-items-center gap-3">
                        <span className="text-white d-none d-md-block">
                            {user?.nombre}
                        </span>

                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={cerrarSesion}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </nav>

            <main className="container py-4">

                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <h2 className="fw-bold mb-1">
                                    Bienvenido, {user?.nombre}
                                </h2>

                                <p className="text-muted mb-0">
                                    Desde este panel puedes crear pedidos, revisar estados y ver la ubicación del repartidor.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {mensaje && (
                    <div className="alert alert-success">
                        {mensaje}
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger">
                        {error}
                    </div>
                )}

                <div className="row g-4">

                    <div className="col-12 col-lg-5">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">

                                <h4 className="fw-bold mb-3">
                                    <i className="bi bi-plus-circle me-2 text-primary"></i>
                                    Crear pedido
                                </h4>

                                <form onSubmit={handleCrearPedido}>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            Tipo de servicio
                                        </label>

                                        <select
                                            className="form-select"
                                            value={tipoServicio}
                                            onChange={(e) => setTipoServicio(e.target.value)}
                                        >
                                            <option value="restaurante">
                                                Restaurante
                                            </option>

                                            <option value="supermercado">
                                                Supermercado / Abarrotes
                                            </option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            Descripción del pedido
                                        </label>

                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            placeholder="Ejemplo: 2 hamburguesas, 1 gaseosa..."
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            Dirección de entrega
                                        </label>

                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Ejemplo: Barrio San Francisco, Jalapa"
                                            value={direccion}
                                            onChange={(e) => setDireccion(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold">
                                            Total estimado
                                        </label>

                                        <div className="input-group">
                                            <span className="input-group-text">
                                                Q
                                            </span>

                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="65.00"
                                                value={total}
                                                onChange={(e) => setTotal(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <small className="text-muted">
                                            Este valor puede cambiar cuando el repartidor confirme el total real.
                                        </small>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 py-2 fw-semibold"
                                        disabled={cargando}
                                    >
                                        {cargando ? "Creando pedido..." : "Crear pedido"}
                                    </button>

                                </form>

                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    <i className="bi bi-clock-history me-2 text-primary"></i>
                                    Historial
                                </h4>

                                {!pedidoSeleccionado ? (
                                    <p className="text-muted mb-0">
                                        Selecciona un pedido para ver su historial.
                                    </p>
                                ) : (
                                    <>
                                        <p className="fw-semibold">
                                            Pedido #{pedidoSeleccionado.id}
                                        </p>

                                        {historial.length === 0 ? (
                                            <p className="text-muted">
                                                Este pedido aún no tiene historial.
                                            </p>
                                        ) : (
                                            <ul className="list-group list-group-flush">
                                                {historial.map((item) => (
                                                    <li
                                                        className="list-group-item px-0"
                                                        key={item.id}
                                                    >
                                                        <div className="d-flex justify-content-between gap-2">
                                                            <span className={getEstadoBadge(item.estado)}>
                                                                {item.estado}
                                                            </span>

                                                            <small className="text-muted">
                                                                {new Date(item.fecha).toLocaleString()}
                                                            </small>
                                                        </div>

                                                        <p className="mb-0 mt-2">
                                                            {item.comentario}
                                                        </p>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 mt-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    <i className="bi bi-geo-alt me-2 text-success"></i>
                                    Ubicación del repartidor
                                </h4>

                                {!pedidoMapa ? (
                                    <p className="text-muted mb-0">
                                        Selecciona un pedido con repartidor asignado para ver el mapa.
                                    </p>
                                ) : !ubicacionRepartidor ? (
                                    <p className="text-muted mb-0">
                                        Ubicación no disponible.
                                    </p>
                                ) : (
                                    <DeliveryMap
                                        latitud={ubicacionRepartidor.latitud}
                                        longitud={ubicacionRepartidor.longitud}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-lg-7">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">
                                        <i className="bi bi-list-check me-2 text-primary"></i>
                                        Mis pedidos
                                    </h4>

                                    <button
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={cargarPedidos}
                                    >
                                        Actualizar
                                    </button>
                                </div>

                                {pedidos.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-inbox fs-1 text-muted"></i>
                                        <p className="text-muted mt-3">
                                            Aún no tienes pedidos registrados.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table align-middle">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Servicio</th>
                                                    <th>Estado</th>
                                                    <th>Estimado</th>
                                                    <th>Real</th>
                                                    <th>Diferencia</th>
                                                    <th>Historial</th>
                                                    <th>Mapa</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {pedidos.map((pedido) => (
                                                    <tr key={pedido.id}>
                                                        <td>
                                                            #{pedido.id}
                                                        </td>

                                                        <td className="text-capitalize">
                                                            {pedido.tipo_servicio}
                                                        </td>

                                                        <td>
                                                            <span className={getEstadoBadge(pedido.estado)}>
                                                                {pedido.estado}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            Q {pedido.total}
                                                        </td>

                                                        <td>
                                                            {pedido.total_real
                                                                ? `Q ${pedido.total_real}`
                                                                : "Pendiente"}
                                                        </td>

                                                        <td>
                                                            {getDiferencia(pedido.diferencia)}
                                                        </td>

                                                        <td>
                                                            <button
                                                                className="btn btn-outline-primary btn-sm"
                                                                onClick={() => verHistorial(pedido)}
                                                            >
                                                                Ver
                                                            </button>
                                                        </td>

                                                        <td>
                                                            <button
                                                                className="btn btn-outline-success btn-sm"
                                                                onClick={() => verMapa(pedido)}
                                                                disabled={!pedido.repartidor_id}
                                                            >
                                                                Mapa
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>

                </div>

            </main>

        </div>
    );
}

export default ClienteDashboard;