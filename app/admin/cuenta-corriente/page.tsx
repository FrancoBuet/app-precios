"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type ClienteCuenta = {
  id: string;
  nombre: string;
  telefono: string | null;
  telefono_normalizado: string | null;
  direccion: string | null;
  notas: string | null;
  created_at: string;
};

type MovimientoTipo = "pedido" | "pago" | "ajuste";

type MovimientoCuenta = {
  id: string;
  cliente_id: string;
  pedido_id: string | null;
  tipo: MovimientoTipo;
  detalle: string;
  monto: number;
  created_at: string;
};

type ClienteConSaldo = ClienteCuenta & {
  saldo: number;
  movimientos: MovimientoCuenta[];
};

const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PEDIDOS_PIN || "2026";

function precio(valor: number | null | undefined) {
  return money.format(Math.round(Number(valor || 0)));
}

function normalizarTelefono(telefono: string) {
  return telefono.replace(/\D/g, "");
}

function leerMonto(texto: string) {
  const limpio = texto.trim().replace(/\s/g, "");
  if (!limpio) return Number.NaN;

  const tieneComa = limpio.includes(",");
  const tienePunto = limpio.includes(".");

  if (tieneComa && tienePunto) {
    return Number(limpio.replace(/\./g, "").replace(",", "."));
  }

  if (tienePunto) {
    const partes = limpio.split(".");
    const ultimo = partes[partes.length - 1];
    if (ultimo.length === 3 && partes.length > 1) {
      return Number(partes.join(""));
    }
  }

  return Number(limpio.replace(",", "."));
}

export default function CuentaCorrientePage() {
  const [clientes, setClientes] = useState<ClienteCuenta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [pin, setPin] = useState("");
  const [errorPin, setErrorPin] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [clienteActivo, setClienteActivo] = useState<string>("");
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: "", telefono: "", direccion: "", notas: "" });
  const [movimiento, setMovimiento] = useState<{ tipo: MovimientoTipo; monto: string; detalle: string }>({
    tipo: "pago",
    monto: "",
    detalle: "",
  });
  const [editando, setEditando] = useState<{
    id: string;
    tipo: MovimientoTipo;
    monto: string;
    detalle: string;
  } | null>(null);
  const [editandoCliente, setEditandoCliente] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    notas: "",
  });

  const cargarDatos = useCallback(async () => {
    setCargando(true);

    const [clientesResp, movimientosResp] = await Promise.all([
      supabase.from("clientes_cuenta_corriente").select("*").order("nombre", { ascending: true }),
      supabase.from("cuenta_corriente_movimientos").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);

    if (clientesResp.error || movimientosResp.error) {
      setErrorCarga(clientesResp.error?.message || movimientosResp.error?.message || "No se pudo cargar cuenta corriente");
    } else {
      setErrorCarga("");
      setClientes((clientesResp.data || []) as ClienteCuenta[]);
      setMovimientos((movimientosResp.data || []) as MovimientoCuenta[]);
    }

    setCargando(false);
  }, []);

  useEffect(() => {
    setAutorizado(window.localStorage.getItem("admin-pedidos-ok") === "1");
  }, []);

  useEffect(() => {
    if (autorizado) cargarDatos();
  }, [autorizado, cargarDatos]);

  const clientesConSaldo = useMemo(() => {
    const porCliente = new Map<string, MovimientoCuenta[]>();
    movimientos.forEach((mov) => {
      const lista = porCliente.get(mov.cliente_id) || [];
      lista.push(mov);
      porCliente.set(mov.cliente_id, lista);
    });

    return clientes
      .map((cliente) => {
        const lista = porCliente.get(cliente.id) || [];
        const saldo = lista.reduce((sum, mov) => sum + Number(mov.monto || 0), 0);
        return { ...cliente, saldo, movimientos: lista };
      })
      .filter((cliente) => {
        const texto = `${cliente.nombre} ${cliente.telefono || ""} ${cliente.direccion || ""}`.toLowerCase();
        return texto.includes(busqueda.trim().toLowerCase());
      })
      .sort((a, b) => b.saldo - a.saldo);
  }, [clientes, movimientos, busqueda]);

  const clienteSeleccionado = clientesConSaldo.find((cliente) => cliente.id === clienteActivo) || clientesConSaldo[0];
  const totalDeuda = clientesConSaldo.reduce((sum, cliente) => sum + Math.max(cliente.saldo, 0), 0);

  useEffect(() => {
    if (!clienteSeleccionado) {
      setEditandoCliente({ nombre: "", telefono: "", direccion: "", notas: "" });
      return;
    }

    setEditandoCliente({
      nombre: clienteSeleccionado.nombre || "",
      telefono: clienteSeleccionado.telefono || "",
      direccion: clienteSeleccionado.direccion || "",
      notas: clienteSeleccionado.notas || "",
    });
  }, [
    clienteSeleccionado?.id,
    clienteSeleccionado?.nombre,
    clienteSeleccionado?.telefono,
    clienteSeleccionado?.direccion,
    clienteSeleccionado?.notas,
  ]);

  function ingresarAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin.trim() !== ADMIN_PIN) {
      setErrorPin("PIN incorrecto");
      return;
    }

    window.localStorage.setItem("admin-pedidos-ok", "1");
    setAutorizado(true);
    setErrorPin("");
  }

  async function crearCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nuevoCliente.nombre.trim()) {
      alert("Agrega el nombre del cliente.");
      return;
    }

    const { error } = await supabase.from("clientes_cuenta_corriente").insert({
      nombre: nuevoCliente.nombre.trim(),
      telefono: nuevoCliente.telefono.trim() || null,
      telefono_normalizado: normalizarTelefono(nuevoCliente.telefono) || null,
      direccion: nuevoCliente.direccion.trim() || null,
      notas: nuevoCliente.notas.trim() || null,
    });

    if (error) {
      alert(`No se pudo crear el cliente. Detalle: ${error.message}`);
      return;
    }

    setNuevoCliente({ nombre: "", telefono: "", direccion: "", notas: "" });
    cargarDatos();
  }

  async function agregarMovimiento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clienteSeleccionado) return;

    const valor = leerMonto(movimiento.monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      alert("Agrega un monto valido.");
      return;
    }

    const montoFinal = movimiento.tipo === "pago" ? -Math.abs(valor) : Math.abs(valor);
    const detalle =
      movimiento.detalle.trim() ||
      (movimiento.tipo === "pago" ? "Pago recibido" : movimiento.tipo === "ajuste" ? "Ajuste manual" : "Deuda manual");

    const { error } = await supabase.from("cuenta_corriente_movimientos").insert({
      cliente_id: clienteSeleccionado.id,
      tipo: movimiento.tipo,
      detalle,
      monto: montoFinal,
    });

    if (error) {
      alert(`No se pudo guardar el movimiento. Detalle: ${error.message}`);
      return;
    }

    setMovimiento({ tipo: "pago", monto: "", detalle: "" });
    cargarDatos();
  }

  async function guardarCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clienteSeleccionado) return;
    if (!editandoCliente.nombre.trim()) {
      alert("El cliente necesita un nombre.");
      return;
    }

    const { error } = await supabase
      .from("clientes_cuenta_corriente")
      .update({
        nombre: editandoCliente.nombre.trim(),
        telefono: editandoCliente.telefono.trim() || null,
        telefono_normalizado: normalizarTelefono(editandoCliente.telefono) || null,
        direccion: editandoCliente.direccion.trim() || null,
        notas: editandoCliente.notas.trim() || null,
      })
      .eq("id", clienteSeleccionado.id);

    if (error) {
      alert(`No se pudo guardar el cliente. Detalle: ${error.message}`);
      return;
    }

    cargarDatos();
  }

  async function eliminarCliente() {
    if (!clienteSeleccionado) return;
    const confirma = window.confirm(
      `Eliminar a ${clienteSeleccionado.nombre} y todos sus movimientos de cuenta corriente?`
    );
    if (!confirma) return;

    const { error } = await supabase
      .from("clientes_cuenta_corriente")
      .delete()
      .eq("id", clienteSeleccionado.id);

    if (error) {
      alert(`No se pudo eliminar el cliente. Detalle: ${error.message}`);
      return;
    }

    setClienteActivo("");
    setEditando(null);
    cargarDatos();
  }

  function iniciarEdicion(mov: MovimientoCuenta) {
    setEditando({
      id: mov.id,
      tipo: mov.tipo,
      monto: precio(Math.abs(Number(mov.monto || 0))),
      detalle: mov.detalle,
    });
  }

  async function guardarEdicion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editando) return;

    const valor = leerMonto(editando.monto);
    if (!Number.isFinite(valor) || valor <= 0) {
      alert("Agrega un monto valido.");
      return;
    }

    const montoFinal = editando.tipo === "pago" ? -Math.abs(valor) : Math.abs(valor);
    const detalle =
      editando.detalle.trim() ||
      (editando.tipo === "pago" ? "Pago recibido" : editando.tipo === "ajuste" ? "Ajuste manual" : "Deuda manual");

    const { error } = await supabase
      .from("cuenta_corriente_movimientos")
      .update({
        tipo: editando.tipo,
        detalle,
        monto: montoFinal,
      })
      .eq("id", editando.id);

    if (error) {
      alert(`No se pudo editar el movimiento. Detalle: ${error.message}`);
      return;
    }

    setEditando(null);
    cargarDatos();
  }

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-950">
        <form onSubmit={ingresarAdmin} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow">
          <p className="m-0 font-black text-green-700">EL NONO COQUI</p>
          <h1 className="mb-4 mt-1 text-3xl font-black">Cuenta corriente</h1>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN admin"
            className="mb-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold"
            autoFocus
          />
          {errorPin ? <p className="mb-3 mt-0 font-bold text-red-700">{errorPin}</p> : null}
          <button type="submit" className="w-full rounded-xl bg-green-600 px-4 py-3 font-black text-white">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-950">
      <section className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 font-black text-green-700">EL NONO COQUI</p>
            <h1 className="m-0 text-3xl font-black">Cuenta corriente</h1>
            <p className="m-0 text-sm font-bold text-slate-600">Clientes, deudas y pagos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/pedidos" className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black shadow">
              Pedidos
            </a>
            <button
              type="button"
              onClick={cargarDatos}
              className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white shadow"
            >
              Actualizar
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="m-0 text-sm font-bold text-slate-600">Clientes</p>
            <strong className="text-2xl">{clientesConSaldo.length}</strong>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="m-0 text-sm font-bold text-slate-600">Total a cobrar</p>
            <strong className="text-2xl">$ {precio(totalDeuda)}</strong>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow">
            <p className="m-0 text-sm font-bold text-slate-600">Movimientos</p>
            <strong className="text-2xl">{movimientos.length}</strong>
          </div>
        </div>

        {errorCarga ? (
          <div className="mb-4 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900 shadow">
            No se pudo leer cuenta corriente. Ejecuta primero <code>supabase-cuenta-corriente.sql</code>.
          </div>
        ) : null}

        <form onSubmit={crearCliente} className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow">
          <h2 className="m-0 text-xl font-black">Agregar cliente</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={nuevoCliente.nombre}
              onChange={(event) => setNuevoCliente((actual) => ({ ...actual, nombre: event.target.value }))}
              placeholder="Nombre"
              className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
            />
            <input
              value={nuevoCliente.telefono}
              onChange={(event) => setNuevoCliente((actual) => ({ ...actual, telefono: event.target.value }))}
              placeholder="Telefono"
              className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
            />
            <input
              value={nuevoCliente.direccion}
              onChange={(event) => setNuevoCliente((actual) => ({ ...actual, direccion: event.target.value }))}
              placeholder="Direccion"
              className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
            />
            <input
              value={nuevoCliente.notas}
              onChange={(event) => setNuevoCliente((actual) => ({ ...actual, notas: event.target.value }))}
              placeholder="Notas"
              className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
            />
          </div>
          <button type="submit" className="rounded-xl bg-green-600 px-4 py-3 font-black text-white">
            Crear cliente
          </button>
        </form>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-2xl bg-white p-4 shadow">
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar cliente"
              className="mb-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-bold"
            />
            {cargando ? (
              <p className="font-bold">Cargando...</p>
            ) : clientesConSaldo.length === 0 ? (
              <p className="font-bold">Todavia no hay clientes.</p>
            ) : (
              <div className="grid gap-2">
                {clientesConSaldo.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => setClienteActivo(cliente.id)}
                    className={`rounded-xl border px-3 py-3 text-left font-bold ${
                      clienteSeleccionado?.id === cliente.id
                        ? "border-green-600 bg-green-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span className="block text-base">{cliente.nombre}</span>
                    <span className="block text-sm text-slate-600">{cliente.telefono || "Sin telefono"}</span>
                    {cliente.notas ? <span className="block text-xs text-slate-500">{cliente.notas}</span> : null}
                    <span className={`block text-lg ${cliente.saldo > 0 ? "text-red-700" : "text-green-700"}`}>
                      $ {precio(cliente.saldo)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="rounded-2xl bg-white p-4 shadow">
            {clienteSeleccionado ? (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
                  <div>
                    <h2 className="m-0 text-2xl font-black">{clienteSeleccionado.nombre}</h2>
                    <p className="m-0 text-sm font-bold text-slate-600">
                      Tel: {clienteSeleccionado.telefono || "-"} - Dir: {clienteSeleccionado.direccion || "-"}
                    </p>
                    {clienteSeleccionado.notas ? (
                      <p className="m-0 mt-1 text-sm font-bold text-slate-500">Notas: {clienteSeleccionado.notas}</p>
                    ) : null}
                  </div>
                  <strong className={`text-3xl ${clienteSeleccionado.saldo > 0 ? "text-red-700" : "text-green-700"}`}>
                    $ {precio(clienteSeleccionado.saldo)}
                  </strong>
                </div>

                <form onSubmit={guardarCliente} className="mb-4 grid gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <h3 className="m-0 text-lg font-black">Datos del cliente</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={editandoCliente.nombre}
                      onChange={(event) =>
                        setEditandoCliente((actual) => ({ ...actual, nombre: event.target.value }))
                      }
                      placeholder="Nombre"
                      className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                    />
                    <input
                      value={editandoCliente.telefono}
                      onChange={(event) =>
                        setEditandoCliente((actual) => ({ ...actual, telefono: event.target.value }))
                      }
                      placeholder="Telefono"
                      className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                    />
                    <input
                      value={editandoCliente.direccion}
                      onChange={(event) =>
                        setEditandoCliente((actual) => ({ ...actual, direccion: event.target.value }))
                      }
                      placeholder="Direccion"
                      className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                    />
                    <input
                      value={editandoCliente.notas}
                      onChange={(event) =>
                        setEditandoCliente((actual) => ({ ...actual, notas: event.target.value }))
                      }
                      placeholder="Notas"
                      className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="rounded-xl bg-green-600 px-4 py-3 font-black text-white">
                      Guardar cliente
                    </button>
                    <button
                      type="button"
                      onClick={eliminarCliente}
                      className="rounded-xl bg-red-600 px-4 py-3 font-black text-white"
                    >
                      Eliminar cliente
                    </button>
                  </div>
                </form>

                <form onSubmit={agregarMovimiento} className="mb-4 grid gap-3 rounded-xl bg-slate-100 p-3">
                  <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr]">
                    <select
                      value={movimiento.tipo}
                      onChange={(event) =>
                        setMovimiento((actual) => ({ ...actual, tipo: event.target.value as MovimientoTipo }))
                      }
                      className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                    >
                      <option value="pago">Pago</option>
                      <option value="pedido">Deuda</option>
                      <option value="ajuste">Ajuste suma</option>
                    </select>
                    <input
                      value={movimiento.monto}
                      onChange={(event) => setMovimiento((actual) => ({ ...actual, monto: event.target.value }))}
                      placeholder="Monto"
                      className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                    />
                    <input
                      value={movimiento.detalle}
                      onChange={(event) => setMovimiento((actual) => ({ ...actual, detalle: event.target.value }))}
                      placeholder="Detalle"
                      className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                    />
                  </div>
                  <button type="submit" className="rounded-xl bg-green-600 px-4 py-3 font-black text-white">
                    Guardar movimiento
                  </button>
                </form>

                <div className="grid gap-2">
                  {clienteSeleccionado.movimientos.length === 0 ? (
                    <p className="font-bold">Este cliente todavia no tiene movimientos.</p>
                  ) : (
                    clienteSeleccionado.movimientos.map((mov) => (
                      <div key={mov.id} className="rounded-xl border border-slate-200 p-3">
                        {editando?.id === mov.id ? (
                          <form onSubmit={guardarEdicion} className="grid gap-3">
                            <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr]">
                              <select
                                value={editando.tipo}
                                onChange={(event) =>
                                  setEditando((actual) =>
                                    actual ? { ...actual, tipo: event.target.value as MovimientoTipo } : actual
                                  )
                                }
                                className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                              >
                                <option value="pago">Pago</option>
                                <option value="pedido">Deuda</option>
                                <option value="ajuste">Ajuste suma</option>
                              </select>
                              <input
                                value={editando.monto}
                                onChange={(event) =>
                                  setEditando((actual) => (actual ? { ...actual, monto: event.target.value } : actual))
                                }
                                placeholder="Monto"
                                className="rounded-xl border border-slate-300 px-4 py-3 font-bold"
                                autoFocus
                              />
                              <textarea
                                value={editando.detalle}
                                onChange={(event) =>
                                  setEditando((actual) => (actual ? { ...actual, detalle: event.target.value } : actual))
                                }
                                placeholder="Detalle"
                                className="min-h-28 rounded-xl border border-slate-300 px-4 py-3 font-bold"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="submit" className="rounded-xl bg-green-600 px-4 py-3 font-black text-white">
                                Guardar cambios
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditando(null)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black"
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="m-0 whitespace-pre-line font-black">{mov.detalle}</p>
                              <p className="m-0 text-sm text-slate-600">
                                {new Date(mov.created_at).toLocaleString("es-AR")} - {mov.tipo}
                              </p>
                              <button
                                type="button"
                                onClick={() => iniciarEdicion(mov)}
                                className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black"
                              >
                                Editar
                              </button>
                            </div>
                            <strong className={Number(mov.monto) >= 0 ? "text-red-700" : "text-green-700"}>
                              {Number(mov.monto) >= 0 ? "+" : "-"} $ {precio(Math.abs(Number(mov.monto)))}
                            </strong>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="font-bold">Elegi o crea un cliente para ver la cuenta.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
