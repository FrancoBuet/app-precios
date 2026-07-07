"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type ItemPedido = {
  texto?: string;
  nombre?: string;
  total?: number;
};

type EstadoReparto = "pendiente" | "en_camino" | "entregado" | "no_entregado";
type FormaPago = "efectivo" | "transferencia" | "cuenta_corriente" | "sin_pagar";

type Pedido = {
  id: string;
  numero: number | null;
  created_at: string;
  estado: string;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  direccion: string | null;
  notas: string | null;
  items: ItemPedido[];
  envio: number;
  total: number;
  estado_reparto?: EstadoReparto | null;
  forma_pago?: FormaPago | null;
  nota_reparto?: string | null;
  entregado_at?: string | null;
};

const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const REPARTO_PIN = process.env.NEXT_PUBLIC_REPARTO_PIN || process.env.NEXT_PUBLIC_ADMIN_PEDIDOS_PIN || "2026";

function precio(valor: number | null | undefined) {
  return money.format(Math.round(Number(valor || 0)));
}

function inicioDelDia(fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function etiquetaEstado(estado?: string | null) {
  if (estado === "en_camino") return "En camino";
  if (estado === "entregado") return "Entregado";
  if (estado === "no_entregado") return "No entregado";
  return "Pendiente";
}

function etiquetaPago(pago?: string | null) {
  if (pago === "efectivo") return "Efectivo";
  if (pago === "transferencia") return "Transferencia";
  if (pago === "cuenta_corriente") return "Cuenta corriente";
  if (pago === "sin_pagar") return "Sin pagar";
  return "Sin registrar";
}

function mapsUrl(direccion: string | null | undefined) {
  const texto = `${direccion || ""}, Esperanza, Santa Fe, Argentina`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
}

export default function RepartoPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [pin, setPin] = useState("");
  const [errorPin, setErrorPin] = useState("");
  const [filtro, setFiltro] = useState<"pendientes" | "todos">("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [notas, setNotas] = useState<Record<string, string>>({});

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .neq("estado", "eliminado")
      .gte("created_at", inicioDelDia(new Date()).toISOString())
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      setErrorCarga(error.message);
    } else {
      const lista = (data || []) as Pedido[];
      setErrorCarga("");
      setPedidos(lista);
      setNotas(
        lista.reduce<Record<string, string>>((acc, pedido) => {
          acc[pedido.id] = pedido.nota_reparto || "";
          return acc;
        }, {})
      );
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    setAutorizado(window.localStorage.getItem("reparto-ok") === "1");
  }, []);

  useEffect(() => {
    if (!autorizado) return;
    cargarPedidos();
    const timer = window.setInterval(cargarPedidos, 15000);
    return () => window.clearInterval(timer);
  }, [autorizado, cargarPedidos]);

  const pedidosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return pedidos
      .filter((pedido) => {
        if (filtro === "todos") return true;
        return (pedido.estado_reparto || "pendiente") !== "entregado";
      })
      .filter((pedido) => {
        const items = (pedido.items || []).map((item) => `${item.texto || ""} ${item.nombre || ""}`).join(" ");
        const texto = `${pedido.numero || ""} ${pedido.cliente_nombre || ""} ${pedido.cliente_telefono || ""} ${
          pedido.direccion || ""
        } ${pedido.notas || ""} ${items}`.toLowerCase();
        return texto.includes(termino);
      });
  }, [pedidos, filtro, busqueda]);

  const totalEfectivo = pedidos
    .filter((pedido) => pedido.forma_pago === "efectivo" && pedido.estado_reparto === "entregado")
    .reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
  const pendientes = pedidos.filter((pedido) => (pedido.estado_reparto || "pendiente") !== "entregado").length;

  function ingresar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin.trim() !== REPARTO_PIN) {
      setErrorPin("PIN incorrecto");
      return;
    }
    window.localStorage.setItem("reparto-ok", "1");
    setAutorizado(true);
    setErrorPin("");
  }

  function salir() {
    window.localStorage.removeItem("reparto-ok");
    setAutorizado(false);
    setPin("");
  }

  async function actualizarPedido(
    pedido: Pedido,
    cambios: Partial<Pick<Pedido, "estado_reparto" | "forma_pago" | "nota_reparto" | "entregado_at">>
  ) {
    const payload = {
      ...cambios,
      nota_reparto: cambios.nota_reparto ?? notas[pedido.id] ?? pedido.nota_reparto ?? null,
    };

    const { error } = await supabase.from("pedidos").update(payload).eq("id", pedido.id);
    if (error) {
      alert(`No se pudo actualizar el pedido. Detalle: ${error.message}`);
      return;
    }
    cargarPedidos();
  }

  function marcarEntregado(pedido: Pedido, forma_pago: FormaPago) {
    actualizarPedido(pedido, {
      estado_reparto: "entregado",
      forma_pago,
      entregado_at: new Date().toISOString(),
    });
  }

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-950">
        <form onSubmit={ingresar} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow">
          <p className="m-0 font-black text-green-700">EL NONO COQUI</p>
          <h1 className="mb-4 mt-1 text-3xl font-black">Reparto</h1>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN reparto"
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
    <main className="min-h-screen bg-slate-100 p-3 text-slate-950">
      <section className="mx-auto max-w-3xl">
        <div className="sticky top-0 z-10 -mx-3 mb-3 bg-slate-100 px-3 pb-3 pt-2">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="m-0 font-black text-green-700">EL NONO COQUI</p>
              <h1 className="m-0 text-3xl font-black">Reparto</h1>
              <p className="m-0 text-sm font-bold text-slate-600">Pedidos de hoy</p>
            </div>
            <button type="button" onClick={salir} className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black shadow">
              Salir
            </button>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white p-3 shadow">
              <p className="m-0 text-sm font-bold text-slate-600">Pendientes</p>
              <strong className="text-2xl">{pendientes}</strong>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow">
              <p className="m-0 text-sm font-bold text-slate-600">Efectivo a rendir</p>
              <strong className="text-2xl">$ {precio(totalEfectivo)}</strong>
            </div>
          </div>

          <div className="grid gap-2 rounded-2xl bg-white p-3 shadow">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFiltro("pendientes")}
                className={`rounded-xl px-3 py-3 font-black ${filtro === "pendientes" ? "bg-green-600 text-white" : "border border-slate-300 bg-white"}`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setFiltro("todos")}
                className={`rounded-xl px-3 py-3 font-black ${filtro === "todos" ? "bg-green-600 text-white" : "border border-slate-300 bg-white"}`}
              >
                Todos
              </button>
            </div>
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar nombre, direccion o producto"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold"
            />
            <button type="button" onClick={cargarPedidos} className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white">
              Actualizar
            </button>
          </div>
        </div>

        {cargando ? (
          <div className="rounded-2xl bg-white p-5 font-bold shadow">Cargando pedidos...</div>
        ) : errorCarga ? (
          <div className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-900 shadow">
            No se pudo leer reparto. Ejecuta primero <code>supabase-reparto.sql</code>.
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 font-bold shadow">No hay pedidos para mostrar.</div>
        ) : (
          <div className="grid gap-3">
            {pedidosFiltrados.map((pedido) => (
              <article key={pedido.id} className="rounded-2xl bg-white p-4 shadow">
                <div className="mb-3 flex items-start justify-between gap-3 border-b pb-3">
                  <div>
                    <h2 className="m-0 text-xl font-black">
                      {pedido.numero ? `#${pedido.numero} - ` : ""}
                      {pedido.cliente_nombre || "Sin nombre"}
                    </h2>
                    <p className="m-0 text-sm font-bold text-slate-600">
                      {etiquetaEstado(pedido.estado_reparto)} - {etiquetaPago(pedido.forma_pago)}
                    </p>
                  </div>
                  <strong className="text-2xl">$ {precio(pedido.total)}</strong>
                </div>

                <div className="mb-3 grid gap-1 text-sm">
                  <p className="m-0"><strong>Tel:</strong> {pedido.cliente_telefono || "-"}</p>
                  <p className="m-0"><strong>Direccion:</strong> {pedido.direccion || "-"}</p>
                  {pedido.notas ? <p className="m-0"><strong>Aclaraciones:</strong> {pedido.notas}</p> : null}
                </div>

                <div className="mb-3 grid gap-1 border-y py-3 text-sm">
                  {(pedido.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between gap-3">
                      <span className="font-bold">{item.texto || item.nombre}</span>
                      <span>$ {precio(item.total)}</span>
                    </div>
                  ))}
                  {Number(pedido.envio || 0) > 0 ? (
                    <div className="flex justify-between gap-3">
                      <span className="font-bold">Envio</span>
                      <span>$ {precio(pedido.envio)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  <a
                    href={mapsUrl(pedido.direccion)}
                    target="_blank"
                    rel="noopener"
                    className="rounded-xl bg-blue-600 px-4 py-3 text-center font-black text-white"
                  >
                    Abrir Maps
                  </a>
                  {pedido.cliente_telefono ? (
                    <a
                      href={`tel:${pedido.cliente_telefono}`}
                      className="rounded-xl bg-slate-950 px-4 py-3 text-center font-black text-white"
                    >
                      Llamar
                    </a>
                  ) : (
                    <span className="rounded-xl bg-slate-200 px-4 py-3 text-center font-black text-slate-500">Sin telefono</span>
                  )}
                </div>

                <textarea
                  value={notas[pedido.id] || ""}
                  onChange={(event) => setNotas((actual) => ({ ...actual, [pedido.id]: event.target.value }))}
                  placeholder="Nota de reparto"
                  className="mb-3 min-h-20 w-full rounded-xl border border-slate-300 px-4 py-3 font-bold"
                />

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => actualizarPedido(pedido, { estado_reparto: "en_camino" })}
                    className="rounded-xl bg-amber-500 px-4 py-3 font-black text-white"
                  >
                    En camino
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => marcarEntregado(pedido, "efectivo")}
                      className="rounded-xl bg-green-600 px-4 py-3 font-black text-white"
                    >
                      Entregado efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarEntregado(pedido, "transferencia")}
                      className="rounded-xl bg-green-600 px-4 py-3 font-black text-white"
                    >
                      Entregado transferencia
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => marcarEntregado(pedido, "cuenta_corriente")}
                      className="rounded-xl bg-indigo-600 px-4 py-3 font-black text-white"
                    >
                      Cuenta corriente
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        actualizarPedido(pedido, {
                          estado_reparto: "no_entregado",
                          forma_pago: "sin_pagar",
                          entregado_at: null,
                        })
                      }
                      className="rounded-xl bg-red-600 px-4 py-3 font-black text-white"
                    >
                      No estaba
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => actualizarPedido(pedido, { nota_reparto: notas[pedido.id] || "" })}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black"
                  >
                    Guardar nota
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
