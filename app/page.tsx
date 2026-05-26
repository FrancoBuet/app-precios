"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [productos, setProductos] = useState<any[]>([]);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [presentacion, setPresentacion] = useState("");
  const [kilos, setKilos] = useState("");
  const [precio, setPrecio] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [user, setUser] = useState<any>(null);

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

    const { error } = await supabase.from("productos").insert([
      {
        nombre,
        tipo,
        presentacion,
        kilos: Number(kilos),
        precio: Number(precio),
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setNombre("");
    setTipo("");
    setPresentacion("");
    setKilos("");
    setPrecio("");

    obtenerProductos();
  }

  async function eliminarProducto(id: number) {
    await supabase.from("productos").delete().eq("id", id);

    obtenerProductos();
  }

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      <h1
        style={{
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Lista de Productos
      </h1>

      {user && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: 20,
            borderRadius: 10,
            marginBottom: 30,
          }}
        >
          <h2>Agregar Producto</h2>

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

          <button
            onClick={agregarProducto}
            style={{
              padding: 12,
              width: "100%",
              backgroundColor: "green",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Agregar Producto
          </button>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: 15,
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2>{producto.nombre}</h2>

            <p>Tipo: {producto.tipo}</p>

            <p>Presentación: {producto.presentacion}</p>

            <p>Kg: {producto.kilos}</p>

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
              <button
                onClick={() => eliminarProducto(producto.id)}
                style={{
                  marginTop: 10,
                  backgroundColor: "red",
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}