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
    getClients,
    getDeliveryUsers,
    updateUserStatus,
    createDeliveryUser,
    getAllOrdersAdmin
} from "../services/adminService";

function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [stats, setStats] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [pedidos, setPedidos] = useState([]);
    const [vista, setVista] = useState("todos");

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const [nombreRepartidor, setNombreRepartidor] = useState("");
    const [correoRepartidor, setCorreoRepartidor] = useState("");
    const [passwordRepartidor, setPasswordRepartidor] = useState("");

    const pedidosChartData = stats ? [
        {
            name: "Pendientes",
            cantidad: stats.pedidos_pendientes || 0,
            color: "#6c757d"
        },
        {
            name: "Aceptados",
            cantidad: stats.pedidos_aceptados || 0,
            color: "#0d6efd"
        },
        {
            name: "En camino",
            cantidad: stats.pedidos_en_camino || 0,
            color: "#ffc107"
        },
        {
            name: "Entregados",
            cantidad: stats.pedidos_entregados || 0,
            color: "#198754"
        },
        {
            name: "Cancelados",
            cantidad: stats.pedidos_cancelados || 0,
            color: "#dc3545"
        }
    ] : [];

    const usuariosChartData = stats ? [
        {
            name: "Clientes",
            value: stats.total_clientes || 0,
            color: "#0d6efd"
        },
        {
            name: "Repartidores",
            value: stats.total_repartidores || 0,
            color: "#198754"
        }
    ] : [];

    const cargarDashboard = async () => {
        try {
            const statsData = await getDashboardStats();
            const usuariosData = await getAllUsers();
            const pedidosData = await getAllOrdersAdmin();

            setStats(statsData.stats);
            setUsuarios(usuariosData.usuarios);
            setPedidos(pedidosData.pedidos);

        } catch (error) {
            setError("No se pudo cargar la información del administrador");
        }
    };

    useEffect(() => {
        cargarDashboard();

        const interval = setInterval(() => {
            cargarDashboard();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const cerrarSesion = () => {
        localStorage.clear();
        window.location.href = "/";
    };

    const cambiarVista = async (tipo) => {
        setVista(tipo);
        setMensaje("");
        setError("");

        try {
            if (tipo === "todos") {
                const data = await getAllUsers();
                setUsuarios(data.usuarios);
            }

            if (tipo === "clientes") {
                const data = await getClients();
                setUsuarios(data.clientes);
            }

            if (tipo === "repartidores") {
                const data = await getDeliveryUsers();
                setUsuarios(data.repartidores);
            }

        } catch (error) {
            setError("No se pudieron cargar los usuarios");
        }
    };

    const handleCambiarEstado = async (usuario) => {
        setMensaje("");
        setError("");

        const nuevoEstado = usuario.estado === "activo"
            ? "inactivo"
            : "activo";

        try {
            await updateUserStatus(usuario.id, nuevoEstado);

            setMensaje("Estado actualizado correctamente");

            await cambiarVista(vista);
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
            await cambiarVista("repartidores");

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Error al crear repartidor"
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

    const mostrarDiferencia = (diferencia) => {
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

                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <h2 className="fw-bold mb-1">
                                    Panel de Administración
                                </h2>

                                <p className="text-muted mb-0">
                                    Gestión general de usuarios, repartidores y pedidos de ADOMI.
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

                <div className="row g-3 mb-4">

                    <div className="col-12 col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">
                                            Clientes
                                        </p>
                                        <h3 className="fw-bold">
                                            {stats?.total_clientes || 0}
                                        </h3>
                                    </div>

                                    <div className="fs-1 text-primary">
                                        <i className="bi bi-people"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">
                                            Repartidores
                                        </p>
                                        <h3 className="fw-bold">
                                            {stats?.total_repartidores || 0}
                                        </h3>
                                    </div>

                                    <div className="fs-1 text-warning">
                                        <i className="bi bi-truck"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">
                                            Pedidos
                                        </p>
                                        <h3 className="fw-bold">
                                            {stats?.total_pedidos || 0}
                                        </h3>
                                    </div>

                                    <div className="fs-1 text-success">
                                        <i className="bi bi-bag-check"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6 col-xl-3">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body">
                                <div className="d-flex justify-content-between">
                                    <div>
                                        <p className="text-muted mb-1">
                                            Ingresos entregados
                                        </p>
                                        <h3 className="fw-bold">
                                            Q {stats?.ingresos_entregados || "0.00"}
                                        </h3>
                                    </div>

                                    <div className="fs-1 text-danger">
                                        <i className="bi bi-cash-coin"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="row g-4 mb-4">

                    <div className="col-12 col-xl-4">

                        <div className="card border-0 shadow-sm rounded-4 mb-4">
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

                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Resumen de pedidos
                                </h4>

                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item d-flex justify-content-between">
                                        Pendientes
                                        <span className="badge bg-secondary">
                                            {stats?.pedidos_pendientes || 0}
                                        </span>
                                    </li>

                                    <li className="list-group-item d-flex justify-content-between">
                                        Aceptados
                                        <span className="badge bg-primary">
                                            {stats?.pedidos_aceptados || 0}
                                        </span>
                                    </li>

                                    <li className="list-group-item d-flex justify-content-between">
                                        En camino
                                        <span className="badge bg-warning text-dark">
                                            {stats?.pedidos_en_camino || 0}
                                        </span>
                                    </li>

                                    <li className="list-group-item d-flex justify-content-between">
                                        Entregados
                                        <span className="badge bg-success">
                                            {stats?.pedidos_entregados || 0}
                                        </span>
                                    </li>

                                    <li className="list-group-item d-flex justify-content-between">
                                        Cancelados
                                        <span className="badge bg-danger">
                                            {stats?.pedidos_cancelados || 0}
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-xl-8">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">

                                <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                                    <h4 className="fw-bold mb-0">
                                        Usuarios
                                    </h4>

                                    <div className="btn-group">
                                        <button
                                            className={`btn btn-sm ${vista === "todos" ? "btn-dark" : "btn-outline-dark"}`}
                                            onClick={() => cambiarVista("todos")}
                                        >
                                            Todos
                                        </button>

                                        <button
                                            className={`btn btn-sm ${vista === "clientes" ? "btn-primary" : "btn-outline-primary"}`}
                                            onClick={() => cambiarVista("clientes")}
                                        >
                                            Clientes
                                        </button>

                                        <button
                                            className={`btn btn-sm ${vista === "repartidores" ? "btn-warning" : "btn-outline-warning"}`}
                                            onClick={() => cambiarVista("repartidores")}
                                        >
                                            Repartidores
                                        </button>
                                    </div>
                                </div>

                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Nombre</th>
                                                <th>Correo</th>
                                                <th>Rol</th>
                                                <th>Estado</th>
                                                <th>Acción</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {usuarios.map((usuario) => (
                                                <tr key={usuario.id}>
                                                    <td>#{usuario.id}</td>
                                                    <td>{usuario.nombre}</td>
                                                    <td>{usuario.correo}</td>
                                                    <td>
                                                        <span className={getRolBadge(usuario.rol)}>
                                                            {usuario.rol}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={getEstadoBadge(usuario.estado)}>
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

                            </div>
                        </div>
                    </div>

                </div>

                <div className="row g-4 mb-4">
                    <div className="col-12 col-lg-7">
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

                    <div className="col-12 col-lg-5">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">
                                <h4 className="fw-bold mb-3">
                                    Usuarios registrados
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

                <div className="row">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-body p-4">

                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4 className="fw-bold mb-0">
                                        <i className="bi bi-bag-check me-2 text-success"></i>
                                        Todos los pedidos
                                    </h4>

                                    <button
                                        className="btn btn-outline-success btn-sm"
                                        onClick={cargarDashboard}
                                    >
                                        Actualizar
                                    </button>
                                </div>

                                {pedidos.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-inbox fs-1 text-muted"></i>
                                        <p className="text-muted mt-3">
                                            No hay pedidos registrados.
                                        </p>
                                    </div>
                                ) : (
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
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {pedidos.map((pedido) => (
                                                    <tr key={pedido.id}>
                                                        <td>#{pedido.id}</td>

                                                        <td>
                                                            {pedido.cliente_nombre}
                                                        </td>

                                                        <td>
                                                            {pedido.repartidor_nombre || "Sin asignar"}
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
                                                            {mostrarDiferencia(pedido.diferencia)}
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

export default AdminDashboard;