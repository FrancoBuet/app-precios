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
        ?.toLowerCase()
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
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
        width: 75,
        height: 75,
        borderRadius: 20,
        objectFit: "cover",
        boxShadow:
          "0 8px 20px rgba(0,0,0,0.15)",
      }}
    />

    <div>
      <h1
        style={{
          fontSize: window.innerWidth < 600 ? 34 : 42,
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
          fontSize: 16,
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
            "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
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
            borderRadius: 30,
            padding: 20,
            marginBottom: 35,
          }}
        >
          <h2
            style={{
              marginBottom: 20,
              fontSize: 24,
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
                "repeat(auto-fit, minmax(180px, 1fr))",
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

          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={oferta}
                onChange={(e) =>
                  setOferta(
                    e.target.checked
                  )
                }
              />
              🔥 Oferta
            </label>

            <label style={checkboxStyle}>
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

            <label style={checkboxStyle}>
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

          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 300,
                objectFit: "cover",
                marginTop: 20,
                borderRadius: 20,
              }}
            />
          )}

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
          padding: 16,
          borderRadius: 18,
          border: "none",
          marginBottom: 30,
          fontSize: 16,
          outline: "none",
        }}
      />

      {/* PRODUCTOS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 20,
        }}
      >
        {productosFiltrados.map(
  (producto) => (
    <div
      key={producto.id}
      style={{
        background: darkMode
          ? "rgba(17,24,39,0.72)"
          : "rgba(255,255,255,0.88)",

        borderRadius: 32,

        overflow: "hidden",

        boxShadow:
          darkMode
            ? "0 15px 40px rgba(0,0,0,0.35)"
            : "0 15px 40px rgba(0,0,0,0.10)",

        transition: "0.3s ease",

        backdropFilter: "blur(14px)",

        border: darkMode
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid rgba(255,255,255,0.7)",
      }}
    >
      {/* IMAGEN */}

      <div
        style={{
          width: "100%",
          height: 250,
          background: "#fff",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {producto.oferta && (
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 10,

              background:
                "linear-gradient(135deg,#ef4444,#dc2626)",

              color: "white",

              padding: "8px 14px",

              borderRadius: 999,

              fontWeight: "bold",

              fontSize: 13,

              boxShadow:
                "0 6px 18px rgba(239,68,68,0.35)",
            }}
          >
            🔥 OFERTA
          </div>
        )}

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
            padding: 14,
            transition: "0.35s ease",
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
            fontWeight: "800",
            marginBottom: 12,
            lineHeight: 1.1,
          }}
        >
          {producto.nombre}
        </h2>

        <p
          style={{
            opacity: 0.8,
            marginBottom: 6,
            fontSize: 15,
          }}
        >
          📦 {producto.presentacion}
        </p>

        <p
          style={{
            opacity: 0.8,
            fontSize: 15,
          }}
        >
          ⚖️ {producto.kilos} Kg
        </p>

        {/* PRECIO */}

        <div
          style={{
            marginTop: 20,
          }}
        >
          <p
            style={{
              fontSize: 42,
              fontWeight: "900",
              color: "#16a34a",
              lineHeight: 1,
            }}
          >
            $
            {Number(
              producto.precio
            ).toLocaleString("es-AR")}
          </p>

          <span
            style={{
              opacity: 0.6,
              fontSize: 14,
            }}
          >
            precio final
          </span>
        </div>

        {/* BADGES */}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 18,
          }}
        >
          {producto.mostrar_publico && (
            <div style={badgePublico}>
              🛒 Público
            </div>
          )}

          {producto.mostrar_mayorista && (
            <div style={badgeMayorista}>
              📦 Mayorista
            </div>
          )}
        </div>

        {/* BOTONES CLIENTE */}

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 22,
          }}
        >
          <a
            href={`https://wa.me/5493496550978?text=Hola! Quiero consultar por ${producto.nombre}`}
            target="_blank"
            style={{
              flex: 1,
              textDecoration: "none",
            }}
          >
            <button
              style={{
                width: "100%",
                padding: 15,

                background:
                  "linear-gradient(135deg,#16a34a,#22c55e)",

                color: "white",

                border: "none",

                borderRadius: 16,

                fontWeight: "bold",

                cursor: "pointer",

                fontSize: 15,
              }}
            >
              WhatsApp
            </button>
          </a>

          <button
            onClick={() => {
              navigator.share?.({
                title: producto.nombre,
                text: `Mirá este producto: ${producto.nombre}`,
                url: window.location.href,
              });
            }}
            style={{
              padding: 15,

              background: darkMode
                ? "#1f2937"
                : "#e5e7eb",

              color: darkMode
                ? "white"
                : "#111827",

              border: "none",

              borderRadius: 16,

              cursor: "pointer",

              fontWeight: "bold",
            }}
          >
            ↗
          </button>
        </div>

        {/* ADMIN */}

        {user && (
          <>
            <button
              onClick={() =>
                editarProducto(producto)
              }
              style={botonCard("#f59e0b")}
            >
              ✏️ Editar
            </button>

            <button
              onClick={() =>
                eliminarProducto(producto.id)
              }
              style={botonCard("#dc2626")}
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
): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 16,
    border: "none",
    background: darkMode
      ? "#374151"
      : "#ffffff",
    color: darkMode
      ? "white"
      : "#111827",
    fontSize: 15,
    outline: "none",
  };
}

function botonHeader(
  darkMode: boolean
): React.CSSProperties {
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
  };
}

function menuStyle(
  color: string,
  active: boolean
): React.CSSProperties {
  return {
    background: active
      ? color
      : "rgba(255,255,255,0.12)",
    color: "white",
    border: "none",
    borderRadius: 20,
    padding: 18,
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
  };
}

function botonCard(
  color: string
): React.CSSProperties {
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

const checkboxStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: "bold",
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
};

const badgeOferta: React.CSSProperties = {
  background:
    "linear-gradient(135deg,#dc2626,#ef4444)",
  color: "white",
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
};

const badgeMayorista: React.CSSProperties = {
  background:
    "linear-gradient(135deg,#2563eb,#3b82f6)",
  color: "white",
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
};

const badgePublico: React.CSSProperties = {
  background:
    "linear-gradient(135deg,#16a34a,#22c55e)",
  color: "white",
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: "bold",
  fontSize: 12,
};