import { useEffect, useState } from "react";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from "recharts";

import {
    getDashboardStats,
    getAllUsers,
    updateUserStatus,
    createDeliveryUser,
    getAllOrdersAdmin
} from "../services/adminService";

import { reactivateCancelledOrder } from "../services/orderService";

import socket from "../socket";

function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [vista, setVista] = useState("resumen");
    const [stats, setStats] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [pedidos, setPedidos] = useState([]);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const [nombreRepartidor, setNombreRepartidor] = useState("");
    const [correoRepartidor, setCorreoRepartidor] = useState("");
    const [passwordRepartidor, setPasswordRepartidor] = useState("");

    const [repartidorSeleccionado, setRepartidorSeleccionado] = useState({});

    const clientes = usuarios.filter((u) => u.rol === "cliente");
    const repartidores = usuarios.filter((u) => u.rol === "repartidor");
    const admins = usuarios.filter((u) => u.rol === "admin");

    const pedidosPendientes = pedidos.filter((p) => p.estado === "pendiente");
    const pedidosActivos = pedidos.filter(
        (p) => p.estado === "aceptado" || p.estado === "en camino"
    );
    const pedidosFinalizados = pedidos.filter(
        (p) => p.estado === "entregado" || p.estado === "cancelado"
    );

    const pedidosChartData = stats ? [
        { name: "Pendientes", cantidad: stats.pedidos_pendientes || 0, color: "#6c757d" },
        { name: "Aceptados", cantidad: stats.pedidos_aceptados || 0, color: "#0d6efd" },
        { name: "En camino", cantidad: stats.pedidos_en_camino || 0, color: "#ffc107" },
        { name: "Entregados", cantidad: stats.pedidos_entregados || 0, color: "#198754" },
        { name: "Cancelados", cantidad: stats.pedidos_cancelados || 0, color: "#dc3545" }
    ] : [];

    const usuariosChartData = [
        { name: "Clientes", value: clientes.length, color: "#0d6efd" },
        { name: "Repartidores", value: repartidores.length, color: "#198754" },
        { name: "Admins", value: admins.length, color: "#212529" }
    ];

    const cargarDashboard = async () => {
        try {
            const statsData = await getDashboardStats();
            const usuariosData = await getAllUsers();
            const pedidosData = await getAllOrdersAdmin();

            setStats(statsData.stats);
            setUsuarios(usuariosData.usuarios || []);
            setPedidos(pedidosData.pedidos || []);
        } catch (error) {
            setError("No se pudo cargar la información del administrador");
        }
    };

    useEffect(() => {
        cargarDashboard();

        const interval = setInterval(() => {
            cargarDashboard();
        }, 10000);

        return () => clearInterval(interval);
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

            setMensaje(`Pedido #${pedidoActualizado.id} actualizado`);

            setTimeout(() => {
                setMensaje("");
            }, 3000);
        });

        return () => {
            socket.off("pedidoActualizado");
        };
    }, []);

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    const handleCambiarEstado = async (usuario) => {
        setMensaje("");
        setError("");

        const nuevoEstado = usuario.estado === "activo" ? "inactivo" : "activo";

        try {
            await updateUserStatus(usuario.id, nuevoEstado);
            setMensaje("Estado actualizado correctamente");
            await cargarDashboard();
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al cambiar estado del usuario"
            );
        }
    };

    const handleCrearRepartidor = async (e) => {
        e.preventDefault();

        setMensaje("");
        setError("");

        try {
            await createDeliveryUser(
                nombreRepartidor,
                correoRepartidor,
                passwordRepartidor
            );

            setMensaje("Repartidor creado correctamente");

            setNombreRepartidor("");
            setCorreoRepartidor("");
            setPasswordRepartidor("");

            await cargarDashboard();
            setVista("repartidores");
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al crear repartidor"
            );
        }
    };

    const handleReactivarPedido = async (pedido) => {
        setMensaje("");
        setError("");

        const repartidorId = repartidorSeleccionado[pedido.id];

        if (!repartidorId) {
            setError("Debe seleccionar un repartidor para reactivar el pedido");
            return;
        }

        try {
            await reactivateCancelledOrder(pedido.id, repartidorId);

            setMensaje("Pedido reactivado correctamente");

            setRepartidorSeleccionado({
                ...repartidorSeleccionado,
                [pedido.id]: ""
            });

            await cargarDashboard();
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al reactivar pedido"
            );
        }
    };

    const getEstadoBadge = (estado) => {
        if (estado === "activo") return "badge bg-success";
        if (estado === "inactivo") return "badge bg-danger";
        if (estado === "pendiente") return "badge bg-secondary";
        if (estado === "aceptado") return "badge bg-primary";
        if (estado === "en camino") return "badge bg-warning text-dark";
        if (estado === "entregado") return "badge bg-success";
        if (estado === "cancelado") return "badge bg-danger";

        return "badge bg-dark";
    };

    const getRolBadge = (rol) => {
        if (rol === "admin") return "badge bg-dark";
        if (rol === "cliente") return "badge bg-primary";
        if (rol === "repartidor") return "badge bg-warning text-dark";

        return "badge bg-secondary";
    };

    const getConfirmacionClienteBadge = (confirmacion) => {
        if (confirmacion === "confirmado") {
            return <span className="badge bg-success">Confirmado</span>;
        }

        if (confirmacion === "problema") {
            return <span className="badge bg-danger">Problema</span>;
        }

        return <span className="badge bg-secondary">Pendiente</span>;
    };

    const mostrarDiferencia = (diferencia) => {
        if (diferencia === null || diferencia === undefined) {
            return "Pendiente";
        }

        if (Number(diferencia) > 0) {
            return <span className="text-danger fw-bold">+ Q {diferencia}</span>;
        }

        if (Number(diferencia) < 0) {
            return <span className="text-success fw-bold">Q {diferencia}</span>;
        }

        return <span className="text-secondary fw-bold">Q 0.00</span>;
    };

    const getCodigoVisualUsuario = (usuario, index) => {
        if (usuario.rol === "cliente") return `CLI-${index + 1}`;
        if (usuario.rol === "repartidor") return `REP-${index + 1}`;
        if (usuario.rol === "admin") return `ADM-${index + 1}`;
        return `USR-${index + 1}`;
    };

    const TablaUsuarios = ({ data }) => (
        <div className="table-responsive">
            <table className="table align-middle">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>ID real</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acción</th>
                    </tr>
                </thead>

                <tbody>
                    {data.map((usuario, index) => (
                        <tr key={usuario.id}>
                            <td>
                                <span className="badge bg-dark px-3 py-2">
                                    {getCodigoVisualUsuario(usuario, index)}
                                </span>
                            </td>

                            <td>#{usuario.id}</td>
                            <td>{usuario.nombre}</td>
                            <td>{usuario.correo}</td>

                            <td>
                                <span className={getRolBadge(usuario.rol)}>
                                    {usuario.rol}
                                </span>
                            </td>

                            <td>
                                <span className={getEstadoBadge(usuario.estado || "activo")}>
                                    {usuario.estado || "activo"}
                                </span>
                            </td>

                            <td>
                                <button
                                    className={
                                        usuario.estado === "inactivo"
                                            ? "btn btn-success btn-sm"
                                            : "btn btn-danger btn-sm"
                                    }
                                    onClick={() => handleCambiarEstado(usuario)}
                                >
                                    {usuario.estado === "inactivo"
                                        ? "Activar"
                                        : "Desactivar"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const TablaPedidos = ({ data }) => (
        <div className="table-responsive">
            <table className="table align-middle">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Repartidor</th>
                        <th>Servicio</th>
                        <th>Estado</th>
                        <th>Estimado</th>
                        <th>Real</th>
                        <th>Diferencia</th>
                        <th>Entrega</th>
                        <th>Confirmación cliente</th>
                        <th>Comentario cliente</th>
                        <th>Admin</th>
                    </tr>
                </thead>

                <tbody>
                    {data.map((pedido) => (
                        <tr key={pedido.id}>
                            <td>#{pedido.id}</td>

                            <td>{pedido.cliente_nombre}</td>

                            <td>{pedido.repartidor_nombre || "Sin asignar"}</td>

                            <td className="text-capitalize">
                                {pedido.tipo_servicio}
                            </td>

                            <td>
                                <span className={getEstadoBadge(pedido.estado)}>
                                    {pedido.estado}
                                </span>
                            </td>

                            <td>Q {pedido.total}</td>

                            <td>
                                {pedido.total_real
                                    ? `Q ${pedido.total_real}`
                                    : "Pendiente"}
                            </td>

                            <td>{mostrarDiferencia(pedido.diferencia)}</td>

                            <td style={{ minWidth: "220px" }}>
                                {pedido.observacion_entrega || "Pendiente"}

                                {pedido.fecha_entrega && (
                                    <small className="d-block text-muted">
                                        {new Date(pedido.fecha_entrega).toLocaleString()}
                                    </small>
                                )}
                            </td>

                            <td>
                                {getConfirmacionClienteBadge(
                                    pedido.confirmacion_cliente
                                )}

                                {pedido.fecha_confirmacion_cliente && (
                                    <small className="d-block text-muted">
                                        {new Date(
                                            pedido.fecha_confirmacion_cliente
                                        ).toLocaleString()}
                                    </small>
                                )}
                            </td>

                            <td style={{ minWidth: "250px" }}>
                                {pedido.comentario_cliente || "Sin comentario"}
                            </td>

                            <td style={{ minWidth: "260px" }}>
                                {pedido.estado === "cancelado" ? (
                                    <div className="d-flex flex-column gap-2">
                                        <select
                                            className="form-select form-select-sm"
                                            value={repartidorSeleccionado[pedido.id] || ""}
                                            onChange={(e) =>
                                                setRepartidorSeleccionado({
                                                    ...repartidorSeleccionado,
                                                    [pedido.id]: e.target.value
                                                })
                                            }
                                        >
                                            <option value="">
                                                Seleccionar repartidor
                                            </option>

                                            {repartidores.map((repartidor, index) => (
                                                <option
                                                    key={repartidor.id}
                                                    value={repartidor.id}
                                                >
                                                    REP-{index + 1} - {repartidor.nombre}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => handleReactivarPedido(pedido)}
                                        >
                                            Reactivar pedido
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-muted">
                                        Sin acción
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="min-vh-100 bg-light">

            <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
                <div className="container-fluid px-4">
                    <span className="navbar-brand fw-bold">
                        <i className="bi bi-speedometer2 me-2"></i>
                        ADOMI Admin
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
                            Panel de Administración
                        </h2>

                        <p className="text-muted mb-0">
                            Control general de usuarios, repartidores, pedidos, estadísticas y reactivación de pedidos cancelados.
                        </p>
                    </div>
                </div>

                <div className="row g-3 mb-4">

                    <div className="col-12 col-md-6 col-xl-3">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "resumen" ? "border border-dark" : ""
                            }`}
                            onClick={() => setVista("resumen")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-dark mb-2">
                                    <i className="bi bi-bar-chart"></i>
                                </div>

                                <h5 className="fw-bold">Resumen</h5>

                                <p className="text-muted mb-0">
                                    Estadísticas generales.
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="col-12 col-md-6 col-xl-3">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "clientes" ? "border border-primary" : ""
                            }`}
                            onClick={() => setVista("clientes")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-primary mb-2">
                                    <i className="bi bi-people"></i>
                                </div>

                                <h5 className="fw-bold">Clientes</h5>

                                <p className="text-muted mb-0">
                                    {clientes.length} registrado(s).
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="col-12 col-md-6 col-xl-3">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "repartidores" ? "border border-warning" : ""
                            }`}
                            onClick={() => setVista("repartidores")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-warning mb-2">
                                    <i className="bi bi-truck"></i>
                                </div>

                                <h5 className="fw-bold">Repartidores</h5>

                                <p className="text-muted mb-0">
                                    {repartidores.length} registrado(s).
                                </p>
                            </div>
                        </button>
                    </div>

                    <div className="col-12 col-md-6 col-xl-3">
                        <button
                            className={`card border-0 shadow-sm rounded-4 w-100 text-start ${
                                vista === "pedidos" ? "border border-success" : ""
                            }`}
                            onClick={() => setVista("pedidos")}
                        >
                            <div className="card-body p-4">
                                <div className="fs-1 text-success mb-2">
                                    <i className="bi bi-bag-check"></i>
                                </div>

                                <h5 className="fw-bold">Pedidos</h5>

                                <p className="text-muted mb-0">
                                    {pedidos.length} registrado(s).
                                </p>
                            </div>
                        </button>
                    </div>

                </div>

                {vista === "resumen" && (
                    <>
                        <div className="row g-3 mb-4">

                            <div className="col-12 col-md-6 col-xl-3">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body">
                                        <p className="text-muted mb-1">Clientes</p>
                                        <h3 className="fw-bold">{clientes.length}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-xl-3">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body">
                                        <p className="text-muted mb-1">Repartidores</p>
                                        <h3 className="fw-bold">{repartidores.length}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-xl-3">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body">
                                        <p className="text-muted mb-1">Pedidos</p>
                                        <h3 className="fw-bold">{pedidos.length}</h3>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6 col-xl-3">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body">
                                        <p className="text-muted mb-1">
                                            Ingresos entregados
                                        </p>

                                        <h3 className="fw-bold">
                                            Q {stats?.ingresos_entregados || "0.00"}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="row g-4">

                            <div className="col-12 col-xl-7">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-4">
                                        <h4 className="fw-bold mb-3">
                                            Estados de pedidos
                                        </h4>

                                        <div style={{ width: "100%", height: 280 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={pedidosChartData}>
                                                    <XAxis dataKey="name" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />

                                                    <Bar
                                                        dataKey="cantidad"
                                                        radius={[10, 10, 0, 0]}
                                                    >
                                                        {pedidosChartData.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={entry.color}
                                                            />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-xl-5">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-4">
                                        <h4 className="fw-bold mb-3">
                                            Usuarios por rol
                                        </h4>

                                        <div style={{ width: "100%", height: 280 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={usuariosChartData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        outerRadius={90}
                                                        label
                                                    >
                                                        {usuariosChartData.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={entry.color}
                                                            />
                                                        ))}
                                                    </Pie>

                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </>
                )}

                {vista === "clientes" && (
                    <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4">
                            <h4 className="fw-bold mb-3">Clientes</h4>
                            <TablaUsuarios data={clientes} />
                        </div>
                    </div>
                )}

                {vista === "repartidores" && (
                    <div className="row g-4">

                        <div className="col-12 col-xl-4">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">
                                    <h4 className="fw-bold mb-3">
                                        Crear repartidor
                                    </h4>

                                    <form onSubmit={handleCrearRepartidor}>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Nombre
                                            </label>

                                            <input
                                                type="text"
                                                className="form-control"
                                                value={nombreRepartidor}
                                                onChange={(e) => setNombreRepartidor(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Correo
                                            </label>

                                            <input
                                                type="email"
                                                className="form-control"
                                                value={correoRepartidor}
                                                onChange={(e) => setCorreoRepartidor(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">
                                                Contraseña
                                            </label>

                                            <input
                                                type="password"
                                                className="form-control"
                                                value={passwordRepartidor}
                                                onChange={(e) => setPasswordRepartidor(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <button className="btn btn-warning w-100 fw-semibold">
                                            Crear repartidor
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-xl-8">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-body p-4">
                                    <h4 className="fw-bold mb-3">
                                        Repartidores
                                    </h4>

                                    <TablaUsuarios data={repartidores} />
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {vista === "pedidos" && (
                    <>
                        <div className="row g-3 mb-4">

                            <div className="col-12 col-md-4">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body">
                                        <p className="text-muted mb-1">Pendientes</p>
                                        <h3 className="fw-bold">
                                            {pedidosPendientes.length}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body">
                                        <p className="text-muted mb-1">Activos</p>
                                        <h3 className="fw-bold">
                                            {pedidosActivos.length}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 col-md-4">
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body">
                                        <p className="text-muted mb-1">Finalizados</p>
                                        <h3 className="fw-bold">
                                            {pedidosFinalizados.length}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">
                                        Todos los pedidos
                                    </h4>

                                    <button
                                        className="btn btn-outline-success btn-sm"
                                        onClick={cargarDashboard}
                                    >
                                        Actualizar
                                    </button>
                                </div>

                                <TablaPedidos data={pedidos} />
                            </div>
                        </div>
                    </>
                )}

            </main>

        </div>
    );
}

export default AdminDashboard;