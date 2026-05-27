"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  const [loading, setLoading] = useState(false);

  const [preview, setPreview] = useState("");
  const [productos, setProductos] = useState<any[]>([]);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [kilos, setKilos] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);

  const [busqueda, setBusqueda] = useState("");

  const [user, setUser] = useState<any>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const temaGuardado = localStorage.getItem("darkMode");

    if (temaGuardado === "true") {
      setDarkMode(true);
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

    if (editandoId) {
      const { error } = await supabase
        .from("productos")
        .update({
          nombre,
          tipo,
          presentacion,
          kilos: Number(kilos),
          precio: Number(precio),
          imagen: imagenUrl,
        })
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      mostrarMensaje("Producto actualizado correctamente");

      setEditandoId(null);
    } else {
      const { error } = await supabase.from("productos").insert([
        {
          nombre,
          tipo,
          presentacion,
          kilos: Number(kilos),
          precio: Number(precio),
          imagen: imagenUrl,
        },
      ]);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      mostrarMensaje("Producto agregado correctamente");
    }

    setNombre("");
    setTipo("");
    setPresentacion("");
    setKilos("");
    setPrecio("");
    setImagen(null);
    setPreview("");

    obtenerProductos();

    setLoading(false);
  }

  async function eliminarProducto(id: number) {
    const confirmar = confirm(
      "¿Seguro que querés eliminar este producto?"
    );

    if (!confirmar) return;

    await supabase.from("productos").delete().eq("id", id);

    obtenerProductos();

    mostrarMensaje("Producto eliminado");
  }

  function editarProducto(producto: any) {
    setEditandoId(producto.id);

    setNombre(producto.nombre || "");
    setTipo(producto.tipo || "");
    setPresentacion(producto.presentacion || "");
    setKilos(producto.kilos?.toString() || "");
    setPrecio(producto.precio?.toString() || "");

    if (producto.imagen) {
      setPreview(producto.imagen);
    }
  }

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: darkMode ? "#111827" : "#f3f4f6",
        minHeight: "100vh",
        color: darkMode ? "white" : "black",
        transition: "0.3s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 38,
              fontWeight: "bold",
              marginBottom: 5,
            }}
          >
            Lista de Productos
          </h1>

          <p
            style={{
              opacity: 0.7,
            }}
          >
            Panel administrador de productos
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
          }}
        >
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              backgroundColor: darkMode ? "#facc15" : "#111",
              color: darkMode ? "black" : "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {darkMode ? "☀️ Claro" : "🌙 Oscuro"}
          </button>

          {user && (
            <button
              onClick={cerrarSesion}
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div
          style={{
            backgroundColor: "#d1fae5",
            color: "#065f46",
            padding: 14,
            borderRadius: 12,
            marginBottom: 20,
            fontWeight: "bold",
          }}
        >
          {mensaje}
        </div>
      )}

      {user && (
        <div
          style={{
            backgroundColor: darkMode ? "#1f2937" : "white",
            borderRadius: 20,
            padding: 25,
            marginBottom: 30,
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
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
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 15,
            }}
          >
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              placeholder="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              placeholder="Presentación"
              value={presentacion}
              onChange={(e) => setPresentacion(e.target.value)}
              style={inputStyle(darkMode)}
            />

            <input
              type="number"
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

                  const imageUrl = URL.createObjectURL(
                    e.target.files[0]
                  );

                  setPreview(imageUrl);
                }
              }}
              style={inputStyle(darkMode)}
            />
          </div>

          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 300,
                objectFit: "cover",
                borderRadius: 15,
                marginTop: 20,
              }}
            />
          )}

          <button
            onClick={agregarProducto}
            disabled={loading}
            style={{
              marginTop: 20,
              width: "100%",
              padding: 16,
              backgroundColor: loading
                ? "#4b5563"
                : "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {loading
              ? "Guardando..."
              : editandoId
              ? "Guardar Cambios"
              : "Agregar Producto"}
          </button>

          {editandoId && (
            <button
              onClick={() => {
                setEditandoId(null);

                setNombre("");
                setTipo("");
                setPresentacion("");
                setKilos("");
                setPrecio("");

                setImagen(null);
                setPreview("");
              }}
              style={{
                marginTop: 10,
                width: "100%",
                padding: 16,
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              Cancelar edición
            </button>
          )}
        </div>
      )}

      <input
        placeholder="🔍 Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          width: "100%",
          padding: 16,
          marginBottom: 30,
          borderRadius: 14,
          border: "none",
          fontSize: 16,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 25,
        }}
      >
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id}
            style={{
              backgroundColor: darkMode ? "#1f2937" : "white",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              transition: "0.25s",
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
            <img
              src={
                producto.imagen ||
                "https://via.placeholder.com/400x300?text=Sin+Imagen"
              }
              alt={producto.nombre}
              style={{
                width: "100%",
                height: 240,
                objectFit: "cover",
              }}
            />

            <div
              style={{
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h2
                  style={{
                    fontSize: 30,
                  }}
                >
                  {producto.nombre}
                </h2>

                <span
                  style={{
                    backgroundColor:
                      producto.tipo?.toLowerCase() ===
                      "mayorista"
                        ? "#2563eb"
                        : "#16a34a",
                    color: "white",
                    padding: "6px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  {producto.tipo}
                </span>
              </div>

              <p style={{ opacity: 0.8 }}>
                Presentación: {producto.presentacion}
              </p>

              <p style={{ opacity: 0.8 }}>
                Kg: {producto.kilos}
              </p>

              <p
                style={{
                  fontSize: 34,
                  fontWeight: "bold",
                  color: "#16a34a",
                  marginTop: 15,
                }}
              >
                $
                {Number(producto.precio).toLocaleString(
                  "es-AR"
                )}
              </p>

              {user && (
                <>
                  <button
                    onClick={() =>
                      editarProducto(producto)
                    }
                    style={{
                      width: "100%",
                      padding: 12,
                      backgroundColor: "#f59e0b",
                      color: "white",
                      border: "none",
                      borderRadius: 10,
                      marginTop: 15,
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      eliminarProducto(producto.id)
                    }
                    style={{
                      width: "100%",
                      padding: 12,
                      backgroundColor: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: 10,
                      marginTop: 10,
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function inputStyle(darkMode: boolean) {
  return {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "none",
    backgroundColor: darkMode ? "#374151" : "#f3f4f6",
    color: darkMode ? "white" : "black",
    fontSize: 15,
  };
}