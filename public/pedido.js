(function () {
  const script = document.currentScript;
  const params = new URL(script.src).searchParams;
  const WHATSAPP_NEGOCIO = params.get("whatsapp") || "5493496550978";
  const SUPABASE_URL = params.get("supabaseUrl") || "";
  const SUPABASE_ANON_KEY = params.get("supabaseKey") || "";
  const COSTO_ENVIO = Number(params.get("envio") || 1500);
  const PRODUCTOS_PRUEBA = [
    { id: -1, nombre: "PAPAS", presentacion: "KG", kilos: 1, precio: 900, mostrar_publico: true },
    { id: -2, nombre: "CEBOLLA", presentacion: "KG", kilos: 1, precio: 850, mostrar_publico: true },
    { id: -3, nombre: "LIMON", presentacion: "KG", kilos: 1, precio: 1200, mostrar_publico: true },
  ];

  let productos = PRODUCTOS_PRUEBA;
  let carrito = {};
  const listaInicial = new URLSearchParams(window.location.search).get("lista");
  let seccion =
    listaInicial === "mayorista" || listaInicial === "ofertas" || listaInicial === "elaborados"
      ? listaInicial
      : "publico";
  let busqueda = "";
  let usandoPrueba = true;
  const modoAdmin = new URLSearchParams(window.location.search).get("admin") === "1";
  let guardandoPedido = false;

  const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const $ = (id) => document.getElementById(id);

  function precio(valor) {
    return money.format(Math.round(Number(valor || 0)));
  }

  function escaparHtml(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function unidad(producto) {
    const presentacion = String(producto.presentacion || "").toUpperCase().trim();
    if (presentacion === "UNIDAD") return "unidad";
    if (presentacion === "KG") return "kg";
    return presentacion.toLowerCase() || "unidad";
  }

  function cantidadPedido(item) {
    return Number((Number(item.producto.kilos || 1) * item.cantidad).toFixed(2));
  }

  function mostrarCantidad(cantidad) {
    return Number(cantidad || 0).toLocaleString("es-AR", {
      maximumFractionDigits: 2,
    });
  }

  function textoCantidadPedido(item) {
    const cantidad = cantidadPedido(item);
    const presentacion = String(item.producto.presentacion || "").toUpperCase().trim();

    if (presentacion === "UNIDAD") {
      return `${mostrarCantidad(cantidad)} ${cantidad === 1 ? "unidad" : "unidades"}`;
    }
    if (presentacion === "KG") {
      return `${mostrarCantidad(cantidad)} kg`;
    }
    return `${mostrarCantidad(cantidad)} ${unidad(item.producto)}`;
  }

  function pasoCantidad(producto) {
    if (producto.oferta) return 1;
    return String(producto.presentacion || "").toUpperCase().trim() === "KG" ? 0.5 : 1;
  }

  function mostrarMensaje(texto, tipo = "aviso") {
    const box = $("mensaje");
    if (!box) return;
    box.textContent = texto;
    box.className = texto ? tipo : "";
    box.style.display = texto ? "block" : "none";
  }

  function mostrarLinkWhatsApp(url) {
    const box = $("mensaje");
    if (!box) return;
    box.className = "ok";
    box.style.display = "block";
    box.innerHTML = `
      <div>Si WhatsApp no se abre automaticamente, toca este boton:</div>
      <a class="link-whatsapp" href="${url}" target="_self" rel="noopener">Abrir WhatsApp</a>
    `;
  }

  function productosFiltrados() {
    const termino = String(busqueda || "").trim().toLowerCase();
    return productos
      .filter((p) => String(p.nombre || "").toLowerCase().includes(termino))
      .filter((p) => {
        if (seccion === "ofertas") return Boolean(p.oferta);
        if (seccion === "publico") return Boolean(p.mostrar_publico);
        if (seccion === "mayorista") return Boolean(p.mostrar_mayorista);
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
    if (!contenedor) return;
    const lista = productosFiltrados();
    renderTabs();

    if (lista.length === 0) {
      contenedor.innerHTML = '<div class="estado-lista">No hay productos para esta lista.</div>';
      return;
    }

    contenedor.innerHTML = lista
      .map((producto) => {
        const cantidad = carrito[producto.id]?.cantidad || 0;
        return `
          <article class="producto">
            ${producto.imagen ? `<img src="${producto.imagen}" alt="${producto.nombre}" class="imagen-producto">` : ""}
            <div class="producto-info">
              <h2>${producto.nombre}</h2>
              <p>${producto.kilos || 1} ${producto.presentacion || ""} · $${precio(producto.precio)}</p>
              ${producto.oferta ? '<small class="nota-oferta">Se vende por oferta completa</small>' : ""}
            </div>
            <div class="cantidad">
              <button type="button" data-restar="${producto.id}">-</button>
              <input
                type="number"
                min="0"
                step="${pasoCantidad(producto)}"
                value="${cantidad}"
                data-cantidad="${producto.id}"
                aria-label="Cantidad de ${producto.nombre}"
              />
              <button type="button" data-sumar="${producto.id}">+</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderResumen() {
    const items = Object.values(carrito);
    const resumen = $("resumen");
    if (!resumen) return;
    const subtotalProductos = items.reduce(
      (sum, item) => sum + Number(item.producto.precio || 0) * item.cantidad,
      0
    );
    const total = items.length > 0 ? subtotalProductos + COSTO_ENVIO : 0;

    if (items.length === 0) {
      resumen.innerHTML = '<p class="vacio">Todavia no agregaste productos.</p>';
    } else {
      resumen.innerHTML =
        items
          .map(
            (item) => `
          <div class="linea-pedido">
            <div>
              <strong>${textoCantidadPedido(item)} de ${item.producto.nombre}</strong>
              <span>$${precio(item.producto.precio * item.cantidad)}</span>
            </div>
            <button type="button" data-quitar="${item.producto.id}">x</button>
          </div>
        `
          )
          .join("") +
        `
          <div class="linea-envio">
            <strong>Envio</strong>
            <span>$${precio(COSTO_ENVIO)}</span>
          </div>
        `;
    }

    $("total").textContent = "$" + precio(total);
    const imprimir = $("imprimir");
    if (imprimir) {
      imprimir.hidden = !modoAdmin;
      imprimir.disabled = items.length === 0;
    }
    actualizarLinkWhatsApp();
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
    const nueva = producto.oferta ? Math.floor(cantidadNumerica) : cantidadNumerica;

    if (nueva === 0) {
      delete carrito[producto.id];
    } else {
      carrito[producto.id] = { producto, cantidad: Number(nueva.toFixed(2)) };
    }

    render();
  }

  function armarMensaje() {
    const datos = armarDatosPedido();

    return [
      "Hola, quiero hacer este pedido:",
      "",
      ...datos.items.map((item) => `- ${item.texto}: $${precio(item.total)}`),
      `- Envio: $${precio(datos.envio)}`,
      "",
      `Total: $${precio(datos.total)}`,
      "",
      `Nombre: ${datos.cliente_nombre}`,
      `Telefono: ${datos.cliente_telefono}`,
      `Direccion: ${datos.direccion}`,
      datos.notas ? `Aclaraciones: ${datos.notas}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function armarDatosPedido() {
    const itemsCarrito = Object.values(carrito);
    const subtotalProductos = itemsCarrito.reduce(
      (sum, item) => sum + Number(item.producto.precio || 0) * item.cantidad,
      0
    );
    const total = itemsCarrito.length > 0 ? subtotalProductos + COSTO_ENVIO : 0;
    const nombre = $("nombre").value.trim();
    const telefono = $("telefono").value.trim();
    const direccion = $("direccion").value.trim();
    const notas = $("notas").value.trim();

    const items = itemsCarrito.map((item) => ({
      producto_id: item.producto.id,
      nombre: item.producto.nombre,
      texto: `${textoCantidadPedido(item)} de ${item.producto.nombre}`,
      cantidad: item.cantidad,
      presentacion: item.producto.presentacion || "",
      kilos: Number(item.producto.kilos || 1),
      precio_unitario: Number(item.producto.precio || 0),
      total: Number(item.producto.precio || 0) * item.cantidad,
      oferta: Boolean(item.producto.oferta),
    }));

    return {
      cliente_nombre: nombre,
      cliente_telefono: telefono,
      direccion,
      notas,
      items,
      subtotal: subtotalProductos,
      envio: items.length > 0 ? COSTO_ENVIO : 0,
      total,
      origen: "pedido-web",
    };
  }

  function crearUrlWhatsApp() {
    return `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(armarMensaje())}`;
  }

  function armarHtmlTicket() {
    const items = Object.values(carrito);
    const subtotalProductos = items.reduce(
      (sum, item) => sum + Number(item.producto.precio || 0) * item.cantidad,
      0
    );
    const total = items.length > 0 ? subtotalProductos + COSTO_ENVIO : 0;
    const nombre = $("nombre").value.trim();
    const telefono = $("telefono").value.trim();
    const direccion = $("direccion").value.trim();
    const notas = $("notas").value.trim();
    const fecha = new Date().toLocaleString("es-AR", {
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
            html {
              width: 80mm;
              margin: 0;
              padding: 0;
            }
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
          <h2>Pedido</h2>
          <p class="fecha">${escaparHtml(fecha)}</p>
          <div class="corte"></div>
          ${items
            .map(
              (item) => `
                <div class="linea">
                  <span class="producto">${escaparHtml(
                    `${textoCantidadPedido(item)} de ${item.producto.nombre}`
                  )}</span>
                  <span class="precio">$${precio(item.producto.precio * item.cantidad)}</span>
                </div>
              `
            )
            .join("")}
          <div class="linea">
            <span class="producto">Envio</span>
            <span class="precio">$${precio(COSTO_ENVIO)}</span>
          </div>
          <div class="corte"></div>
          <div class="total">
            <span>Total</span>
            <span>$${precio(total)}</span>
          </div>
          <div class="corte"></div>
          <p class="dato"><strong>Nombre:</strong> ${escaparHtml(nombre)}</p>
          <p class="dato"><strong>Telefono:</strong> ${escaparHtml(telefono)}</p>
          <p class="dato"><strong>Direccion:</strong> ${escaparHtml(direccion)}</p>
          ${notas ? `<p class="dato"><strong>Aclaraciones:</strong> ${escaparHtml(notas)}</p>` : ""}
          <div class="corte"></div>
          <p class="pie">Gracias por tu pedido</p>
          <script>
            window.addEventListener("load", () => {
              window.print();
            });
          </script>
        </body>
      </html>`;
  }

  function imprimirTicket() {
    if (Object.values(carrito).length === 0) {
      mostrarMensaje("Agrega al menos un producto antes de imprimir.", "aviso");
      return;
    }

    const ventana = window.open("", "_blank", "width=380,height=640");
    if (!ventana) {
      mostrarMensaje("El navegador bloqueo la ventana de impresion. Habilita ventanas emergentes.", "aviso");
      return;
    }

    ventana.document.open();
    ventana.document.write(armarHtmlTicket());
    ventana.document.close();
  }

  function actualizarLinkWhatsApp() {
    const enviar = $("enviar");
    if (!enviar) return;

    if (Object.values(carrito).length === 0) {
      enviar.setAttribute("href", "#");
      enviar.textContent = "Agrega productos para enviar por WhatsApp";
      return;
    }

    enviar.setAttribute("href", crearUrlWhatsApp());
    enviar.textContent = "Enviar pedido por WhatsApp";
    mostrarLinkWhatsApp(crearUrlWhatsApp());
  }

  async function guardarPedidoSupabase() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || Object.values(carrito).length === 0) {
      return null;
    }

    const datos = armarDatosPedido();
    const mensaje = armarMensaje();

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ ...datos, mensaje }),
      });

      if (!response.ok) throw new Error("No se pudo guardar el pedido");
      return true;
    } catch {
      return null;
    }
  }

  async function prepararEnvioWhatsApp(event) {
    const enviar = event.target.closest("#enviar");
    if (!enviar) return;
    event.preventDefault();

    if (Object.values(carrito).length === 0) {
      mostrarMensaje("Agrega al menos un producto antes de enviar.", "aviso");
      return;
    }

    if (guardandoPedido) return;
    guardandoPedido = true;
    enviar.textContent = "Preparando pedido...";

    await guardarPedidoSupabase();

    const url = crearUrlWhatsApp();
    enviar.setAttribute("href", url);
    enviar.textContent = "Enviar pedido por WhatsApp";
    guardandoPedido = false;
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
      const response = await fetch(`${SUPABASE_URL}/rest/v1/productos?select=*&order=nombre.asc`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: controller.signal,
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

  function iniciarPedido() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      const enviar = target.closest("#enviar");
      const imprimir = target.closest("#imprimir");
      const lista = target.closest("[data-lista]");
      const sumar = target.closest("[data-sumar]");
      const restar = target.closest("[data-restar]");
      const quitar = target.closest("[data-quitar]");

      if (imprimir) {
        imprimirTicket();
        return;
      }
      if (enviar) {
        prepararEnvioWhatsApp(event);
        return;
      }
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

    const imprimir = $("imprimir");
    if (imprimir) {
      imprimir.hidden = !modoAdmin;
    }

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

    ["nombre", "telefono", "direccion", "notas"].forEach((id) => {
      const campo = $(id);
      ["input", "change", "keyup", "blur"].forEach((evento) => {
        campo.addEventListener(evento, actualizarLinkWhatsApp);
      });
    });

    render();
    cargarSupabase();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarPedido);
  } else {
    iniciarPedido();
  }
})();
