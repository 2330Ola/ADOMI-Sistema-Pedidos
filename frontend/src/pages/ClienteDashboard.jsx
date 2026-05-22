import { useEffect, useState } from "react";

import {
    createOrder,
    getMyOrders,
    getOrderHistory,
    confirmClientReception
} from "../services/orderService";

import { getDeliveryLocation } from "../services/locationService";

import DeliveryMap from "../components/DeliveryMap";
import OrderChat from "../components/OrderChat";
import socket from "../socket";

function ClienteDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [vista, setVista] = useState("crear");

    const [tipoServicio, setTipoServicio] = useState("restaurante");
    const [descripcion, setDescripcion] = useState("");
    const [direccion, setDireccion] = useState("");
    const [total, setTotal] = useState("");

    const [pedidos, setPedidos] = useState([]);
    const [historial, setHistorial] = useState([]);

    const [pedidoActivoSeleccionado, setPedidoActivoSeleccionado] = useState(null);
    const [pedidoHistorialSeleccionado, setPedidoHistorialSeleccionado] = useState(null);
    const [ubicacionRepartidor, setUbicacionRepartidor] = useState(null);

    const [comentariosCliente, setComentariosCliente] = useState({});

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [notificacion, setNotificacion] = useState("");
    const [cargando, setCargando] = useState(false);

    const pedidosActivos = pedidos.filter(
        (pedido) =>
            pedido.estado === "pendiente" ||
            pedido.estado === "aceptado" ||
            pedido.estado === "en camino"
    );

    const pedidosFinalizados = pedidos.filter(
        (pedido) =>
            pedido.estado === "entregado" ||
            pedido.estado === "cancelado"
    );

    const cargarPedidos = async () => {
        try {
            const data = await getMyOrders();
            const nuevosPedidos = data.pedidos || [];

            setPedidos(nuevosPedidos);

            if (pedidoActivoSeleccionado) {
                const actualizado = nuevosPedidos.find(
                    (p) => p.id === pedidoActivoSeleccionado.id
                );

                if (actualizado) {
                    if (
                        actualizado.estado === "entregado" ||
                        actualizado.estado === "cancelado"
                    ) {
                        setPedidoActivoSeleccionado(null);
                        setPedidoHistorialSeleccionado(actualizado);
                        setVista("historial");
                        await cargarHistorial(actualizado.id);
                    } else {
                        setPedidoActivoSeleccionado(actualizado);
                    }
                }
            }

            if (pedidoHistorialSeleccionado) {
                const actualizado = nuevosPedidos.find(
                    (p) => p.id === pedidoHistorialSeleccionado.id
                );

                if (actualizado) {
                    setPedidoHistorialSeleccionado(actualizado);
                }
            }

        } catch (error) {
            setError("No se pudieron cargar los pedidos");
        }
    };

    const cargarHistorial = async (pedidoId) => {
        try {
            const data = await getOrderHistory(pedidoId);
            setHistorial(data.historial || []);
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
        }
    };

    useEffect(() => {
        cargarPedidos();
    }, []);

    useEffect(() => {
        pedidos.forEach((pedido) => {
            socket.emit("joinOrderRoom", pedido.id);
        });
    }, [pedidos]);

    useEffect(() => {
        socket.on("pedidoActualizado", (pedidoActualizado) => {
            setPedidos((prevPedidos) =>
                prevPedidos.map((pedido) =>
                    pedido.id === pedidoActualizado.id
                        ? { ...pedido, ...pedidoActualizado }
                        : pedido
                )
            );

            if (
                pedidoActivoSeleccionado &&
                pedidoActivoSeleccionado.id === pedidoActualizado.id
            ) {
                const pedidoNuevo = {
                    ...pedidoActivoSeleccionado,
                    ...pedidoActualizado
                };

                if (
                    pedidoNuevo.estado === "entregado" ||
                    pedidoNuevo.estado === "cancelado"
                ) {
                    setPedidoActivoSeleccionado(null);
                    setPedidoHistorialSeleccionado(pedidoNuevo);
                    setVista("historial");
                    cargarHistorial(pedidoNuevo.id);
                } else {
                    setPedidoActivoSeleccionado(pedidoNuevo);
                }
            }

            if (
                pedidoHistorialSeleccionado &&
                pedidoHistorialSeleccionado.id === pedidoActualizado.id
            ) {
                const pedidoNuevo = {
                    ...pedidoHistorialSeleccionado,
                    ...pedidoActualizado
                };

                setPedidoHistorialSeleccionado(pedidoNuevo);
                cargarHistorial(pedidoNuevo.id);
            }

            setNotificacion(`Pedido #${pedidoActualizado.id} actualizado`);

            setTimeout(() => {
                setNotificacion("");
            }, 4000);
        });

        return () => {
            socket.off("pedidoActualizado");
        };
    }, [pedidoActivoSeleccionado, pedidoHistorialSeleccionado]);

    useEffect(() => {
        if (!pedidoActivoSeleccionado?.repartidor_id) return;

        if (
            pedidoActivoSeleccionado.estado === "entregado" ||
            pedidoActivoSeleccionado.estado === "cancelado"
        ) {
            return;
        }

        cargarUbicacion(pedidoActivoSeleccionado.repartidor_id);

        const interval = setInterval(() => {
            cargarUbicacion(pedidoActivoSeleccionado.repartidor_id);
        }, 5000);

        return () => clearInterval(interval);
    }, [pedidoActivoSeleccionado]);

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

            await cargarPedidos();
            setVista("activo");

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al crear pedido"
            );
        } finally {
            setCargando(false);
        }
    };

    const seleccionarPedidoActivo = async (pedido) => {
        setPedidoActivoSeleccionado(pedido);
        setUbicacionRepartidor(null);

        if (pedido.repartidor_id) {
            await cargarUbicacion(pedido.repartidor_id);
        }
    };

    const seleccionarPedidoHistorial = async (pedido) => {
        setPedidoHistorialSeleccionado(pedido);
        await cargarHistorial(pedido.id);
    };

    const handleConfirmarRecepcion = async (pedido, confirmacion) => {
        setMensaje("");
        setError("");

        const comentario = comentariosCliente[pedido.id] || "";

        try {
            await confirmClientReception(
                pedido.id,
                confirmacion,
                comentario
            );

            const pedidoActualizado = {
                ...pedido,
                confirmacion_cliente: confirmacion,
                comentario_cliente: comentario,
                fecha_confirmacion_cliente: new Date().toISOString()
            };

            setPedidoHistorialSeleccionado(pedidoActualizado);

            setPedidos((prevPedidos) =>
                prevPedidos.map((p) =>
                    p.id === pedido.id ? pedidoActualizado : p
                )
            );

            setMensaje("Respuesta enviada correctamente");

            setComentariosCliente({
                ...comentariosCliente,
                [pedido.id]: ""
            });

            await cargarPedidos();
            await cargarHistorial(pedido.id);

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al confirmar recepción"
            );
        }
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
                <div className="container-fluid px-4">
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

            <main className="container-fluid px-4 py-4">

                {notificacion && (
                    <div className="alert alert-info shadow-sm">
                        <i className="bi bi-bell me-2"></i>
                        {notificacion}
                    </div>
                )}

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

                <div className="card border-0 shadow-sm rounded-4 mb-4">
                    <div className="card-body p-4">
                        <h2 className="fw-bold mb-1">
                            Hola, {user?.nombre}
                        </h2>

                        <p className="text-muted mb-0">
                            Crea pedidos, sigue tus envíos activos y confirma tus entregas.
                        </p>
                    </div>
                </div>

                <div className="row g-3 mb-4">

                    <div className="col-12 col-md-4">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "crear" ? "border border-primary" : ""
                            }`}
                            onClick={() => setVista("crear")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-primary mb-2">
                                    <i className="bi bi-plus-circle"></i>
                                </div>

                                <h5 className="fw-bold">
                                    Crear pedido
                                </h5>

                                <p className="text-muted mb-0">
                                    Inicia un nuevo pedido.
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="col-12 col-md-4">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "activo" ? "border border-warning" : ""
                            }`}
                            onClick={() => setVista("activo")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-warning mb-2">
                                    <i className="bi bi-truck"></i>
                                </div>

                                <h5 className="fw-bold">
                                    Pedido en curso
                                </h5>

                                <p className="text-muted mb-0">
                                    {pedidosActivos.length} pedido(s) activo(s).
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="col-12 col-md-4">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "historial" ? "border border-success" : ""
                            }`}
                            onClick={() => setVista("historial")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-success mb-2">
                                    <i className="bi bi-clock-history"></i>
                                </div>

                                <h5 className="fw-bold">
                                    Historial
                                </h5>

                                <p className="text-muted mb-0">
                                    {pedidosFinalizados.length} pedido(s) finalizado(s).
                                </p>
                            </div>
                        </button>
                    </div>

                </div>

                {vista === "crear" && (
                    <div className="row justify-content-center">
                        <div className="col-12 col-xl-7">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">

                                    <h4 className="fw-bold mb-3">
                                        <i className="bi bi-plus-circle me-2 text-primary"></i>
                                        Crear nuevo pedido
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
                                                    Supermercado
                                                </option>
                                            </select>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Descripción
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
                                                Dirección
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Dirección de entrega"
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
                                        </div>

                                        <button
                                            className="btn btn-primary w-100 py-2 fw-semibold"
                                            disabled={cargando}
                                        >
                                            {cargando ? "Creando..." : "Crear pedido"}
                                        </button>

                                    </form>

                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {vista === "activo" && (
                    <div className="row g-4">

                        <div className="col-12 col-xl-5">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h4 className="fw-bold mb-0">
                                            Pedidos en curso
                                        </h4>

                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={cargarPedidos}
                                        >
                                            Actualizar
                                        </button>
                                    </div>

                                    {pedidosActivos.length === 0 ? (
                                        <p className="text-muted text-center py-4">
                                            No tienes pedidos activos.
                                        </p>
                                    ) : (
                                        pedidosActivos.map((pedido) => (
                                            <button
                                                key={pedido.id}
                                                className={`card w-100 text-start border-0 shadow-sm rounded-4 mb-3 ${
                                                    pedidoActivoSeleccionado?.id === pedido.id
                                                        ? "border border-primary"
                                                        : ""
                                                }`}
                                                onClick={() => seleccionarPedidoActivo(pedido)}
                                            >
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <h5 className="fw-bold mb-1">
                                                                Pedido #{pedido.id}
                                                            </h5>

                                                            <p className="text-muted mb-1 text-capitalize">
                                                                {pedido.tipo_servicio}
                                                            </p>
                                                        </div>

                                                        <span className={getEstadoBadge(pedido.estado)}>
                                                            {pedido.estado}
                                                        </span>
                                                    </div>

                                                    <p className="mb-2">
                                                        {pedido.descripcion}
                                                    </p>

                                                    <small className="text-muted">
                                                        Total estimado: Q {pedido.total}
                                                    </small>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-7">
                            {!pedidoActivoSeleccionado ? (
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-5 text-center">
                                        <i className="bi bi-truck fs-1 text-muted"></i>

                                        <p className="text-muted mt-3 mb-0">
                                            Selecciona un pedido en curso para ver mapa, chat y detalle.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <div>
                                                    <h4 className="fw-bold mb-1">
                                                        Pedido #{pedidoActivoSeleccionado.id}
                                                    </h4>

                                                    <p className="text-muted mb-0">
                                                        {pedidoActivoSeleccionado.direccion}
                                                    </p>
                                                </div>

                                                <span className={getEstadoBadge(pedidoActivoSeleccionado.estado)}>
                                                    {pedidoActivoSeleccionado.estado}
                                                </span>
                                            </div>

                                            <div className="row g-3">
                                                <div className="col-12 col-md-4">
                                                    <div className="bg-light rounded-4 p-3">
                                                        <small className="text-muted">
                                                            Estimado
                                                        </small>

                                                        <h5 className="fw-bold mb-0">
                                                            Q {pedidoActivoSeleccionado.total}
                                                        </h5>
                                                    </div>
                                                </div>

                                                <div className="col-12 col-md-4">
                                                    <div className="bg-light rounded-4 p-3">
                                                        <small className="text-muted">
                                                            Real
                                                        </small>

                                                        <h5 className="fw-bold mb-0">
                                                            {pedidoActivoSeleccionado.total_real
                                                                ? `Q ${pedidoActivoSeleccionado.total_real}`
                                                                : "Pendiente"}
                                                        </h5>
                                                    </div>
                                                </div>

                                                <div className="col-12 col-md-4">
                                                    <div className="bg-light rounded-4 p-3">
                                                        <small className="text-muted">
                                                            Diferencia
                                                        </small>

                                                        <h5 className="fw-bold mb-0">
                                                            {getDiferencia(pedidoActivoSeleccionado.diferencia)}
                                                        </h5>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                                        <div className="card-body p-4">
                                            <h4 className="fw-bold mb-3">
                                                <i className="bi bi-geo-alt me-2 text-success"></i>
                                                Ubicación del repartidor
                                            </h4>

                                            {!pedidoActivoSeleccionado.repartidor_id ? (
                                                <p className="text-muted mb-0">
                                                    Aún no hay repartidor asignado.
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

                                    <div className="card border-0 shadow-sm rounded-4">
                                        <div className="card-body p-4">
                                            <h4 className="fw-bold mb-3">
                                                <i className="bi bi-chat-dots me-2 text-dark"></i>
                                                Chat con repartidor
                                            </h4>

                                            {!pedidoActivoSeleccionado.repartidor_id ? (
                                                <p className="text-muted mb-0">
                                                    El chat estará disponible cuando un repartidor acepte el pedido.
                                                </p>
                                            ) : (
                                                <OrderChat pedidoId={pedidoActivoSeleccionado.id} />
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                    </div>
                )}

                {vista === "historial" && (
                    <div className="row g-4">

                        <div className="col-12 col-xl-5">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">

                                    <h4 className="fw-bold mb-3">
                                        Historial de pedidos
                                    </h4>

                                    {pedidosFinalizados.length === 0 ? (
                                        <p className="text-muted text-center py-4">
                                            Aún no tienes pedidos finalizados.
                                        </p>
                                    ) : (
                                        pedidosFinalizados.map((pedido) => (
                                            <button
                                                key={pedido.id}
                                                className={`card w-100 text-start border-0 shadow-sm rounded-4 mb-3 ${
                                                    pedidoHistorialSeleccionado?.id === pedido.id
                                                        ? "border border-success"
                                                        : ""
                                                }`}
                                                onClick={() => seleccionarPedidoHistorial(pedido)}
                                            >
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <h5 className="fw-bold mb-1">
                                                                Pedido #{pedido.id}
                                                            </h5>

                                                            <p className="text-muted mb-1 text-capitalize">
                                                                {pedido.tipo_servicio}
                                                            </p>
                                                        </div>

                                                        <span className={getEstadoBadge(pedido.estado)}>
                                                            {pedido.estado}
                                                        </span>
                                                    </div>

                                                    <small className="text-muted">
                                                        Total: Q {pedido.total_real || pedido.total}
                                                    </small>
                                                </div>
                                            </button>
                                        ))
                                    )}

                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-7">

                            {!pedidoHistorialSeleccionado ? (
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-5 text-center">
                                        <i className="bi bi-receipt fs-1 text-muted"></i>

                                        <p className="text-muted mt-3 mb-0">
                                            Selecciona un pedido finalizado para confirmar recibido o reportar problema.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                                        <div className="card-body p-4">
                                            <h4 className="fw-bold mb-3">
                                                Comprobante de entrega
                                            </h4>

                                            {pedidoHistorialSeleccionado.estado === "cancelado" ? (
                                                <div className="alert alert-danger mb-0">
                                                    Este pedido fue cancelado.
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="mb-2">
                                                        <strong>Pedido:</strong> #{pedidoHistorialSeleccionado.id}
                                                    </p>

                                                    <p className="mb-2">
                                                        <strong>Observación repartidor:</strong>{" "}
                                                        {pedidoHistorialSeleccionado.observacion_entrega || "Sin observación"}
                                                    </p>

                                                    <p className="mb-3">
                                                        <strong>Fecha entrega:</strong>{" "}
                                                        {pedidoHistorialSeleccionado.fecha_entrega
                                                            ? new Date(pedidoHistorialSeleccionado.fecha_entrega).toLocaleString()
                                                            : "Sin fecha"}
                                                    </p>

                                                    {pedidoHistorialSeleccionado.confirmacion_cliente ? (
                                                        <div className="alert alert-info mb-0">
                                                            <p className="mb-2">
                                                                <strong>Respuesta enviada:</strong>{" "}
                                                                {pedidoHistorialSeleccionado.confirmacion_cliente === "confirmado"
                                                                    ? "Pedido recibido correctamente"
                                                                    : "Problema reportado"}
                                                            </p>

                                                            {pedidoHistorialSeleccionado.comentario_cliente && (
                                                                <p className="mb-0">
                                                                    <strong>Comentario:</strong>{" "}
                                                                    {pedidoHistorialSeleccionado.comentario_cliente}
                                                                </p>
                                                            )}

                                                            {pedidoHistorialSeleccionado.fecha_confirmacion_cliente && (
                                                                <small className="text-muted">
                                                                    {new Date(
                                                                        pedidoHistorialSeleccionado.fecha_confirmacion_cliente
                                                                    ).toLocaleString()}
                                                                </small>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <textarea
                                                                className="form-control mb-3"
                                                                rows="3"
                                                                placeholder="Comentario opcional o describa el problema"
                                                                value={
                                                                    comentariosCliente[pedidoHistorialSeleccionado.id] || ""
                                                                }
                                                                onChange={(e) =>
                                                                    setComentariosCliente({
                                                                        ...comentariosCliente,
                                                                        [pedidoHistorialSeleccionado.id]: e.target.value
                                                                    })
                                                                }
                                                            ></textarea>

                                                            <div className="d-flex flex-column flex-md-row gap-2">
                                                                <button
                                                                    className="btn btn-success"
                                                                    onClick={() =>
                                                                        handleConfirmarRecepcion(
                                                                            pedidoHistorialSeleccionado,
                                                                            "confirmado"
                                                                        )
                                                                    }
                                                                >
                                                                    Confirmar recibido
                                                                </button>

                                                                <button
                                                                    className="btn btn-danger"
                                                                    onClick={() =>
                                                                        handleConfirmarRecepcion(
                                                                            pedidoHistorialSeleccionado,
                                                                            "problema"
                                                                        )
                                                                    }
                                                                >
                                                                    Reportar problema
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card border-0 shadow-sm rounded-4">
                                        <div className="card-body p-4">
                                            <h4 className="fw-bold mb-3">
                                                Historial del pedido
                                            </h4>

                                            {historial.length === 0 ? (
                                                <p className="text-muted mb-0">
                                                    Este pedido aún no tiene historial.
                                                </p>
                                            ) : (
                                                <ul className="list-group list-group-flush">
                                                    {historial.map((item) => (
                                                        <li
                                                            className="list-group-item"
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

                                                            <p className="mt-2 mb-0">
                                                                {item.comentario}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                        </div>

                    </div>
                )}

            </main>

        </div>
    );
}

export default ClienteDashboard;