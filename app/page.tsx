"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
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

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    obtenerProductos();
  }, []);

  async function obtenerProductos() {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .order("id", { ascending: false });

    setProductos(data || []);
  }

  async function agregarProducto() {
    if (!nombre || !precio) {
      alert("Completa nombre y precio");
      return;
    }

    let imagenUrl = "";

    if (imagen) {
      const nombreArchivo = `${Date.now()}-${imagen.name}`;

      const { error: uploadError } = await supabase.storage
        .from("productos")
        .upload(nombreArchivo, imagen);

      if (uploadError) {
        alert(uploadError.message);
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
        return;
      }

      setEditandoId(null);

      setMensaje("Producto actualizado correctamente");

      setTimeout(() => {
        setMensaje("");
      }, 3000);
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
        return;
      }

      setMensaje("Producto agregado correctamente");

      setTimeout(() => {
        setMensaje("");
      }, 3000);
    }

    setNombre("");
    setTipo("");
    setPresentacion("");
    setKilos("");
    setPrecio("");
    setImagen(null);
    setPreview("");

    obtenerProductos();
  }

  async function eliminarProducto(id: number) {
    const confirmar = confirm(
      "¿Seguro que querés eliminar este producto?"
    );

    if (!confirmar) return;

    await supabase.from("productos").delete().eq("id", id);

    obtenerProductos();

    setMensaje("Producto eliminado");

    setTimeout(() => {
      setMensaje("");
    }, 3000);
  }

  function editarProducto(producto: any) {
    setEditandoId(producto.id);

    setNombre(producto.nombre || "");
    setTipo(producto.tipo || "");
    setPresentacion(producto.presentacion || "");
    setKilos(producto.kilos?.toString() || "");
    setPrecio(producto.precio?.toString() || "");
  }

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div
      style={{
        padding: 20,
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
        }}
      >
        <h1>Lista de Productos</h1>

        {user ? (
          <button
            onClick={cerrarSesion}
            style={{
              backgroundColor: "#111",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        ) : (
          <button
            onClick={() => (window.location.href = "/login")}
            style={{
              backgroundColor: "green",
              color: "white",
              border: "none",
              padding: "10px 16px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Iniciar sesión
          </button>
        )}
      </div>

      {mensaje && (
        <div
          style={{
            backgroundColor: "#d1fae5",
            color: "#065f46",
            padding: 12,
            borderRadius: 10,
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
            border: "1px solid #ccc",
            padding: 20,
            borderRadius: 10,
            marginBottom: 30,
            backgroundColor: "white",
          }}
        >
          <h2>
            {editandoId ? "Editar Producto" : "Agregar Producto"}
          </h2>

          <input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: 10,
            }}
          />

          <input
            placeholder="Tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: 10,
            }}
          />

          <input
            placeholder="Presentación"
            value={presentacion}
            onChange={(e) => setPresentacion(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: 10,
            }}
          />

          <input
            placeholder="Kilos"
            value={kilos}
            onChange={(e) => setKilos(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: 10,
            }}
          />

          <input
            placeholder="Precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: 10,
            }}
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
            style={{
              width: "100%",
              marginBottom: 10,
            }}
          />

          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                borderRadius: 10,
                marginBottom: 10,
              }}
            />
          )}

          <button
            onClick={agregarProducto}
            style={{
              padding: 12,
              width: "100%",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            {editandoId
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
                padding: 12,
                width: "100%",
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Cancelar edición
            </button>
          )}
        </div>
      )}

      <input
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginBottom: 30,
          borderRadius: 10,
          border: "1px solid #ccc",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 20,
              padding: 20,
              boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
              transition: "0.2s",
              backgroundColor: "white",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                "translateY(-5px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0px)";
            }}
          >
            {producto.imagen && (
              <img
                src={producto.imagen}
                alt={producto.nombre}
                style={{
                  width: "100%",
                  height: 200,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              />
            )}

            <h2
              style={{
                fontSize: 28,
                fontWeight: "bold",
                marginBottom: 10,
              }}
            >
              {producto.nombre}
            </h2>

            <p
              style={{
                marginBottom: 8,
                color: "#444",
              }}
            >
              Tipo: {producto.tipo}
            </p>

            <p
              style={{
                marginBottom: 8,
                color: "#444",
              }}
            >
              Presentación: {producto.presentacion}
            </p>

            <p
              style={{
                marginBottom: 8,
                color: "#444",
              }}
            >
              Kg: {producto.kilos}
            </p>

            <p
              style={{
                color: "green",
                fontWeight: "bold",
                fontSize: 28,
              }}
            >
              ${producto.precio}
            </p>

            {user && (
              <>
                <button
                  onClick={() =>
                    eliminarProducto(producto.id)
                  }
                  style={{
                    marginTop: 10,
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    padding: 10,
                    borderRadius: 8,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Eliminar
                </button>

                <button
                  onClick={() =>
                    editarProducto(producto)
                  }
                  style={{
                    marginTop: 10,
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    padding: 10,
                    borderRadius: 8,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Editar
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}