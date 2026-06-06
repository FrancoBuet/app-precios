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
    return productos
      .filter((p) => String(p.nombre || "").toLowerCase().includes(busqueda.toLowerCase()))
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

    return [
      "Hola, quiero hacer este pedido:",
      "",
      ...items.map(
        (item) =>
          `- ${textoCantidadPedido(item)} de ${item.producto.nombre}: $${precio(
            item.producto.precio * item.cantidad
          )}`
      ),
      `- Envio: $${precio(COSTO_ENVIO)}`,
      "",
      `Total: $${precio(total)}`,
      "",
      `Nombre: ${nombre}`,
      `Telefono: ${telefono}`,
      `Direccion: ${direccion}`,
      notas ? `Aclaraciones: ${notas}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function crearUrlWhatsApp() {
    return `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(armarMensaje())}`;
  }

  function actualizarLinkWhatsApp() {
    const enviar = $("enviar");
    if (!enviar) return;

    if (Object.values(carrito).length === 0) {
      enviar.setAttribute("href", "#");
      return;
    }

    enviar.setAttribute("href", crearUrlWhatsApp());
  }

  function enviarPedido(event) {
    const items = Object.values(carrito);
    if (items.length === 0) {
      event.preventDefault();
      mostrarMensaje("Agrega al menos un producto antes de enviar.", "aviso");
      return;
    }
    if (!$("nombre").value.trim()) {
      event.preventDefault();
      mostrarMensaje("Falta tu nombre.", "aviso");
      return;
    }
    if (!$("telefono").value.trim()) {
      event.preventDefault();
      mostrarMensaje("Falta tu telefono.", "aviso");
      return;
    }
    if (!$("direccion").value.trim()) {
      event.preventDefault();
      mostrarMensaje("Falta la direccion de entrega.", "aviso");
      return;
    }

    const mensaje = armarMensaje();
    const url = crearUrlWhatsApp();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(mensaje).catch(() => {});
    }

    $("enviar").setAttribute("href", url);
    mostrarLinkWhatsApp(url);
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
      const inputCantidad = event.target.closest("[data-cantidad]");
      if (!inputCantidad) return;

      const producto = productos.find((p) => String(p.id) === String(inputCantidad.dataset.cantidad));
      if (!producto) return;

      setCantidad(producto, inputCantidad.value);
    });

    $("buscar").addEventListener("input", (event) => {
      busqueda = event.target.value;
      renderProductos();
    });
    ["nombre", "telefono", "direccion", "notas"].forEach((id) => {
      $(id).addEventListener("input", actualizarLinkWhatsApp);
    });
    $("enviar").addEventListener("click", enviarPedido);

    render();
    cargarSupabase();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarPedido);
  } else {
    iniciarPedido();
  }
})();
