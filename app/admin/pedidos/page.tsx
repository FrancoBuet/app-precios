"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type ItemPedido = {
  texto?: string;
  nombre?: string;
  total?: number;
};

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

function escaparHtml(texto: string | number | null | undefined) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const impresosRef = useRef<Set<string>>(new Set());

  const cargarPedidos = useCallback(async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      setErrorCarga(error.message);
    } else if (Array.isArray(data)) {
      setErrorCarga("");
      setPedidos(data as Pedido[]);
    }
    setCargando(false);
  }, []);

  async function marcarImpreso(pedido: Pedido) {
    await supabase
      .from("pedidos")
      .update({ estado: "impreso", impreso_at: new Date().toISOString() })
      .eq("id", pedido.id);
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
    const timer = window.setInterval(cargarPedidos, 6000);
    return () => window.clearInterval(timer);
  }, [autorizado, cargarPedidos]);

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
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-3 font-black shadow">
            <input
              type="checkbox"
              checked={autoImprimir}
              onChange={(event) => setAutoImprimir(event.target.checked)}
            />
            Imprimir nuevos automaticamente
          </label>
          <button
            type="button"
            onClick={salirAdmin}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-black shadow"
          >
            Salir
          </button>
        </div>

        {cargando ? (
          <div className="rounded-2xl bg-white p-5 font-bold shadow">Cargando pedidos...</div>
        ) : errorCarga ? (
          <div className="rounded-2xl bg-amber-50 p-5 font-bold text-amber-900 shadow">
            No se pudo leer la tabla de pedidos. Ejecuta primero el SQL de <code>supabase-pedidos.sql</code>.
          </div>
        ) : pedidos.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 font-bold shadow">Todavia no hay pedidos guardados.</div>
        ) : (
          <div className="grid gap-3">
            {pedidos.map((pedido) => (
              <article key={pedido.id} className="rounded-2xl bg-white p-4 shadow">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
                  <div>
                    <h2 className="m-0 text-xl font-black">
                      {pedido.numero ? `Pedido #${pedido.numero} · ` : ""}
                      {pedido.cliente_nombre || "Sin nombre"}
                    </h2>
                    <p className="m-0 text-sm text-slate-600">
                      {new Date(pedido.created_at).toLocaleString("es-AR")} · {pedido.estado}
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
