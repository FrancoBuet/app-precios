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

  const [imagen, setImagen] = useState<File | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState("mayorista");

  const [user, setUser] = useState<any>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [listaCompartida, setListaCompartida] = useState("");

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

    const precioFinal =
      !editandoId && esSoloMayorista
        ? Math.round(Number(precio) * 1.3)
        : Number(precio);

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
          ? "Producto agregado con 30% mayorista"
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

  let productosFiltrados = productos.filter((producto) =>
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
        paddingBottom: 110,
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
          marginBottom: 24,
          gap: 15,
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
              width: 70,
              height: 70,
              borderRadius: 20,
              objectFit: "cover",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            }}
          />

          <div>
            <h1
              style={{
                fontSize: "clamp(26px, 6vw, 42px)",
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

      {/* MENSAJE */}

      {mensaje && (
        <div
          style={{
            background: "linear-gradient(135deg,#10b981,#34d399)",
            color: "white",
            padding: 14,
            borderRadius: 18,
            marginBottom: 20,
            fontWeight: "bold",
          }}
        >
          {mensaje}
        </div>
      )}

      {/* MENU + COMPARTIR */}

      {!listaCompartida && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 22,
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

            {user && (
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

            {user && (
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

            {user && (
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

            {user && (
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
            )}
          </div>
        </div>
      )}

      {listaCompartida && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
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
            marginBottom: 22,
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

          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 240,
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

      <input
        placeholder="🔍 Buscar productos..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          width: "100%",
          padding: 13,
          borderRadius: 16,
          border: "none",
          marginBottom: 16,
          fontSize: 15,
          outline: "none",
        }}
      />

      {/* PRODUCTOS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 10,
        }}
      >
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              background: darkMode
                ? "rgba(17,24,39,0.72)"
                : "rgba(255,255,255,0.9)",
              borderRadius: 20,
              padding: 12,
              boxShadow: darkMode
                ? "0 10px 30px rgba(0,0,0,0.35)"
                : "0 10px 25px rgba(0,0,0,0.08)",
              border: darkMode
                ? "1px solid rgba(255,255,255,0.06)"
                : "1px solid rgba(255,255,255,0.7)",
            }}
          >
            {producto.imagen && (
              <div
                style={{
                  width: 82,
                  height: 82,
                  minWidth: 82,
                  background: "#fff",
                  borderRadius: 16,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <img
                  src={producto.imagen}
                  alt={producto.nombre}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    padding: 5,
                  }}
                />
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: "900",
                    lineHeight: 1.1,
                    textTransform: "uppercase",
                    margin: 0,
                  }}
                >
                  {producto.nombre}
                </h2>

                {producto.oferta && <span style={badgeOferta}>🔥</span>}
              </div>

              <p
                style={{
                  opacity: 0.8,
                  fontSize: 14,
                  fontWeight: "700",
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                {producto.kilos} {producto.presentacion}
              </p>

              <p
                style={{
                  fontSize: 26,
                  fontWeight: "900",
                  color: "#16a34a",
                  marginTop: 8,
                  marginBottom: 0,
                  lineHeight: 1,
                }}
              >
                ${Number(producto.precio).toLocaleString("es-AR")}
              </p>

              <span
                style={{
                  opacity: 0.55,
                  fontSize: 12,
                }}
              >
                precio final
              </span>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 8,
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
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <button
                    onClick={() => editarProducto(producto)}
                    style={{
                      ...botonCard("#f59e0b"),
                      padding: 10,
                      marginTop: 0,
                      fontSize: 13,
                    }}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => eliminarProducto(producto.id)}
                    style={{
                      ...botonCard("#dc2626"),
                      padding: 10,
                      marginTop: 0,
                      fontSize: 13,
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
        href="https://wa.me/5493496550978"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: 18,
          right: 18,
          width: 54,
          height: 54,
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
            width: 30,
            height: 30,
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
    padding: 16,
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
    padding: 12,
    background: color,
    color: "white",
    border: "none",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
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
  padding: "5px 9px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const badgeMayorista: CSSProperties = {
  background: "linear-gradient(135deg,#2563eb,#3b82f6)",
  color: "white",
  padding: "5px 9px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 11,
};

const badgePublico: CSSProperties = {
  background: "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  padding: "5px 9px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 11,
};

const badgeElaborados: CSSProperties = {
  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
  color: "white",
  padding: "5px 9px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 11,
};