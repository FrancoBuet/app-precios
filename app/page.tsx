"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState("");
  const [productos, setProductos] = useState<any[]>([]);

  const [nombre, setNombre] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [kilos, setKilos] = useState("");
  const [precio, setPrecio] = useState("");

  const [oferta, setOferta] = useState(false);
  const [mostrarMayorista, setMostrarMayorista] = useState(true);
  const [mostrarPublico, setMostrarPublico] = useState(true);
  const [mostrarElaborados, setMostrarElaborados] = useState(false);
  const [precioMayoristaManual, setPrecioMayoristaManual] = useState(false);

  const [imagen, setImagen] = useState<File | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState("mayorista");

  const [user, setUser] = useState<any>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [listaCompartida, setListaCompartida] = useState("");
  const [mostrarOpcionesCompartir, setMostrarOpcionesCompartir] = useState(false);
  const [mostrarOpcionesPDF, setMostrarOpcionesPDF] = useState(false);

  const listasDisponibles = [
    { tipo: "ofertas", nombre: "Ofertas", color: "#dc2626" },
    { tipo: "mayorista", nombre: "Mayorista", color: "#2563eb" },
    { tipo: "publico", nombre: "Publico", color: "#16a34a" },
    { tipo: "elaborados", nombre: "Elaborados", color: "#7c3aed" },
  ];

  useEffect(() => {
    const temaGuardado = localStorage.getItem("darkMode");

    if (temaGuardado === "true") {
      setDarkMode(true);
    }

    const params = new URLSearchParams(window.location.search);
    const lista = params.get("lista");

    if (
      lista === "publico" ||
      lista === "mayorista" ||
      lista === "ofertas" ||
      lista === "elaborados"
    ) {
      setSeccion(lista);
      setListaCompartida(lista);
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    obtenerProductos();
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function obtenerProductos() {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("nombre", { ascending: true });

    setProductos(data || []);
  }

  function mostrarMensaje(texto: string) {
    setMensaje(texto);

    setTimeout(() => {
      setMensaje("");
    }, 3000);
  }

  async function agregarProducto() {
    if (!nombre || !precio) {
      alert("Completa nombre y precio");
      return;
    }

    setLoading(true);

    let imagenUrl = preview || "";

    if (imagen) {
      const nombreArchivo = `${Date.now()}-${imagen.name}`;

      const { error: uploadError } = await supabase.storage
        .from("productos")
        .upload(nombreArchivo, imagen);

      if (uploadError) {
        alert(uploadError.message);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("productos")
        .getPublicUrl(nombreArchivo);

      imagenUrl = data.publicUrl;
    }

    const esSoloMayorista =
      mostrarMayorista &&
      !mostrarPublico &&
      !oferta &&
      !mostrarElaborados;

    const precioFinal = esSoloMayorista
      ? Math.round(Number(precio) * (precioMayoristaManual ? 1 : 1.3))
      : Math.round(Number(precio));

    const productoData = {
      nombre: nombre.trim().toUpperCase(),
      presentacion: presentacion.trim().toUpperCase(),
      kilos: Number(kilos),
      precio: precioFinal,
      mostrar_mayorista: mostrarMayorista,
      mostrar_publico: mostrarPublico,
      mostrar_elaborados: mostrarElaborados,
      oferta,
      imagen: imagenUrl,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("productos")
        .update(productoData)
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      mostrarMensaje("Producto actualizado correctamente");
      setEditandoId(null);
    } else {
      const { error } = await supabase.from("productos").insert([productoData]);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      mostrarMensaje(
        esSoloMayorista
          ? precioMayoristaManual
            ? "Producto mayorista agregado con precio manual"
            : "Producto agregado con 30% mayorista"
          : "Producto agregado correctamente"
      );
    }

    limpiarFormulario();
    obtenerProductos();
    setLoading(false);
  }

  function limpiarFormulario() {
    setNombre("");
    setPresentacion("");
    setKilos("");
    setPrecio("");
    setOferta(false);
    setMostrarMayorista(true);
    setMostrarPublico(true);
    setMostrarElaborados(false);
    setPrecioMayoristaManual(false);
    setImagen(null);
    setPreview("");
  }

  async function eliminarProducto(id: number) {
    const confirmar = confirm("¿Seguro que querés eliminar este producto?");

    if (!confirmar) return;

    await supabase.from("productos").delete().eq("id", id);

    obtenerProductos();
    mostrarMensaje("Producto eliminado");
  }

  async function cambiarStock(producto: any) {
    const sinStock = !Boolean(producto.sin_stock);
    const { error } = await supabase
      .from("productos")
      .update({ sin_stock: sinStock })
      .eq("id", producto.id);

    if (error) {
      alert(error.message);
      return;
    }

    await obtenerProductos();
    mostrarMensaje(sinStock ? "Producto marcado sin stock" : "Producto reactivado");
  }

  function editarProducto(producto: any) {
    setEditandoId(producto.id);
    setNombre(producto.nombre || "");
    setPresentacion(producto.presentacion || "");
    setKilos(producto.kilos?.toString() || "");
    setPrecio(producto.precio?.toString() || "");
    setOferta(producto.oferta || false);
    setMostrarMayorista(producto.mostrar_mayorista ?? true);
    setMostrarPublico(producto.mostrar_publico ?? true);
    setMostrarElaborados(producto.mostrar_elaborados ?? false);
    setPrecioMayoristaManual(
      Boolean(
        producto.mostrar_mayorista &&
          !producto.mostrar_publico &&
          !producto.oferta &&
          !producto.mostrar_elaborados
      )
    );

    if (producto.imagen) {
      setPreview(producto.imagen);
    } else {
      setPreview("");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function formatearPrecio(valor: number) {
    return Math.round(Number(valor)).toLocaleString("es-AR");
  }

  function formatearCantidad(cantidad: number, presentacion: string) {
    const pres = (presentacion || "").toUpperCase().trim();

    if (pres === "UNIDAD") {
      return `${cantidad} ${cantidad === 1 ? "UNIDAD" : "UNIDADES"}`;
    }

    if (pres === "KG") {
      return `${cantidad} KG`;
    }

    return `${cantidad} ${pres}`;
  }

  function obtenerProductosParaPDF(tipo: string) {
    let lista = productos.filter((producto) => producto.sin_stock !== true);

    if (tipo === "ofertas") {
      lista = lista.filter((p) => p.oferta);
    }

    if (tipo === "mayorista") {
      lista = lista.filter((p) => p.mostrar_mayorista);
    }

    if (tipo === "publico") {
      lista = lista.filter((p) => p.mostrar_publico);
    }

    if (tipo === "elaborados") {
      lista = lista.filter((p) => p.mostrar_elaborados);
    }

    return lista.sort((a, b) =>
      String(a.nombre || "").localeCompare(String(b.nombre || ""))
    );
  }

  async function generarPDF(tipo: string) {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    const titulos: Record<string, string> = {
      mayorista: "LISTA MAYORISTA",
      publico: "LISTA PUBLICO",
      ofertas: "LISTA DE OFERTAS",
      elaborados: "LISTA ELABORADOS",
    };

    const lista = obtenerProductosParaPDF(tipo);

    const fecha = new Date().toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setFontSize(20);
    doc.text("EL NONO COQUI", 14, 18);

    doc.setFontSize(12);
    doc.text("Esperanza - Santa Fe", 14, 26);
    doc.text(titulos[tipo], 14, 36);
    doc.text(`Actualizado: ${fecha}`, 14, 44);

    const filas = lista.map((producto) => [
      producto.nombre || "",
      formatearCantidad(producto.kilos, producto.presentacion),
      `$${formatearPrecio(producto.precio)}`,
    ]);

    autoTable(doc, {
      head: [["Producto", "Cantidad", "Precio"]],
      body: filas,
      startY: 52,
      styles: {
        fontSize: 11,
        cellPadding: 3,
      },
      headStyles: {
        fillColor:
          tipo === "ofertas"
            ? [220, 38, 38]
            : tipo === "mayorista"
            ? [37, 99, 235]
            : tipo === "elaborados"
            ? [124, 58, 237]
            : [22, 163, 74],
        textColor: [255, 255, 255],
      },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 45 },
        2: { cellWidth: 40, halign: "right" },
      },
    });

    doc.setFontSize(10);
    doc.text(
      "Pedidos por WhatsApp: 3496 550978",
      14,
      doc.internal.pageSize.height - 12
    );

    doc.save(`${titulos[tipo].toLowerCase().replaceAll(" ", "-")}.pdf`);
  }

  function compartirLista(tipo: string) {
    const lista = listasDisponibles.find((item) => item.tipo === tipo);
    navigator.clipboard.writeText(`${window.location.origin}/?lista=${tipo}`);
    mostrarMensaje(`Link ${lista?.nombre || tipo} copiado`);
    setMostrarOpcionesCompartir(false);
  }

  let productosFiltrados = productos.filter(
    (producto) =>
      (user || producto.sin_stock !== true) &&
      producto.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (seccion === "ofertas") {
    productosFiltrados = productosFiltrados.filter((p) => p.oferta);
  }

  if (seccion === "mayorista") {
    productosFiltrados = productosFiltrados.filter((p) => p.mostrar_mayorista);
  }

  if (seccion === "publico") {
    productosFiltrados = productosFiltrados.filter((p) => p.mostrar_publico);
  }

  if (seccion === "elaborados") {
    productosFiltrados = productosFiltrados.filter(
      (p) => p.mostrar_elaborados
    );
  }

  return (
    <div
      style={{
        padding: 15,
        paddingBottom: 100,
        background: darkMode
          ? "linear-gradient(180deg, #020617 0%, #111827 100%)"
          : "linear-gradient(180deg, #f8fafc 0%, #dbeafe 100%)",
        minHeight: "100vh",
        color: darkMode ? "white" : "#111827",
        transition: "0.3s",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flex: 1,
          }}
        >
          <img
            src="/logo.png"
            alt="logo"
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              objectFit: "cover",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            }}
          />

          <div>
            <h1
              style={{
                fontSize: "clamp(25px, 6vw, 42px)",
                fontWeight: "900",
                marginBottom: 2,
                lineHeight: 1,
              }}
            >
              EL NONO COQUI
            </h1>

            <p
              style={{
                opacity: 0.7,
                fontSize: 15,
              }}
            >
              Esperanza - Santa Fe
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={botonHeader(darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {user && (
            <button
              onClick={cerrarSesion}
              style={{
                ...botonHeader(darkMode),
                background: "linear-gradient(135deg,#dc2626,#ef4444)",
                color: "white",
              }}
            >
              Salir
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div
          style={{
            background: "linear-gradient(135deg,#10b981,#34d399)",
            color: "white",
            padding: 13,
            borderRadius: 16,
            marginBottom: 18,
            fontWeight: "bold",
          }}
        >
          {mensaje}
        </div>
      )}

      {/* MENU + COMPARTIR */}

      {!listaCompartida && (
        <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <div>
            <button
              onClick={() => setSeccion("ofertas")}
              style={{
                ...menuStyle("#dc2626", seccion === "ofertas"),
                width: "100%",
              }}
            >
              🔥 Ofertas
            </button>

            {false && user && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/?lista=ofertas`
                    );
                    mostrarMensaje("Link ofertas copiado");
                  }}
                  style={{
                    ...botonCompartir("#dc2626"),
                    marginTop: 8,
                  }}
                >
                  📤 Compartir
                </button>

                <button
                  onClick={() => generarPDF("ofertas")}
                  style={{
                    ...botonPDF("#991b1b"),
                    marginTop: 8,
                  }}
                >
                  📄 PDF
                </button>
              </>
            )}
          </div>

          <div>
            <button
              onClick={() => setSeccion("mayorista")}
              style={{
                ...menuStyle("#2563eb", seccion === "mayorista"),
                width: "100%",
              }}
            >
              📦 Mayorista
            </button>

            {false && user && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/?lista=mayorista`
                    );
                    mostrarMensaje("Link mayorista copiado");
                  }}
                  style={{
                    ...botonCompartir("#2563eb"),
                    marginTop: 8,
                  }}
                >
                  📤 Compartir
                </button>

                <button
                  onClick={() => generarPDF("mayorista")}
                  style={{
                    ...botonPDF("#1d4ed8"),
                    marginTop: 8,
                  }}
                >
                  📄 PDF
                </button>
              </>
            )}
          </div>

          <div>
            <button
              onClick={() => setSeccion("publico")}
              style={{
                ...menuStyle("#16a34a", seccion === "publico"),
                width: "100%",
              }}
            >
              🛒 Público
            </button>

            {false && user && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/?lista=publico`
                    );
                    mostrarMensaje("Link público copiado");
                  }}
                  style={{
                    ...botonCompartir("#16a34a"),
                    marginTop: 8,
                  }}
                >
                  📤 Compartir
                </button>

                <button
                  onClick={() => generarPDF("publico")}
                  style={{
                    ...botonPDF("#15803d"),
                    marginTop: 8,
                  }}
                >
                  📄 PDF
                </button>
              </>
            )}
          </div>

          <div>
            <button
              onClick={() => setSeccion("elaborados")}
              style={{
                ...menuStyle("#7c3aed", seccion === "elaborados"),
                width: "100%",
              }}
            >
              🥗 Elaborados
            </button>

            {false && user && (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/?lista=elaborados`
                    );
                    mostrarMensaje("Link elaborados copiado");
                  }}
                  style={{
                    ...botonCompartir("#7c3aed"),
                    marginTop: 8,
                  }}
                >
                  📤 Compartir
                </button>

                <button
                  onClick={() => generarPDF("elaborados")}
                  style={{
                    ...botonPDF("#6d28d9"),
                    marginTop: 8,
                  }}
                >
                  📄 PDF
                </button>
              </>
            )}
          </div>
        </div>

        {user && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <button
                onClick={() => {
                  setMostrarOpcionesCompartir(!mostrarOpcionesCompartir);
                  setMostrarOpcionesPDF(false);
                }}
                style={botonAccionAdmin("#111827")}
              >
                Compartir lista
              </button>

              {mostrarOpcionesCompartir && (
                <div style={menuAccionesAdmin(darkMode)}>
                  {listasDisponibles.map((lista) => (
                    <button
                      key={lista.tipo}
                      onClick={() => compartirLista(lista.tipo)}
                      style={opcionAccionAdmin(lista.color)}
                    >
                      {lista.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <button
                onClick={() => {
                  setMostrarOpcionesPDF(!mostrarOpcionesPDF);
                  setMostrarOpcionesCompartir(false);
                }}
                style={botonAccionAdmin("#334155")}
              >
                Generar PDF
              </button>

              {mostrarOpcionesPDF && (
                <div style={menuAccionesAdmin(darkMode)}>
                  {listasDisponibles.map((lista) => (
                    <button
                      key={lista.tipo}
                      onClick={() => {
                        generarPDF(lista.tipo);
                        setMostrarOpcionesPDF(false);
                      }}
                      style={opcionAccionAdmin(lista.color)}
                    >
                      {lista.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </>
      )}

      {listaCompartida && (
        <div
          style={{
            marginBottom: 16,
            padding: 15,
            borderRadius: 18,
            background:
              listaCompartida === "ofertas"
                ? "#dc2626"
                : listaCompartida === "mayorista"
                ? "#2563eb"
                : listaCompartida === "elaborados"
                ? "#7c3aed"
                : "#16a34a",
            color: "white",
            fontWeight: "bold",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          {listaCompartida === "ofertas" && "🔥 Lista de Ofertas"}
          {listaCompartida === "mayorista" && "📦 Lista Mayorista"}
          {listaCompartida === "publico" && "🛒 Lista Público"}
          {listaCompartida === "elaborados" && "🥗 Lista Elaborados"}
        </div>
      )}

      {/* FORMULARIO */}

      {user && !listaCompartida && (
        <div
          style={{
            background: darkMode
              ? "rgba(17,24,39,0.65)"
              : "rgba(255,255,255,0.7)",
            borderRadius: 24,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              marginBottom: 16,
              fontSize: 22,
            }}
          >
            {editandoId ? "✏️ Editar Producto" : "➕ Agregar Producto"}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              placeholder="Presentación"
              value={presentacion}
              onChange={(e) => setPresentacion(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              placeholder="Kilos"
              value={kilos}
              onChange={(e) => setKilos(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              type="number"
              placeholder="Precio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImagen(e.target.files[0]);
                  const imageUrl = URL.createObjectURL(e.target.files[0]);
                  setPreview(imageUrl);
                }
              }}
              style={inputStyle(darkMode)}
            />
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={oferta}
                onChange={(e) => setOferta(e.target.checked)}
              />
              🔥 Oferta
            </label>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={mostrarMayorista}
                onChange={(e) => setMostrarMayorista(e.target.checked)}
              />
              📦 Mayorista
            </label>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={mostrarPublico}
                onChange={(e) => setMostrarPublico(e.target.checked)}
              />
              🛒 Público
            </label>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={mostrarElaborados}
                onChange={(e) => setMostrarElaborados(e.target.checked)}
              />
              🥗 Elaborados
            </label>
          </div>

          {mostrarMayorista && !mostrarPublico && !oferta && !mostrarElaborados && (
            <label
              style={{
                ...checkboxStyle,
                marginTop: 12,
                background: darkMode ? "rgba(37,99,235,0.18)" : "#dbeafe",
                color: darkMode ? "#bfdbfe" : "#1d4ed8",
              }}
            >
              <input
                type="checkbox"
                checked={precioMayoristaManual}
                onChange={(e) => setPrecioMayoristaManual(e.target.checked)}
              />
              Usar precio manual mayorista sin recargo del 30%
            </label>
          )}

          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 220,
                objectFit: "cover",
                marginTop: 16,
                borderRadius: 18,
              }}
            />
          )}

          <button
            onClick={agregarProducto}
            disabled={loading}
            style={{
              marginTop: 18,
              width: "100%",
              padding: 16,
              background: "linear-gradient(135deg,#16a34a,#22c55e)",
              color: "white",
              border: "none",
              borderRadius: 16,
              fontWeight: "bold",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {loading
              ? "Guardando..."
              : editandoId
              ? "Guardar Cambios"
              : "Agregar Producto"}
          </button>
        </div>
      )}

      {/* BUSCADOR */}

      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          paddingTop: 4,
          paddingBottom: 10,
          background: darkMode
            ? "linear-gradient(180deg, #020617 0%, rgba(2,6,23,0.85) 100%)"
            : "linear-gradient(180deg, #f8fafc 0%, rgba(248,250,252,0.85) 100%)",
          backdropFilter: "blur(10px)",
        }}
      >
        <input
          placeholder="🔍 Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 15,
            border: "none",
            fontSize: 15,
            outline: "none",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          }}
        />
      </div>

      {/* PRODUCTOS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 8,
          marginTop: 8,
        }}
      >
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: darkMode
                ? "rgba(17,24,39,0.72)"
                : "rgba(255,255,255,0.9)",
              borderRadius: 18,
              padding: 10,
              boxShadow: darkMode
                ? "0 8px 24px rgba(0,0,0,0.35)"
                : "0 8px 22px rgba(0,0,0,0.08)",
              border: darkMode
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(255,255,255,0.7)",
            }}
          >
            {producto.imagen && (
              <div
                style={{
                  width: 68,
                  height: 68,
                  minWidth: 68,
                  background: "#fff",
                  borderRadius: 15,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={producto.imagen}
                  alt={producto.nombre}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: 4,
                  }}
                />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <h2
                  className="notranslate"
                  translate="no"
                  style={{
                    fontSize: 16,
                    fontWeight: "900",
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                    margin: 0,
                    wordBreak: "break-word",
                  }}
                >
                  {producto.nombre}
                </h2>

                {producto.oferta && <span style={badgeOferta}>🔥</span>}
              </div>

              <p
                style={{
                  opacity: 0.8,
                  fontSize: 13,
                  fontWeight: "700",
                  marginTop: 5,
                  marginBottom: 0,
                }}
              >
                {formatearCantidad(producto.kilos, producto.presentacion)}
              </p>

              <p
                style={{
                  fontSize: 23,
                  fontWeight: "900",
                  color: "#16a34a",
                  marginTop: 6,
                  marginBottom: 0,
                  lineHeight: 1,
                }}
              >
                ${formatearPrecio(producto.precio)}
              </p>

              <span
                style={{
                  opacity: 0.55,
                  fontSize: 11,
                }}
              >
                precio final
              </span>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 5,
                  marginTop: 7,
                }}
              >
                {producto.mostrar_publico && (
                  <div style={badgePublico}>Público</div>
                )}

                {producto.mostrar_mayorista && (
                  <div style={badgeMayorista}>Mayorista</div>
                )}

                {producto.mostrar_elaborados && (
                  <div style={badgeElaborados}>Elaborados</div>
                )}
              </div>

              {user && !listaCompartida && (
                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    marginTop: 8,
                  }}
                >
                  <button
                    onClick={() => editarProducto(producto)}
                    style={{
                      ...botonCard("#f59e0b"),
                      padding: 9,
                      marginTop: 0,
                      fontSize: 12,
                    }}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => cambiarStock(producto)}
                    style={{
                      ...botonCard(producto.sin_stock ? "#16a34a" : "#64748b"),
                      padding: 9,
                      marginTop: 0,
                      fontSize: 12,
                    }}
                  >
                    {producto.sin_stock ? "Reactivar" : "Sin stock"}
                  </button>

                  <button
                    onClick={() => eliminarProducto(producto.id)}
                    style={{
                      ...botonCard("#dc2626"),
                      padding: 9,
                      marginTop: 0,
                      fontSize: 12,
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* BOTON WHATSAPP GLOBAL */}

      <a
        href={`/pedido?lista=${seccion}`}
        style={{
          position: "fixed",
          bottom: 18,
          left: 18,
          minHeight: 52,
          borderRadius: 999,
          background: "linear-gradient(135deg,#16a34a,#22c55e)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          zIndex: 999,
          padding: "0 18px",
          fontWeight: 900,
        }}
      >
        Hacer pedido
      </a>

      <a
        href="https://wa.me/5493496550978"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: 18,
          right: 18,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#25D366,#128C7E)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
          zIndex: 999,
        }}
      >
        <img
          src="/whatsapp.png"
          alt="WhatsApp"
          style={{
            width: 29,
            height: 29,
            objectFit: "contain",
          }}
        />
      </a>
    </div>
  );
}

function inputStyle(darkMode: boolean): CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "none",
    background: darkMode ? "#374151" : "#ffffff",
    color: darkMode ? "white" : "#111827",
    fontSize: 15,
    outline: "none",
  };
}

function botonHeader(darkMode: boolean): CSSProperties {
  return {
    background: darkMode
      ? "linear-gradient(135deg,#facc15,#eab308)"
      : "linear-gradient(135deg,#111827,#1f2937)",
    color: darkMode ? "#111" : "white",
    border: "none",
    padding: "12px 18px",
    borderRadius: 16,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
  };
}

function menuStyle(color: string, active: boolean): CSSProperties {
  return {
    background: active ? color : `${color}22`,
    color: active ? "white" : color,
    border: `2px solid ${color}`,
    borderRadius: 20,
    padding: 15,
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.25s ease",
    boxShadow: active
      ? `0 10px 25px ${color}55`
      : "0 5px 15px rgba(0,0,0,0.08)",
  };
}

function botonCard(color: string): CSSProperties {
  return {
    width: "100%",
    padding: 14,
    background: color,
    color: "white",
    border: "none",
    borderRadius: 14,
    marginTop: 12,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
  };
}

function botonCompartir(color: string): CSSProperties {
  return {
    width: "100%",
    padding: 11,
    background: color,
    color: "white",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 13,
  };
}

function botonPDF(color: string): CSSProperties {
  return {
    width: "100%",
    padding: 11,
    background: color,
    color: "white",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 13,
  };
}

function botonAccionAdmin(color: string): CSSProperties {
  return {
    width: "100%",
    padding: "13px 16px",
    background: color,
    color: "white",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
    boxShadow: "0 8px 20px rgba(15,23,42,0.12)",
  };
}

function menuAccionesAdmin(darkMode: boolean): CSSProperties {
  return {
    position: "absolute",
    zIndex: 200,
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    display: "grid",
    gap: 8,
    padding: 10,
    borderRadius: 16,
    background: darkMode ? "#111827" : "white",
    boxShadow: "0 16px 32px rgba(15,23,42,0.22)",
    border: darkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e5e7eb",
  };
}

function opcionAccionAdmin(color: string): CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    background: `${color}18`,
    color,
    border: `1px solid ${color}55`,
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: "bold",
    textAlign: "left",
  };
}

const checkboxStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: "bold",
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
};

const badgeOferta: CSSProperties = {
  background: "linear-gradient(135deg,#dc2626,#ef4444)",
  color: "white",
  padding: "5px 8px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const badgeMayorista: CSSProperties = {
  background: "linear-gradient(135deg,#2563eb,#3b82f6)",
  color: "white",
  padding: "4px 8px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 10,
};

const badgePublico: CSSProperties = {
  background: "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  padding: "4px 8px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 10,
};

const badgeElaborados: CSSProperties = {
  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
  color: "white",
  padding: "4px 8px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 10,
};
