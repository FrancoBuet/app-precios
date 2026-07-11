"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type ItemPedido = {
  texto?: string;
  nombre?: string;
  total?: number;
};

type FiltroReporte = "hoy" | "mes" | "todos";

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
  impreso_at: string | null;
};

const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PEDIDOS_PIN || "2026";

function precio(valor: number | null | undefined) {
  return money.format(Math.round(Number(valor || 0)));
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      {hidden ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
          <path d="M9.9 5.1A9.5 9.5 0 0 1 12 5c5 0 8.5 4.5 9.5 7a12.4 12.4 0 0 1-2.2 3.4" />
          <path d="M6.6 6.6A12.3 12.3 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a9.7 9.7 0 0 0 4.2-1" />
        </>
      ) : (
        <>
          <path d="M2.5 12c1-2.5 4.5-7 9.5-7s8.5 4.5 9.5 7c-1 2.5-4.5 7-9.5 7s-8.5-4.5-9.5-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function inicioDelDia(fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function claveMesActual() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
}

function inicioDelMesClave(clave: string) {
  const [anio, mes] = clave.split("-").map(Number);
  return new Date(anio, (mes || 1) - 1, 1);
}

function mesSiguiente(clave: string) {
  const inicio = inicioDelMesClave(clave);
  return new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
}

function nombreMes(clave: string) {
  return inicioDelMesClave(clave).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function etiquetaFiltro(filtro: FiltroReporte, mes: string) {
  if (filtro === "hoy") return "Ventas de hoy";
  if (filtro === "mes") return `Ventas de ${nombreMes(mes)}`;
  return "Historial de pedidos";
}

function escaparHtml(texto: string | number | null | undefined) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function detallePedidoCuentaCorriente(pedido: Pedido) {
  const titulo = pedido.numero ? `Pedido #${pedido.numero}` : "Pedido";
  const productos = (pedido.items || [])
    .map((item) => `- ${item.texto || item.nombre || "Producto"}: $ ${precio(item.total)}`)
    .join("\n");
  const envio = Number(pedido.envio || 0) > 0 ? `\n- Envio: $ ${precio(pedido.envio)}` : "";
  return `${titulo}\n${productos}${envio}`;
}

function htmlTicket(pedido: Pedido) {
  const fecha = new Date(pedido.created_at).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Pedido</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html { width: 80mm; margin: 0; padding: 0; }
          body {
            width: 60mm;
            margin: 0 auto;
            padding: 0;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10.5px;
            line-height: 1.2;
          }
          h1, h2, p { margin: 0; }
          h1 { text-align: center; font-size: 15px; font-weight: 900; }
          h2 { text-align: center; font-size: 12px; margin-top: 1px; }
          .fecha { text-align: center; margin-top: 3px; }
          .corte { border-top: 1px dashed #000; margin: 5px 0; }
          .linea {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 17mm;
            gap: 1.5mm;
            align-items: start;
            margin: 3px 0;
          }
          .producto { font-weight: 700; overflow-wrap: anywhere; }
          .precio { white-space: nowrap; text-align: right; overflow: visible; }
          .total {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 19mm;
            gap: 1.5mm;
            font-size: 15px;
            font-weight: 900;
          }
          .dato { margin: 3px 0; overflow-wrap: anywhere; }
          .pie { text-align: center; margin-top: 6px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>EL NONO COQUI</h1>
        <h2>Pedido ${pedido.numero ? `#${escaparHtml(pedido.numero)}` : ""}</h2>
        <p class="fecha">${escaparHtml(fecha)}</p>
        <div class="corte"></div>
        ${(pedido.items || [])
          .map(
            (item) => `
              <div class="linea">
                <span class="producto">${escaparHtml(item.texto || item.nombre || "")}</span>
                <span class="precio">$${precio(item.total)}</span>
              </div>
            `
          )
          .join("")}
        <div class="linea">
          <span class="producto">Envio</span>
          <span class="precio">$${precio(pedido.envio)}</span>
        </div>
        <div class="corte"></div>
        <div class="total">
          <span>Total</span>
          <span>$${precio(pedido.total)}</span>
        </div>
        <div class="corte"></div>
        <p class="dato"><strong>Nombre:</strong> ${escaparHtml(pedido.cliente_nombre)}</p>
        <p class="dato"><strong>Telefono:</strong> ${escaparHtml(pedido.cliente_telefono)}</p>
        <p class="dato"><strong>Direccion:</strong> ${escaparHtml(pedido.direccion)}</p>
        ${pedido.notas ? `<p class="dato"><strong>Aclaraciones:</strong> ${escaparHtml(pedido.notas)}</p>` : ""}
        <div class="corte"></div>
        <p class="pie">Gracias por tu pedido</p>
        <script>
          window.addEventListener("load", () => window.print());
        </script>
      </body>
    </html>`;
}

export default function AdminPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [autoImprimir, setAutoImprimir] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [pin, setPin] = useState("");
  const [errorPin, setErrorPin] = useState("");
  const [filtroReporte, setFiltroReporte] = useState<FiltroReporte>("hoy");
  const [mesReporte, setMesReporte] = useState(claveMesActual());
  const [hayActualizacion, setHayActualizacion] = useState(false);
  const [montosVisibles, setMontosVisibles] = useState(false);
  const [busquedaPedidos, setBusquedaPedidos] = useState("");
  const impresosRef = useRef<Set<string>>(new Set());

  const cargarPedidos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);

    let query = supabase
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false })
      .neq("estado", "eliminado")
      .limit(filtroReporte === "todos" ? 500 : 300);

    const ahora = new Date();
    if (filtroReporte === "hoy") {
      query = query.gte("created_at", inicioDelDia(ahora).toISOString());
    }
    if (filtroReporte === "mes") {
      query = query
        .gte("created_at", inicioDelMesClave(mesReporte).toISOString())
        .lt("created_at", mesSiguiente(mesReporte).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      setErrorCarga(error.message);
    } else if (Array.isArray(data)) {
      setErrorCarga("");
      setPedidos(data as Pedido[]);
      setHayActualizacion(false);
    }
    if (!silencioso) setCargando(false);
  }, [filtroReporte, mesReporte]);

  async function marcarImpreso(pedido: Pedido) {
    await supabase
      .from("pedidos")
      .update({ estado: "impreso", impreso_at: new Date().toISOString() })
      .eq("id", pedido.id);
    cargarPedidos();
  }

  async function eliminarPedido(pedido: Pedido) {
    const nombre = pedido.cliente_nombre || "sin nombre";
    const numero = pedido.numero ? `#${pedido.numero}` : "seleccionado";
    const confirma = window.confirm(`Eliminar de la lista y reportes el pedido ${numero} de ${nombre}?`);
    if (!confirma) return;

    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "eliminado" })
      .eq("id", pedido.id);
    if (error) {
      alert(`No se pudo eliminar el pedido. Detalle: ${error.message}`);
      return;
    }

    impresosRef.current.delete(pedido.id);
    cargarPedidos();
  }

  async function enviarACuentaCorriente(pedido: Pedido) {
    if (pedido.estado === "cuenta_corriente") {
      alert("Este pedido ya esta cargado en cuenta corriente.");
      return;
    }

    const nombre = (pedido.cliente_nombre || "").trim();
    if (!nombre) {
      alert("Este pedido no tiene nombre de cliente.");
      return;
    }

    const confirma = window.confirm(`Pasar el pedido de ${nombre} por $ ${precio(pedido.total)} a cuenta corriente?`);
    if (!confirma) return;

    const telefonoLimpio = String(pedido.cliente_telefono || "").replace(/\D/g, "");
    let clienteId = "";

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

    const detalle = detallePedidoCuentaCorriente(pedido);
    const { error: movError } = await supabase.from("cuenta_corriente_movimientos").insert({
      cliente_id: clienteId,
      pedido_id: pedido.id,
      tipo: "pedido",
      detalle,
      monto: Number(pedido.total || 0),
    });

    if (movError) {
      alert(`No se pudo cargar la cuenta corriente. Detalle: ${movError.message}`);
      return;
    }

    await supabase.from("pedidos").update({ estado: "cuenta_corriente" }).eq("id", pedido.id);
    alert("Pedido agregado a cuenta corriente.");
    cargarPedidos();
  }

  async function imprimirPedido(pedido: Pedido) {
    const ventana = window.open("", "_blank", "width=380,height=640");
    if (!ventana) {
      alert("El navegador bloqueo la ventana de impresion. Habilita ventanas emergentes.");
      return;
    }

    ventana.document.open();
    ventana.document.write(htmlTicket(pedido));
    ventana.document.close();
    impresosRef.current.add(pedido.id);
    await marcarImpreso(pedido);
  }

  useEffect(() => {
    setAutorizado(window.localStorage.getItem("admin-pedidos-ok") === "1");
  }, []);

  useEffect(() => {
    if (!autorizado) return;
    cargarPedidos();
    const timer = window.setInterval(() => {
      if (window.scrollY < 120 || autoImprimir) {
        cargarPedidos(true);
      } else {
        setHayActualizacion(true);
      }
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autorizado, autoImprimir, cargarPedidos]);

  useEffect(() => {
    if (!autoImprimir) return;
    const nuevo = pedidos
      .slice()
      .reverse()
      .find((pedido) => pedido.estado !== "impreso" && !pedido.impreso_at && !impresosRef.current.has(pedido.id));

    if (nuevo) {
      imprimirPedido(nuevo);
    }
  }, [autoImprimir, pedidos]);

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

  function salirAdmin() {
    window.localStorage.removeItem("admin-pedidos-ok");
    setAutorizado(false);
    setPin("");
  }

  const totalVendido = pedidos.reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
  const totalEnvios = pedidos.reduce((sum, pedido) => sum + Number(pedido.envio || 0), 0);
  const promedioPedido = pedidos.length > 0 ? totalVendido / pedidos.length : 0;
  const textoFiltro = etiquetaFiltro(filtroReporte, mesReporte);
  const montoAdmin = (valor: number | null | undefined) => (montosVisibles ? `$ ${precio(valor)}` : "*****");
  const clientesReporte = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string;
        telefono: string;
        direccion: string;
        pedidos: number;
        total: number;
        ultimaCompra: string;
      }
    >();

    for (const pedido of pedidos) {
      const nombre = (pedido.cliente_nombre || "Sin nombre").trim();
      const telefono = String(pedido.cliente_telefono || "").replace(/\D/g, "");
      const clave = telefono || nombre.toLowerCase();
      const actual = mapa.get(clave) || {
        nombre,
        telefono: pedido.cliente_telefono || "-",
        direccion: pedido.direccion || "-",
        pedidos: 0,
        total: 0,
        ultimaCompra: pedido.created_at,
      };

      actual.pedidos += 1;
      actual.total += Number(pedido.total || 0);
      if (new Date(pedido.created_at) > new Date(actual.ultimaCompra)) {
        actual.ultimaCompra = pedido.created_at;
        actual.direccion = pedido.direccion || actual.direccion;
      }
      mapa.set(clave, actual);
    }

    return Array.from(mapa.values())
      .sort((a, b) => b.total - a.total || b.pedidos - a.pedidos)
      .slice(0, 8);
  }, [pedidos]);
  const pedidosFiltrados = pedidos.filter((pedido) => {
    const textoItems = (pedido.items || []).map((item) => `${item.texto || ""} ${item.nombre || ""}`).join(" ");
    const texto = `
      ${pedido.numero || ""}
      ${pedido.cliente_nombre || ""}
      ${pedido.cliente_telefono || ""}
      ${pedido.direccion || ""}
      ${pedido.notas || ""}
      ${pedido.estado || ""}
      ${textoItems}
    `.toLowerCase();

    return texto.includes(busquedaPedidos.trim().toLowerCase());
  });

  function actualizarAhora() {
    cargarPedidos();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-950">
        <form onSubmit={ingresarAdmin} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow">
          <p className="m-0 font-black text-green-700">EL NONO COQUI</p>
          <h1 className="mb-4 mt-1 text-3xl font-black">Admin pedidos</h1>
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
      <section className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="m-0 font-black text-green-700">EL NONO COQUI</p>
            <h1 className="m-0 text-3xl font-black">Pedidos recibidos</h1>
            <p className="m-0 text-sm font-bold text-slate-600">Pedidos nuevos arriba - {textoFiltro}</p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-3 font-black shadow">
            <input
              type="checkbox"
              checked={autoImprimir}
              onChange={(event) => setAutoImprimir(event.target.checked)}
            />
            Imprimir nuevos automaticamente
          </label>
          <a
            href="/admin/cuenta-corriente"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black shadow"
          >
            Cuenta corriente
          </a>
          <a
            href="/reparto"
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black shadow"
          >
            Reparto
          </a>
          <button
            type="button"
            onClick={salirAdmin}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black shadow"
          >
            Salir
          </button>
        </div>

        <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {([
                ["hoy", "Hoy"],
                ["mes", "Mes"],
                ["todos", "Todos"],
              ] as const).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFiltroReporte(valor)}
                  className={`rounded-xl px-4 py-3 font-black ${
                    filtroReporte === valor
                      ? "bg-green-600 text-white"
                      : "border border-slate-300 bg-white text-slate-950"
                  }`}
                >
                  {texto}
                </button>
              ))}
              <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 font-black">
                <span className="text-sm text-slate-600">Mes</span>
                <input
                  type="month"
                  value={mesReporte}
                  onChange={(event) => {
                    setMesReporte(event.target.value || claveMesActual());
                    setFiltroReporte("mes");
                  }}
                  className="bg-transparent font-black outline-none"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setMontosVisibles((visible) => !visible)}
              aria-label={montosVisibles ? "Ocultar montos" : "Ver montos"}
              title={montosVisibles ? "Ocultar montos" : "Ver montos"}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 font-black ${
                montosVisibles ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-950"
              }`}
            >
              <EyeIcon hidden={!montosVisibles} />
              {montosVisibles ? "Ocultar montos" : "Ver montos"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="m-0 text-sm font-bold text-slate-600">Pedidos</p>
              <strong className="text-2xl">{pedidos.length}</strong>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="m-0 text-sm font-bold text-slate-600">Total vendido</p>
              <strong className="text-2xl">{montoAdmin(totalVendido)}</strong>
            </div>
            <div className="rounded-xl bg-slate-100 p-4">
              <p className="m-0 text-sm font-bold text-slate-600">Promedio</p>
              <strong className="text-2xl">{montoAdmin(promedioPedido)}</strong>
            </div>
          </div>
          <p className="m-0 text-sm font-bold text-slate-600">
            Envios cobrados: {montoAdmin(totalEnvios)}{filtroReporte === "todos" ? " - Mostrando hasta 500 pedidos" : ""}
          </p>
          {clientesReporte.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="m-0 text-lg font-black">Clientes del periodo</h2>
                  <p className="m-0 text-sm font-bold text-slate-600">Ordenados por mayor compra</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-700">
                  Top {clientesReporte.length}
                </span>
              </div>
              <div className="grid gap-2">
                {clientesReporte.map((cliente, index) => (
                  <div
                    key={`${cliente.telefono}-${cliente.nombre}-${index}`}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[2rem_1fr_auto]"
                  >
                    <strong className="text-lg">#{index + 1}</strong>
                    <div>
                      <p className="m-0 font-black">{cliente.nombre}</p>
                      <p className="m-0 text-sm font-bold text-slate-600">
                        {cliente.pedidos} pedido{cliente.pedidos === 1 ? "" : "s"} - Tel: {cliente.telefono}
                      </p>
                      <p className="m-0 text-sm text-slate-600">Dir: {cliente.direccion}</p>
                    </div>
                    <strong className="text-lg text-green-700">{montoAdmin(cliente.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <input
            value={busquedaPedidos}
            onChange={(event) => setBusquedaPedidos(event.target.value)}
            placeholder="Buscar pedido por nombre, telefono, direccion o producto"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold"
          />
          {busquedaPedidos.trim() ? (
            <p className="m-0 text-sm font-bold text-slate-600">
              Mostrando {pedidosFiltrados.length} de {pedidos.length} pedidos
            </p>
          ) : null}
        </div>

        {hayActualizacion ? (
          <button
            type="button"
            onClick={actualizarAhora}
            className="mb-4 w-full rounded-2xl bg-green-600 px-4 py-3 font-black text-white shadow"
          >
            Hay pedidos nuevos o cambios - tocar para actualizar
          </button>
        ) : null}

        {cargando ? (
          <div className="rounded-2xl bg-white p-5 font-bold shadow">Cargando pedidos...</div>
        ) : errorCarga ? (
          <div className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-900 shadow">
            No se pudo leer la tabla de pedidos. Ejecuta primero el SQL de <code>supabase-pedidos.sql</code>.
          </div>
        ) : pedidos.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 font-bold shadow">No hay pedidos para este filtro.</div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 font-bold shadow">No hay pedidos que coincidan con la busqueda.</div>
        ) : (
          <div className="grid gap-3">
            {pedidosFiltrados.map((pedido) => (
              <article key={pedido.id} className="rounded-2xl bg-white p-4 shadow">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
                  <div>
                    <h2 className="m-0 text-xl font-black">
                      {pedido.numero ? `Pedido #${pedido.numero} - ` : ""}
                      {pedido.cliente_nombre || "Sin nombre"}
                    </h2>
                    <p className="m-0 text-sm text-slate-600">
                      {new Date(pedido.created_at).toLocaleString("es-AR")} - {pedido.estado}
                    </p>
                  </div>
                  <strong className="text-2xl">$ {precio(pedido.total)}</strong>
                </div>

                <div className="my-3 grid gap-1">
                  {(pedido.items || []).map((item, index) => (
                    <div key={index} className="flex justify-between gap-3 text-sm">
                      <span className="font-bold">{item.texto || item.nombre}</span>
                      <span>$ {precio(item.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-bold">Envio</span>
                    <span>$ {precio(pedido.envio)}</span>
                  </div>
                </div>

                <div className="grid gap-1 text-sm text-slate-700">
                  <p className="m-0"><strong>Telefono:</strong> {pedido.cliente_telefono || "-"}</p>
                  <p className="m-0"><strong>Direccion:</strong> {pedido.direccion || "-"}</p>
                  {pedido.notas ? <p className="m-0"><strong>Aclaraciones:</strong> {pedido.notas}</p> : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => imprimirPedido(pedido)}
                    className="rounded-xl bg-green-600 px-4 py-3 font-black text-white"
                  >
                    Imprimir ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => marcarImpreso(pedido)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black"
                  >
                    Marcar impreso
                  </button>
                  <button
                    type="button"
                    onClick={() => enviarACuentaCorriente(pedido)}
                    className="rounded-xl bg-amber-500 px-4 py-3 font-black text-white"
                  >
                    Cuenta corriente
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminarPedido(pedido)}
                    className="rounded-xl bg-red-600 px-4 py-3 font-black text-white"
                  >
                    Eliminar
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
