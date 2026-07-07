import type { CSSProperties } from "react";

const WHATSAPP_NEGOCIO = "5493496550978";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const COSTO_ENVIO = 1500;
const PEDIDO_SCRIPT_VERSION = "datos-obligatorios-1";

export default function PedidoPage() {
  const pedidoScriptSrc = `/pedido.js?whatsapp=${WHATSAPP_NEGOCIO}&envio=${COSTO_ENVIO}&supabaseUrl=${encodeURIComponent(
    SUPABASE_URL
  )}&supabaseKey=${encodeURIComponent(SUPABASE_ANON_KEY)}&v=${PEDIDO_SCRIPT_VERSION}`;
  const script = `
    const WHATSAPP_NEGOCIO = ${JSON.stringify(WHATSAPP_NEGOCIO)};
    const SUPABASE_URL = ${JSON.stringify(SUPABASE_URL)};
    const SUPABASE_ANON_KEY = ${JSON.stringify(SUPABASE_ANON_KEY)};
    const COSTO_ENVIO = ${COSTO_ENVIO};
    const PRODUCTOS_PRUEBA = [
      { id: -1, nombre: "PAPAS", presentacion: "KG", kilos: 1, precio: 900, mostrar_publico: true, mostrar_mayorista: true },
      { id: -2, nombre: "CEBOLLA", presentacion: "KG", kilos: 1, precio: 850, mostrar_publico: true, mostrar_mayorista: true },
      { id: -3, nombre: "LIMON", presentacion: "KG", kilos: 1, precio: 1200, mostrar_publico: true, mostrar_mayorista: true }
    ];

    let productos = PRODUCTOS_PRUEBA;
    let carrito = {};
    const listaInicial = new URLSearchParams(window.location.search).get("lista");
    let seccion =
      listaInicial === "ofertas" || listaInicial === "elaborados"
        ? listaInicial
        : "publico";
    let busqueda = "";
    let usandoPrueba = true;

    const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
    const $ = (id) => document.getElementById(id);

    function precio(valor) {
      return money.format(Math.round(Number(valor || 0)));
    }

    function unidad(producto) {
      const presentacion = String(producto.presentacion || "").toUpperCase().trim();
      if (presentacion === "UNIDAD") return "unidad";
      if (presentacion === "KG") return "kg";
      return presentacion.toLowerCase() || "unidad";
    }

    function cantidadPedido(item) {
      return Number(((Number(item.producto.kilos || 1)) * item.cantidad).toFixed(2));
    }

    function textoCantidadPedido(item) {
      const cantidad = cantidadPedido(item);
      const presentacion = String(item.producto.presentacion || "").toUpperCase().trim();

      if (presentacion === "UNIDAD") {
        return \`\${mostrarCantidad(cantidad)} \${cantidad === 1 ? "unidad" : "unidades"}\`;
      }

      if (presentacion === "KG") {
        return \`\${mostrarCantidad(cantidad)} kg\`;
      }

      return \`\${mostrarCantidad(cantidad)} \${unidad(item.producto)}\`;
    }

    function pasoCantidad(producto) {
      if (producto.oferta) return 1;
      return String(producto.presentacion || "").toUpperCase().trim() === "KG" ? 0.5 : 1;
    }

    function mostrarCantidad(cantidad) {
      return Number(cantidad || 0).toLocaleString("es-AR", {
        maximumFractionDigits: 2,
      });
    }

    function mostrarMensaje(texto, tipo = "aviso") {
      const box = $("mensaje");
      box.textContent = texto;
      box.className = texto ? tipo : "";
      box.style.display = texto ? "block" : "none";
    }

    function productosFiltrados() {
      const termino = String(busqueda || "").trim().toLowerCase();

      return productos
        .filter((p) => String(p.nombre || "").toLowerCase().includes(termino))
        .filter((p) => {
          if (seccion === "ofertas") return Boolean(p.oferta);
          if (seccion === "publico") return Boolean(p.mostrar_publico);
          if (seccion === "elaborados") return Boolean(p.mostrar_elaborados);
          return true;
        });
    }

    function renderTabs() {
      document.querySelectorAll("[data-lista]").forEach((button) => {
        button.classList.toggle("activo", button.dataset.lista === seccion);
      });
    }

    function renderProductos() {
      const contenedor = $("productos");
      const lista = productosFiltrados();
      renderTabs();

      if (lista.length === 0) {
        contenedor.innerHTML = '<div class="estado-lista">No hay productos para esta lista.</div>';
        return;
      }

      contenedor.innerHTML = lista.map((producto) => {
        const cantidad = carrito[producto.id]?.cantidad || 0;
        return \`
          <article class="producto">
            \${producto.imagen ? \`<img src="\${producto.imagen}" alt="\${producto.nombre}" class="imagen-producto">\` : ""}
            <div class="producto-info">
              <h2>\${producto.nombre}</h2>
              <p>\${producto.kilos || 1} \${producto.presentacion || ""} · $\${precio(producto.precio)}</p>
              \${producto.oferta ? '<small class="nota-oferta">Se vende por oferta completa</small>' : ""}
            </div>
            <div class="cantidad">
              <button type="button" data-restar="\${producto.id}">-</button>
              <input
                type="number"
                min="0"
                step="\${pasoCantidad(producto)}"
                value="\${cantidad}"
                data-cantidad="\${producto.id}"
                aria-label="Cantidad de \${producto.nombre}"
              />
              <button type="button" data-sumar="\${producto.id}">+</button>
            </div>
          </article>
        \`;
      }).join("");
    }

    function renderResumen() {
      const items = Object.values(carrito);
      const resumen = $("resumen");
      const subtotalProductos = items.reduce((sum, item) => sum + Number(item.producto.precio || 0) * item.cantidad, 0);
      const total = items.length > 0 ? subtotalProductos + COSTO_ENVIO : 0;

      if (items.length === 0) {
        resumen.innerHTML = '<p class="vacio">Todavia no agregaste productos.</p>';
      } else {
        resumen.innerHTML = items.map((item) => \`
          <div class="linea-pedido">
            <div>
              <strong>\${textoCantidadPedido(item)} de \${item.producto.nombre}</strong>
              <span>$\${precio(item.producto.precio * item.cantidad)}</span>
            </div>
            <button type="button" data-quitar="\${item.producto.id}">x</button>
          </div>
        \`).join("") + \`
          <div class="linea-envio">
            <strong>Envio</strong>
            <span>$\${precio(COSTO_ENVIO)}</span>
          </div>
        \`;
      }

      $("total").textContent = "$" + precio(total);
    }

    function render() {
      renderProductos();
      renderResumen();
      if (usandoPrueba) {
        mostrarMensaje("Productos de prueba cargados. Ya podes probar el pedido por WhatsApp.", "ok");
      }
    }

    function cambiarCantidad(id, diferencia) {
      const producto = productos.find((p) => String(p.id) === String(id));
      if (!producto) return;

      const actual = carrito[producto.id]?.cantidad || 0;
      const paso = pasoCantidad(producto);
      const nueva = Math.max(0, Number((actual + diferencia * paso).toFixed(2)));
      setCantidad(producto, nueva);
    }

    function setCantidad(producto, cantidad) {
      const cantidadNumerica = Math.max(0, Number(cantidad) || 0);
      const nueva = producto.oferta
        ? Math.floor(cantidadNumerica)
        : cantidadNumerica;

      if (nueva === 0) {
        delete carrito[producto.id];
      } else {
        carrito[producto.id] = { producto, cantidad: Number(nueva.toFixed(2)) };
      }

      render();
    }

    function armarMensaje() {
      const items = Object.values(carrito);
      const subtotalProductos = items.reduce((sum, item) => sum + Number(item.producto.precio || 0) * item.cantidad, 0);
      const total = items.length > 0 ? subtotalProductos + COSTO_ENVIO : 0;
      const nombre = $("nombre").value.trim();
      const telefono = $("telefono").value.trim();
      const direccion = $("direccion").value.trim();
      const notas = $("notas").value.trim();

      return [
        "Hola, quiero hacer este pedido:",
        "",
        ...items.map((item) => \`- \${textoCantidadPedido(item)} de \${item.producto.nombre}: $\${precio(item.producto.precio * item.cantidad)}\`),
        \`- Envio: $\${precio(COSTO_ENVIO)}\`,
        "",
        \`Total: $\${precio(total)}\`,
        "",
        \`Nombre: \${nombre}\`,
        \`Telefono: \${telefono}\`,
        \`Direccion: \${direccion}\`,
        notas ? \`Aclaraciones: \${notas}\` : ""
      ].filter(Boolean).join("\\n");
    }

    function enviarPedido() {
      const items = Object.values(carrito);
      if (items.length === 0) {
        mostrarMensaje("Agrega al menos un producto antes de enviar.", "aviso");
        return;
      }
      if (!$("nombre").value.trim()) {
        mostrarMensaje("Falta tu nombre.", "aviso");
        return;
      }
      if (!$("telefono").value.trim()) {
        mostrarMensaje("Falta tu telefono.", "aviso");
        return;
      }
      if (!$("direccion").value.trim()) {
        mostrarMensaje("Falta la direccion de entrega.", "aviso");
        return;
      }

      const mensaje = armarMensaje();
      const esMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const baseWhatsApp = esMobile
        ? "https://api.whatsapp.com/send"
        : "https://web.whatsapp.com/send";
      const url = \`\${baseWhatsApp}?phone=\${WHATSAPP_NEGOCIO}&text=\${encodeURIComponent(mensaje)}\`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(mensaje).catch(() => {});
      }

      mostrarMensaje("Abriendo WhatsApp con tu pedido...", "ok");
      window.location.href = url;
    }

    async function cargarSupabase() {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        render();
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(\`\${SUPABASE_URL}/rest/v1/productos?select=*&order=nombre.asc\`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: \`Bearer \${SUPABASE_ANON_KEY}\`
          },
          signal: controller.signal
        });
        window.clearTimeout(timeout);
        if (!response.ok) throw new Error("Supabase no respondio correctamente");
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          productos = data;
          carrito = {};
          usandoPrueba = false;
          mostrarMensaje("", "ok");
          render();
        }
      } catch {
        usandoPrueba = true;
        render();
      }
    }

    document.addEventListener("click", (event) => {
      const target = event.target;
      const lista = target.closest("[data-lista]");
      const sumar = target.closest("[data-sumar]");
      const restar = target.closest("[data-restar]");
      const quitar = target.closest("[data-quitar]");

      if (lista) {
        seccion = lista.dataset.lista;
        render();
        return;
      }
      if (sumar) {
        cambiarCantidad(sumar.dataset.sumar, 1);
        return;
      }
      if (restar) {
        cambiarCantidad(restar.dataset.restar, -1);
        return;
      }
      if (quitar) {
        delete carrito[quitar.dataset.quitar];
        render();
      }
    });

    document.addEventListener("input", (event) => {
      const target = event.target;

      if (target?.id === "buscar") {
        busqueda = target.value;
        renderProductos();
        return;
      }

      const inputCantidad = target.closest("[data-cantidad]");
      if (!inputCantidad) return;

      const producto = productos.find((p) => String(p.id) === String(inputCantidad.dataset.cantidad));
      if (!producto) return;

      setCantidad(producto, inputCantidad.value);
    });
    $("enviar").addEventListener("click", enviarPedido);

    render();
    cargarSupabase();
  `;

  return (
    <main style={pagina}>
      <style>{css}</style>
      <header style={header}>
        <div>
          <p style={marca}>EL NONO COQUI</p>
          <h1 style={titulo}>Hace tu pedido</h1>
          <p style={subtitulo}>
            Elegi productos de la lista actual, completa tus datos y mandanos el
            pedido con precio total.
          </p>
        </div>

      </header>

      <div id="mensaje" style={{ display: "none" }} />

      <div className="layout-pedido">
        <section className="panel">
          <div className="filtros">
            <button type="button" data-lista="publico">
              Publico
            </button>
            <button type="button" data-lista="mayorista">
              Mayorista
            </button>
            <button type="button" data-lista="ofertas">
              Ofertas
            </button>
            <button type="button" data-lista="elaborados">
              Elaborados
            </button>
          </div>

          <input id="buscar" placeholder="Buscar producto" />
          <div id="productos" className="lista-productos" />
        </section>

        <aside className="panel">
          <h2 className="resumen-titulo">Tu pedido</h2>
          <div id="resumen" />
          <div className="total-box">
            <span>Total</span>
            <strong id="total">$0</strong>
          </div>

          <input id="nombre" placeholder="Nombre" required />
          <input id="telefono" placeholder="Telefono" required />
          <textarea id="direccion" placeholder="Direccion de entrega" required />
          <textarea id="notas" placeholder="Aclaraciones" />

          <button id="imprimir" type="button" className="imprimir" disabled hidden>
            Imprimir ticket
          </button>
          <a id="enviar" href="#" className="enviar" rel="noopener">
            Enviar pedido por WhatsApp
          </a>
        </aside>
      </div>

      <script src={pedidoScriptSrc} />
    </main>
  );
}

const pagina: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg,#f8fafc 0%,#e0f2fe 100%)",
  color: "#111827",
  padding: 16,
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  maxWidth: 1180,
  margin: "0 auto 16px",
};

const marca: CSSProperties = {
  margin: 0,
  color: "#16a34a",
  fontWeight: 900,
  letterSpacing: 0,
};

const titulo: CSSProperties = {
  margin: "2px 0",
  fontSize: "clamp(30px, 6vw, 52px)",
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: 0,
};

const subtitulo: CSSProperties = {
  margin: 0,
  color: "#4b5563",
  maxWidth: 620,
};

const css = `
  #mensaje {
    max-width: 1180px;
    margin: 0 auto 16px;
    padding: 12px;
    border-radius: 14px;
    font-weight: 800;
  }
  #mensaje.aviso {
    display: block !important;
    background: #fef3c7;
    color: #92400e;
  }
  #mensaje.ok {
    display: block !important;
    background: #dcfce7;
    color: #166534;
  }
  .link-whatsapp {
    display: block;
    width: 100%;
    margin-top: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: #16a34a;
    color: white;
    text-align: center;
    text-decoration: none;
    font-weight: 900;
  }
  .layout-pedido {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr);
    gap: 16px;
    max-width: 1180px;
    margin: 0 auto;
  }
  .panel {
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(255,255,255,.75);
    border-radius: 20px;
    padding: 14px;
    box-shadow: 0 12px 28px rgba(15,23,42,.1);
  }
  .filtros {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 10px;
  }
  .filtros button {
    border: none;
    border-radius: 14px;
    padding: 12px 10px;
    background: #e5e7eb;
    color: #374151;
    font-weight: 900;
    font-size: 16px;
    cursor: pointer;
    min-width: 0;
  }
  .filtros button.activo {
    background: #16a34a;
    color: white;
  }
  input, textarea {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 14px;
    padding: 13px 14px;
    font-size: 15px;
    margin-bottom: 10px;
    outline: none;
    background: white;
    color: #111827;
  }
  textarea {
    min-height: 86px;
    resize: vertical;
  }
  .lista-productos {
    display: grid;
    gap: 9px;
  }
  .estado-lista, .vacio {
    background: #f3f4f6;
    color: #6b7280;
    padding: 12px;
    border-radius: 14px;
    margin: 0;
    font-weight: 800;
  }
  .producto {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 10px;
    background: white;
  }
  .imagen-producto {
    width: 58px;
    height: 58px;
    object-fit: contain;
    border-radius: 12px;
    background: #f9fafb;
  }
  .producto-info {
    flex: 1;
    min-width: 0;
  }
  .producto h2 {
    margin: 0;
    font-size: 16px;
    line-height: 1.15;
    font-weight: 900;
    text-transform: uppercase;
  }
  .producto p {
    margin: 5px 0 0;
    color: #4b5563;
    font-size: 13px;
    font-weight: 700;
  }
  .nota-oferta {
    display: block;
    margin-top: 5px;
    color: #dc2626;
    font-weight: 900;
    font-size: 12px;
  }
  .cantidad {
    display: grid;
    grid-template-columns: 36px 62px 36px;
    align-items: center;
    gap: 4px;
  }
  .cantidad button {
    border: none;
    border-radius: 12px;
    min-height: 36px;
    background: #dcfce7;
    color: #166534;
    font-weight: 900;
    font-size: 20px;
    cursor: pointer;
  }
  .cantidad input {
    text-align: center;
    font-weight: 900;
    padding: 0;
    margin: 0;
    min-height: 36px;
    border-radius: 12px;
    font-size: 14px;
  }
  .resumen-titulo {
    margin: 0 0 12px;
    font-size: 22px;
  }
  .linea-pedido {
    display: grid;
    grid-template-columns: 1fr 34px;
    gap: 8px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }
  .linea-pedido span {
    display: block;
    margin-top: 3px;
    color: #16a34a;
    font-weight: 900;
  }
  .campos-manuales {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 8px;
  }
  .campo-manual {
    display: grid;
    gap: 4px;
    margin-top: 8px;
    color: #334155;
    font-size: 12px;
    font-weight: 900;
  }
  .campo-manual input {
    width: 100%;
    min-height: 36px;
    margin: 0;
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #fff;
    color: #0f172a;
    font: inherit;
  }
  .linea-pedido button {
    border: none;
    border-radius: 10px;
    min-height: 34px;
    background: #fee2e2;
    color: #991b1b;
    font-weight: 900;
    cursor: pointer;
  }
  .linea-envio {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    background: #ecfdf5;
    color: #166534;
    border-radius: 12px;
    padding: 10px 12px;
    margin-top: 8px;
    font-weight: 900;
  }
  .envio-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    color: #166534;
    font-size: 12px;
    font-weight: 900;
  }
  .envio-toggle input {
    width: 16px;
    height: 16px;
    margin: 0;
  }
  .total-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 2px solid #111827;
    margin-top: 14px;
    padding-top: 12px;
    margin-bottom: 14px;
    font-size: 22px;
    font-weight: 900;
  }
  .enviar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    border: none;
    border-radius: 16px;
    min-height: 52px;
    background: linear-gradient(135deg,#16a34a,#22c55e);
    color: white;
    font-size: 16px;
    font-weight: 900;
    cursor: pointer;
    text-decoration: none;
  }
  .imprimir {
    width: 100%;
    border: 1px solid #111827;
    border-radius: 16px;
    min-height: 48px;
    margin-bottom: 10px;
    background: white;
    color: #111827;
    font-size: 16px;
    font-weight: 900;
    cursor: pointer;
  }
  .imprimir:disabled {
    opacity: .45;
    cursor: not-allowed;
  }
  @media (max-width: 860px) {
    .layout-pedido {
      grid-template-columns: 1fr;
    }
    .filtros {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }
    .filtros button {
      padding: 11px 6px;
      font-size: 14px;
      border-radius: 12px;
    }
  }
  @media (max-width: 380px) {
    .filtros button {
      font-size: 12px;
      padding-inline: 4px;
    }
  }
`;
