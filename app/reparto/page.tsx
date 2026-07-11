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

function normalizarTelefono(telefono: string | null | undefined) {
  return String(telefono || "").replace(/\D/g, "");
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

function claseEstado(estado?: string | null) {
  if (estado === "en_camino") return "bg-amber-100 text-amber-800 ring-amber-200";
  if (estado === "entregado") return "bg-green-100 text-green-800 ring-green-200";
  if (estado === "no_entregado") return "bg-red-100 text-red-800 ring-red-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function clasePago(pago?: string | null) {
  if (pago === "efectivo") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  if (pago === "transferencia") return "bg-sky-100 text-sky-800 ring-sky-200";
  if (pago === "cuenta_corriente") return "bg-indigo-100 text-indigo-800 ring-indigo-200";
  if (pago === "sin_pagar") return "bg-red-100 text-red-800 ring-red-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function mapsUrl(direccion: string | null | undefined) {
  const texto = `${direccion || ""}, Esperanza, Santa Fe, Argentina`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`;
}

function direccionParaMaps(direccion: string | null | undefined) {
  return `${direccion || ""}, Esperanza, Santa Fe, Argentina`;
}

function normalizarDireccion(direccion: string | null | undefined) {
  return String(direccion || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function claveOrdenDireccion(pedido: Pedido) {
  const direccion = normalizarDireccion(pedido.direccion);
  const numero = Number(direccion.match(/\d+/)?.[0] || 0);
  const calle = direccion.replace(/\d+/g, "").trim();
  return `${calle.padEnd(40, " ")}-${String(numero).padStart(6, "0")}`;
}

function recorridoMapsUrl(pedidos: Pedido[]) {
  const direcciones = pedidos
    .map((pedido) => pedido.direccion)
    .filter((direccion): direccion is string => Boolean(direccion?.trim()))
    .slice(0, 10)
    .map(direccionParaMaps);

  if (direcciones.length === 0) return "https://www.google.com/maps";
  if (direcciones.length === 1) return mapsUrl(direcciones[0]);

  const origen = direcciones[0];
  const destino = direcciones[direcciones.length - 1];
  const waypoints = direcciones.slice(1, -1).join("|");
  const params = new URLSearchParams({
    api: "1",
    origin: origen,
    destination: destino,
    travelmode: "driving",
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function detallePedidoCuentaCorriente(pedido: Pedido) {
  const titulo = pedido.numero ? `Pedido #${pedido.numero}` : "Pedido";
  const productos = (pedido.items || [])
    .map((item) => `- ${item.texto || item.nombre || "Producto"}: $ ${precio(item.total)}`)
    .join("\n");
  const envio = Number(pedido.envio || 0) > 0 ? `\n- Envio: $ ${precio(pedido.envio)}` : "";
  return `${titulo}\n${productos}${envio}`;
}

export default function RepartoPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [pin, setPin] = useState("");
  const [errorPin, setErrorPin] = useState("");
  const [filtro, setFiltro] = useState<"pendientes" | "entregados">("pendientes");
  const [busqueda, setBusqueda] = useState("");
  const [ordenarPorDireccion, setOrdenarPorDireccion] = useState(false);
  const [hayActualizacion, setHayActualizacion] = useState(false);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const cargarPedidos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
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
      setHayActualizacion(false);
      setNotas(
        lista.reduce<Record<string, string>>((acc, pedido) => {
          acc[pedido.id] = pedido.nota_reparto || "";
          return acc;
        }, {})
      );
    }
    if (!silencioso) setCargando(false);
  }, []);

  useEffect(() => {
    setAutorizado(window.localStorage.getItem("reparto-ok") === "1");
  }, []);

  useEffect(() => {
    if (!autorizado) return;
    cargarPedidos();
    const timer = window.setInterval(() => {
      if (window.scrollY < 120) {
        cargarPedidos(true);
      } else {
        setHayActualizacion(true);
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [autorizado, cargarPedidos]);

  const pedidosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const lista = pedidos
      .filter((pedido) => {
        const entregado = (pedido.estado_reparto || "pendiente") === "entregado";
        return filtro === "entregados" ? entregado : !entregado;
      })
      .filter((pedido) => {
        const items = (pedido.items || []).map((item) => `${item.texto || ""} ${item.nombre || ""}`).join(" ");
        const texto = `${pedido.numero || ""} ${pedido.cliente_nombre || ""} ${pedido.cliente_telefono || ""} ${
          pedido.direccion || ""
        } ${pedido.notas || ""} ${items}`.toLowerCase();
        return texto.includes(termino);
      });

    if (!ordenarPorDireccion) return lista;
    return lista.slice().sort((a, b) => claveOrdenDireccion(a).localeCompare(claveOrdenDireccion(b)));
  }, [pedidos, filtro, busqueda, ordenarPorDireccion]);

  const pendientesOrdenados = useMemo(
    () =>
      pedidos
        .filter((pedido) => (pedido.estado_reparto || "pendiente") !== "entregado")
        .slice()
        .sort((a, b) => claveOrdenDireccion(a).localeCompare(claveOrdenDireccion(b))),
    [pedidos]
  );

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
    cargarPedidos(true);
  }

  function marcarEntregado(pedido: Pedido, forma_pago: FormaPago) {
    actualizarPedido(pedido, {
      estado_reparto: "entregado",
      forma_pago,
      entregado_at: new Date().toISOString(),
    });
  }

  async function enviarACuentaCorriente(pedido: Pedido) {
    const nombre = (pedido.cliente_nombre || "").trim();
    if (!nombre) {
      alert("Este pedido no tiene nombre de cliente.");
      return;
    }

    const { data: movimientoExistente, error: errorMovimientoExistente } = await supabase
      .from("cuenta_corriente_movimientos")
      .select("id")
      .eq("pedido_id", pedido.id)
      .maybeSingle();

    if (errorMovimientoExistente) {
      alert(`No se pudo revisar cuenta corriente. Detalle: ${errorMovimientoExistente.message}`);
      return;
    }

    const telefonoLimpio = normalizarTelefono(pedido.cliente_telefono);
    let clienteId = "";

    if (!movimientoExistente?.id) {
      if (telefonoLimpio) {
        const { data } = await supabase
          .from("clientes_cuenta_corriente")
          .select("id")
          .eq("telefono_normalizado", telefonoLimpio)
          .maybeSingle();
        if (data?.id) clienteId = data.id;
      }

      if (!clienteId) {
        const { data, error } = await supabase
          .from("clientes_cuenta_corriente")
          .insert({
            nombre,
            telefono: pedido.cliente_telefono || null,
            telefono_normalizado: telefonoLimpio || null,
            direccion: pedido.direccion || null,
          })
          .select("id")
          .single();

        if (error || !data?.id) {
          alert(`No se pudo crear el cliente en cuenta corriente. Detalle: ${error?.message || "sin detalle"}`);
          return;
        }
        clienteId = data.id;
      }

      const { error: movError } = await supabase.from("cuenta_corriente_movimientos").insert({
        cliente_id: clienteId,
        pedido_id: pedido.id,
        tipo: "pedido",
        detalle: detallePedidoCuentaCorriente(pedido),
        monto: Number(pedido.total || 0),
      });

      if (movError) {
        alert(`No se pudo cargar la cuenta corriente. Detalle: ${movError.message}`);
        return;
      }
    }

    const { error: pedidoError } = await supabase
      .from("pedidos")
      .update({
        estado: "cuenta_corriente",
        estado_reparto: "entregado",
        forma_pago: "cuenta_corriente",
        nota_reparto: notas[pedido.id] ?? pedido.nota_reparto ?? null,
        entregado_at: new Date().toISOString(),
      })
      .eq("id", pedido.id);

    if (pedidoError) {
      alert(`La cuenta corriente se cargo, pero no se pudo marcar el pedido. Detalle: ${pedidoError.message}`);
      return;
    }

    alert(movimientoExistente?.id ? "El pedido ya estaba en cuenta corriente." : "Pedido agregado a cuenta corriente.");
    cargarPedidos(true);
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
    <main className="min-h-screen bg-slate-100 p-2 text-slate-950">
      <section className="mx-auto max-w-3xl">
        <div className="mb-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="m-0 text-sm font-black text-green-700">EL NONO COQUI</p>
              <h1 className="m-0 text-2xl font-black leading-tight">Reparto</h1>
              <p className="m-0 text-xs font-bold text-slate-600">Pedidos de hoy</p>
            </div>
            <button type="button" onClick={salir} className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-black shadow">
              Salir
            </button>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white p-2 shadow">
              <p className="m-0 text-xs font-bold text-slate-600">Pendientes</p>
              <strong className="text-xl">{pendientes}</strong>
            </div>
            <div className="rounded-xl bg-white p-2 shadow">
              <p className="m-0 text-xs font-bold text-slate-600">Efectivo</p>
              <strong className="text-xl">$ {precio(totalEfectivo)}</strong>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl bg-white p-2 shadow">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFiltro("pendientes")}
                className={`rounded-xl px-3 py-2 font-black ${filtro === "pendientes" ? "bg-green-600 text-white" : "border border-slate-300 bg-white"}`}
              >
                Pendientes
              </button>
              <button
                type="button"
                onClick={() => setFiltro("entregados")}
                className={`rounded-xl px-3 py-2 font-black ${filtro === "entregados" ? "bg-green-600 text-white" : "border border-slate-300 bg-white"}`}
              >
                Entregados
              </button>
            </div>
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar nombre, direccion o producto"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 font-bold"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrdenarPorDireccion((actual) => !actual)}
                className={`rounded-xl px-3 py-2 font-black ${
                  ordenarPorDireccion ? "bg-blue-600 text-white" : "border border-slate-300 bg-white"
                }`}
              >
                Ordenar dir.
              </button>
              <a
                href={recorridoMapsUrl(pendientesOrdenados)}
                target="_blank"
                rel="noopener"
                className="rounded-xl bg-blue-600 px-3 py-2 text-center font-black text-white"
              >
                Recorrido
              </a>
            </div>
            <button type="button" onClick={() => cargarPedidos()} className="rounded-xl bg-slate-950 px-3 py-2 font-black text-white">
              Actualizar
            </button>
          </div>
        </div>

        {hayActualizacion ? (
          <button
            type="button"
            onClick={() => {
              cargarPedidos();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="mb-3 w-full rounded-xl bg-green-600 px-4 py-3 font-black text-white shadow"
          >
            Hay cambios nuevos - tocar para actualizar
          </button>
        ) : null}

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
              <article key={pedido.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="bg-gradient-to-br from-white to-slate-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-xs font-black uppercase tracking-wide text-slate-500">
                        {pedido.numero ? `Pedido #${pedido.numero}` : "Pedido"}
                      </p>
                      <h2 className="m-0 break-words text-2xl font-black leading-tight">
                        {pedido.cliente_nombre || "Sin nombre"}
                      </h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${claseEstado(
                            pedido.estado_reparto
                          )}`}
                        >
                          {etiquetaEstado(pedido.estado_reparto)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${clasePago(
                            pedido.forma_pago
                          )}`}
                        >
                          {etiquetaPago(pedido.forma_pago)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-right text-white shadow-sm">
                      <p className="m-0 text-[10px] font-black uppercase text-slate-300">Total</p>
                      <strong className="text-xl leading-none">$ {precio(pedido.total)}</strong>
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-200">
                    <p className="m-0"><strong>Tel:</strong> {pedido.cliente_telefono || "-"}</p>
                    <p className="m-0"><strong>Direccion:</strong> {pedido.direccion || "-"}</p>
                    {pedido.notas ? <p className="m-0"><strong>Aclaraciones:</strong> {pedido.notas}</p> : null}
                  </div>
                </div>

                <div className="mx-4 mb-3 mt-4 overflow-hidden rounded-2xl border border-slate-200 text-sm">
                  {(pedido.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">
                      <span className="font-black leading-snug">{item.texto || item.nombre}</span>
                      <span className="shrink-0 font-bold text-slate-700">$ {precio(item.total)}</span>
                    </div>
                  ))}
                  {Number(pedido.envio || 0) > 0 ? (
                    <div className="flex justify-between gap-3 bg-green-50 px-3 py-2">
                      <span className="font-black">Envio</span>
                      <span className="font-bold text-green-800">$ {precio(pedido.envio)}</span>
                    </div>
                  ) : null}
                </div>

                <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
                  <a
                    href={mapsUrl(pedido.direccion)}
                    target="_blank"
                    rel="noopener"
                    className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white shadow-sm"
                  >
                    Abrir Maps
                  </a>
                  {pedido.cliente_telefono ? (
                    <a
                      href={`tel:${pedido.cliente_telefono}`}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-center font-black text-white shadow-sm"
                    >
                      Llamar
                    </a>
                  ) : (
                    <span className="rounded-2xl bg-slate-200 px-4 py-3 text-center font-black text-slate-500">Sin telefono</span>
                  )}
                </div>

                <div className="grid gap-2 p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => actualizarPedido(pedido, { estado_reparto: "en_camino" })}
                    className="rounded-2xl bg-amber-500 px-4 py-3 font-black text-white shadow-sm"
                  >
                    En camino
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => marcarEntregado(pedido, "efectivo")}
                      className="rounded-2xl bg-green-600 px-4 py-3 font-black text-white shadow-sm"
                    >
                      Entregado efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarEntregado(pedido, "transferencia")}
                      className="rounded-2xl bg-green-600 px-4 py-3 font-black text-white shadow-sm"
                    >
                      Entregado transferencia
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => enviarACuentaCorriente(pedido)}
                      className="rounded-2xl bg-indigo-600 px-4 py-3 font-black text-white shadow-sm"
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
                      className="rounded-2xl bg-red-600 px-4 py-3 font-black text-white shadow-sm"
                    >
                      No estaba
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
