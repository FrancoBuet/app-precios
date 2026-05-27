"use client";

import { useEffect, useState } from "react";
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

  const [mostrarMayorista, setMostrarMayorista] =
    useState(true);

  const [mostrarPublico, setMostrarPublico] =
    useState(true);

  const [imagen, setImagen] =
    useState<File | null>(null);

  const [busqueda, setBusqueda] = useState("");

  const [seccion, setSeccion] =
    useState("mayorista");

  const [user, setUser] = useState<any>(null);

  const [editandoId, setEditandoId] =
    useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const temaGuardado =
      localStorage.getItem("darkMode");

    if (temaGuardado === "true") {
      setDarkMode(true);
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    obtenerProductos();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "darkMode",
      darkMode.toString()
    );
  }, [darkMode]);

  async function cerrarSesion() {
    await supabase.auth.signOut();

    window.location.href = "/login";
  }

  async function obtenerProductos() {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

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

      const { error: uploadError } =
        await supabase.storage
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

    const productoData = {
      nombre,
      presentacion,
      kilos: Number(kilos),

      precio: Number(precio),

      mostrar_mayorista:
        mostrarMayorista,

      mostrar_publico:
        mostrarPublico,

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

      mostrarMensaje(
        "Producto actualizado correctamente"
      );

      setEditandoId(null);
    } else {
      const { error } = await supabase
        .from("productos")
        .insert([productoData]);

      if (error) {
        alert(error.message);

        setLoading(false);

        return;
      }

      mostrarMensaje(
        "Producto agregado correctamente"
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

    setImagen(null);

    setPreview("");
  }

  async function eliminarProducto(id: number) {
    const confirmar = confirm(
      "¿Seguro que querés eliminar este producto?"
    );

    if (!confirmar) return;

    await supabase
      .from("productos")
      .delete()
      .eq("id", id);

    obtenerProductos();

    mostrarMensaje("Producto eliminado");
  }

  function editarProducto(producto: any) {
    setEditandoId(producto.id);

    setNombre(producto.nombre || "");

    setPresentacion(
      producto.presentacion || ""
    );

    setKilos(
      producto.kilos?.toString() || ""
    );

    setPrecio(
      producto.precio?.toString() || ""
    );

    setOferta(producto.oferta || false);

    setMostrarMayorista(
      producto.mostrar_mayorista ?? true
    );

    setMostrarPublico(
      producto.mostrar_publico ?? true
    );

    if (producto.imagen) {
      setPreview(producto.imagen);
    }
  }

  let productosFiltrados = productos.filter(
    (producto) =>
      producto.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  );

  if (seccion === "ofertas") {
    productosFiltrados =
      productosFiltrados.filter(
        (p) => p.oferta
      );
  }

  if (seccion === "mayorista") {
    productosFiltrados =
      productosFiltrados.filter(
        (p) => p.mostrar_mayorista
      );
  }

  if (seccion === "publico") {
    productosFiltrados =
      productosFiltrados.filter(
        (p) => p.mostrar_publico
      );
  }

  return (
    <div
      style={{
        padding: 15,

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
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: 30,
          flexWrap: "wrap",
          gap: 15,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 42,
              fontWeight: "bold",
              marginBottom: 5,
            }}
          >
            🛍️ Mi Catálogo
          </h1>

          <p
            style={{
              opacity: 0.7,
              fontSize: 16,
            }}
          >
            Panel Mayorista & Público
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={() =>
              setDarkMode(!darkMode)
            }
            style={botonHeader(darkMode)}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          {user && (
            <button
              onClick={cerrarSesion}
              style={{
                ...botonHeader(darkMode),
                background:
                  "linear-gradient(135deg,#dc2626,#ef4444)",
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
            background:
              "linear-gradient(135deg,#10b981,#34d399)",

            color: "white",

            padding: 16,

            borderRadius: 18,

            marginBottom: 25,

            fontWeight: "bold",

            boxShadow:
              "0 10px 25px rgba(16,185,129,0.25)",
          }}
        >
          {mensaje}
        </div>
      )}

      {/* MENU */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",

          gap: 15,

          marginBottom: 30,
        }}
      >
        <button
          onClick={() =>
            setSeccion("ofertas")
          }
          style={menuStyle(
            "#dc2626",
            seccion === "ofertas"
          )}
        >
          🔥 Ofertas
        </button>

        <button
          onClick={() =>
            setSeccion("mayorista")
          }
          style={menuStyle(
            "#2563eb",
            seccion === "mayorista"
          )}
        >
          📦 Mayorista
        </button>

        <button
          onClick={() =>
            setSeccion("publico")
          }
          style={menuStyle(
            "#16a34a",
            seccion === "publico"
          )}
        >
          🛒 Público
        </button>
      </div>

      {/* FORMULARIO */}

      {user && (
        <div
          style={{
            background:
              darkMode
                ? "rgba(17,24,39,0.65)"
                : "rgba(255,255,255,0.7)",

            backdropFilter: "blur(16px)",

            WebkitBackdropFilter:
              "blur(16px)",

            borderRadius: 30,

            padding: 25,

            marginBottom: 35,

            border: darkMode
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(255,255,255,0.6)",

            boxShadow:
              "0 15px 45px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              marginBottom: 20,
              fontSize: 28,
            }}
          >
            {editandoId
              ? "✏️ Editar Producto"
              : "➕ Agregar Producto"}
          </h2>

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",

              gap: 15,
            }}
          >
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) =>
                setNombre(
                  e.target.value
                )
              }
              style={inputStyle(darkMode)}
            />

            <input
              placeholder="Presentación"
              value={presentacion}
              onChange={(e) =>
                setPresentacion(
                  e.target.value
                )
              }
              style={inputStyle(darkMode)}
            />

            <input
              placeholder="Kilos"
              value={kilos}
              onChange={(e) =>
                setKilos(
                  e.target.value
                )
              }
              style={inputStyle(darkMode)}
            />

            <input
              type="number"
              placeholder="Precio"
              value={precio}
              onChange={(e) =>
                setPrecio(
                  e.target.value
                )
              }
              style={inputStyle(darkMode)}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (
                  e.target.files &&
                  e.target.files[0]
                ) {
                  setImagen(
                    e.target.files[0]
                  );

                  const imageUrl =
                    URL.createObjectURL(
                      e.target.files[0]
                    );

                  setPreview(imageUrl);
                }
              }}
              style={inputStyle(darkMode)}
            />
          </div>

          {/* CHECKS */}

          <div
            style={{
              marginTop: 22,

              display: "flex",

              flexWrap: "wrap",

              gap: 20,
            }}
          >
            <label
              style={checkboxStyle}
            >
              <input
                type="checkbox"
                checked={oferta}
                onChange={(e) =>
                  setOferta(
                    e.target.checked
                  )
                }
              />

              🔥 Producto en oferta
            </label>

            <label
              style={checkboxStyle}
            >
              <input
                type="checkbox"
                checked={
                  mostrarMayorista
                }
                onChange={(e) =>
                  setMostrarMayorista(
                    e.target.checked
                  )
                }
              />

              📦 Mayorista
            </label>

            <label
              style={checkboxStyle}
            >
              <input
                type="checkbox"
                checked={
                  mostrarPublico
                }
                onChange={(e) =>
                  setMostrarPublico(
                    e.target.checked
                  )
                }
              />

              🛒 Público
            </label>
          </div>

          {/* PREVIEW */}

          {preview && (
            <div
              style={{
                marginTop: 25,

                borderRadius: 20,

                overflow: "hidden",

                backgroundColor: "#fff",
              }}
            >
              <img
                src={preview}
                alt="preview"
                style={{
                  width: "100%",
                  maxHeight: 320,
                  objectFit: "cover",
transition: "0.3s ease",
                }}
              />
            </div>
          )}

          {/* BOTON */}

          <button
            onClick={agregarProducto}
            disabled={loading}
            style={{
              marginTop: 25,

              width: "100%",

              padding: 18,

              background:
                "linear-gradient(135deg,#16a34a,#22c55e)",

              color: "white",

              border: "none",

              borderRadius: 18,

              fontWeight: "bold",

              fontSize: 17,

              cursor: "pointer",

              boxShadow:
                "0 10px 25px rgba(34,197,94,0.25)",
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
        onChange={(e) =>
          setBusqueda(
            e.target.value
          )
        }
        style={{
          width: "100%",

          padding: 18,

          borderRadius: 18,

          border: "none",

          marginBottom: 30,

          fontSize: 16,

          outline: "none",

          boxShadow:
            "0 5px 20px rgba(0,0,0,0.06)",
        }}
      />

      {/* PRODUCTOS */}

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",

          gap: 22,
        }}
      >
        {productosFiltrados.map(
          (producto) => (
            <div
              key={producto.id}
              style={{
                background:
                  darkMode
                    ? "rgba(17,24,39,0.72)"
                    : "rgba(255,255,255,0.8)",

                backdropFilter:
                  "blur(14px)",

                WebkitBackdropFilter:
                  "blur(14px)",

                borderRadius: 30,

                overflow: "hidden",

                border: darkMode
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "1px solid rgba(255,255,255,0.6)",

                boxShadow:
                  "0 15px 45px rgba(0,0,0,0.12)",

                transition:
                  "0.25s ease",

                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-8px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  "translateY(0px)";
              }}
            >
              {/* IMAGEN */}

              <div
                style={{
                  width: "100%",
                  height: 260,
                  backgroundColor: "#fff",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  overflow: "hidden",
                }}
              >
                <img
                  src={
                    producto.imagen ||
                    "https://via.placeholder.com/400x300?text=Producto"
                  }
                  alt={producto.nombre}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",

                    padding: 12,
                  }}
                />
              </div>

              {/* INFO */}

              <div
                style={{
                  padding: 22,
                }}
              >
                <h2
                  style={{
                    fontSize: 28,

                    marginBottom: 10,

                    wordBreak:
                      "break-word",
                  }}
                >
                  {producto.nombre}
                </h2>

                <p
                  style={{
                    opacity: 0.8,
                    marginBottom: 6,
                  }}
                >
                  📦 {producto.presentacion}
                </p>

                <p
                  style={{
                    opacity: 0.8,
                  }}
                >
                  ⚖️ {producto.kilos} Kg
                </p>

                {/* PRECIO */}

                <p
                  style={{
                    fontSize: 38,

                    fontWeight: "bold",

                    color: "#22c55e",

                    marginTop: 18,
                  }}
                >
                  $
                  {Number(
                    producto.precio
                  ).toLocaleString(
                    "es-AR"
                  )}
                </p>

                {/* BADGES */}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 15,
                  }}
                >
                  {producto.oferta && (
                    <div
                      style={badgeOferta}
                    >
                      🔥 OFERTA
                    </div>
                  )}

                  {producto.mostrar_mayorista && (
                    <div
                      style={badgeMayorista}
                    >
                      📦 Mayorista
                    </div>
                  )}

                  {producto.mostrar_publico && (
                    <div
                      style={badgePublico}
                    >
                      🛒 Público
                    </div>
                  )}
                </div>

                {/* BOTONES */}

                {user && (
                  <>
                    <button
                      onClick={() =>
                        editarProducto(
                          producto
                        )
                      }
                      style={botonCard(
                        "#f59e0b"
                      )}
                    >
                      ✏️ Editar
                    </button>

                    <button
                      onClick={() =>
                        eliminarProducto(
                          producto.id
                        )
                      }
                      style={botonCard(
                        "#dc2626"
                      )}
                    >
                      🗑️ Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function inputStyle(
  darkMode: boolean
) {
  return {
    width: "100%",

    padding: "16px 18px",

    borderRadius: 18,

    border: darkMode
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(255,255,255,0.7)",

    background: darkMode
      ? "rgba(55, 65, 81, 0.55)"
      : "rgba(255,255,255,0.75)",

    backdropFilter: "blur(10px)",

    WebkitBackdropFilter: "blur(10px)",

    color: darkMode
      ? "white"
      : "#111827",

    fontSize: 15,

    outline: "none",

    transition: "0.25s ease",

    boxShadow: darkMode
      ? "0 4px 20px rgba(0,0,0,0.25)"
      : "0 4px 20px rgba(0,0,0,0.06)",
  };
}

function botonHeader(
  darkMode: boolean
) {
  return {
    background: darkMode
      ? "linear-gradient(135deg,#facc15,#eab308)"
      : "linear-gradient(135deg,#111827,#1f2937)",

    color: darkMode
      ? "#111"
      : "white",

    border: "none",

    padding: "12px 18px",

    borderRadius: 16,

    cursor: "pointer",

    fontWeight: "bold",

    fontSize: 15,

    transition: "0.25s ease",

    boxShadow:
      "0 8px 20px rgba(0,0,0,0.15)",
  };
}

function menuStyle(
  color: string,
  active: boolean
) {
  return {
    background: active
      ? `linear-gradient(135deg, ${color}, ${color})`
      : "rgba(255,255,255,0.08)",

    color: "white",

    border: active
      ? "none"
      : "1px solid rgba(255,255,255,0.15)",

    borderRadius: 24,

    padding: 22,

    fontSize: 20,

    fontWeight: "bold",

    cursor: "pointer",

    transition: "0.25s ease",

    transform: active
      ? "scale(1.03)"
      : "scale(1)",

    boxShadow: active
      ? "0 12px 30px rgba(0,0,0,0.20)"
      : "0 6px 18px rgba(0,0,0,0.08)",

    backdropFilter: "blur(10px)",

    WebkitBackdropFilter:
      "blur(10px)",
  };
}

function botonCard(color: string) {
  return {
    width: "100%",

    padding: 14,

    background: `linear-gradient(135deg, ${color}, ${color}dd)`,

    color: "white",

    border: "none",

    borderRadius: 16,

    marginTop: 12,

    cursor: "pointer",

    fontWeight: "bold",

    fontSize: 15,

    transition: "0.25s ease",

    boxShadow:
      "0 8px 20px rgba(0,0,0,0.15)",
  };
}

const checkboxStyle = {
  display: "flex",

  alignItems: "center",

  gap: 12,

  fontWeight: "bold",

  padding: "12px 14px",

  borderRadius: 14,

  background: "rgba(255,255,255,0.05)",
};

const badgeOferta = {
  background:
    "linear-gradient(135deg,#dc2626,#ef4444)",

  color: "white",

  padding: "7px 12px",

  borderRadius: 999,

  fontWeight: "bold",

  fontSize: 12,
};

const badgeMayorista = {
  background:
    "linear-gradient(135deg,#2563eb,#3b82f6)",

  color: "white",

  padding: "7px 12px",

  borderRadius: 999,

  fontWeight: "bold",

  fontSize: 12,
};

const badgePublico = {
  background:
    "linear-gradient(135deg,#16a34a,#22c55e)",

  color: "white",

  padding: "7px 12px",

  borderRadius: 999,

  fontWeight: "bold",

  fontSize: 12,
};