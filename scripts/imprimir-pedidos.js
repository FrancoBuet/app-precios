const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const INTERVALO_MS = Number(process.env.PEDIDOS_PRINT_INTERVAL_MS || 5000);
const PRINTER_NAME = process.env.PEDIDOS_PRINTER_NAME || "EPSON TM-T20II Receipt5";
const DRY_RUN = process.argv.includes("--dry-run");
const ONCE = process.argv.includes("--once");

function cargarEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) return {};

  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = { ...cargarEnvLocal(), ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function precio(valor) {
  return money.format(Math.round(Number(valor || 0)));
}

function fechaArgentina(valor) {
  return new Date(valor).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function quitarAcentos(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cortarTexto(texto, ancho) {
  const palabras = quitarAcentos(texto).split(/\s+/).filter(Boolean);
  const lineas = [];
  let actual = "";

  for (const palabra of palabras) {
    if (!actual) {
      actual = palabra;
    } else if (`${actual} ${palabra}`.length <= ancho) {
      actual += ` ${palabra}`;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }

  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

function lineaProducto(texto, total) {
  const anchoTotal = 40;
  const anchoPrecio = 10;
  const anchoTexto = anchoTotal - anchoPrecio - 1;
  const precioTexto = `$${precio(total)}`.slice(0, anchoPrecio);
  const lineas = cortarTexto(texto, anchoTexto);
  const primera = `${lineas[0].padEnd(anchoTexto, " ")} ${precioTexto.padStart(anchoPrecio, " ")}`;
  const extras = lineas.slice(1).map((linea) => linea);
  return [primera, ...extras].join("\n");
}

function armarTicket(pedido) {
  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const lineas = [
    "          EL NONO COQUI",
    "              Pedido",
    `        ${fechaArgentina(pedido.created_at)}`,
    "-".repeat(40),
    ...items.map((item) => lineaProducto(item.texto || item.nombre || "", item.total)),
    lineaProducto("Envio", pedido.envio),
    "-".repeat(40),
    `Total${`$${precio(pedido.total)}`.padStart(35, " ")}`,
    "-".repeat(40),
    `Nombre: ${quitarAcentos(pedido.cliente_nombre || "")}`,
    `Telefono: ${quitarAcentos(pedido.cliente_telefono || "")}`,
    ...cortarTexto(`Direccion: ${pedido.direccion || ""}`, 40),
    ...(pedido.notas ? cortarTexto(`Aclaraciones: ${pedido.notas}`, 40) : []),
    "-".repeat(40),
    "       Gracias por tu pedido",
    "",
    "",
    "",
  ];

  return lineas.join(os.EOL);
}

function imprimirTexto(texto, pedidoId) {
  const archivo = path.join(os.tmpdir(), `pedido-${pedidoId}.txt`);
  fs.writeFileSync(archivo, texto, "utf8");

  if (DRY_RUN) {
    console.log(`\n--- TICKET ${pedidoId} ---\n${texto}`);
    return;
  }

  const comando = `Get-Content -LiteralPath '${archivo.replace(/'/g, "''")}' | Out-Printer -Name '${PRINTER_NAME.replace(/'/g, "''")}'`;
  const resultado = spawnSync("powershell.exe", ["-NoProfile", "-Command", comando], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (resultado.status !== 0) {
    throw new Error(resultado.stderr || resultado.stdout || "Windows no pudo enviar el ticket a la impresora");
  }
}

async function marcarImpreso(id) {
  const { error } = await supabase
    .from("pedidos")
    .update({
      estado: DRY_RUN ? "prueba_impresion" : "impreso",
      impreso_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

async function buscarPedidosNuevos() {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .is("impreso_at", null)
    .eq("estado", "nuevo")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) throw error;
  return data || [];
}

async function ciclo() {
  const pedidos = await buscarPedidosNuevos();

  for (const pedido of pedidos) {
    console.log(`Imprimiendo pedido ${pedido.id} - ${pedido.cliente_nombre || "sin nombre"}`);
    imprimirTexto(armarTicket(pedido), pedido.id);
    await marcarImpreso(pedido.id);
    console.log(`Pedido ${pedido.id} marcado como impreso`);
  }

  if (pedidos.length === 0) {
    console.log(`Sin pedidos nuevos. Esperando ${INTERVALO_MS / 1000}s...`);
  }
}

async function main() {
  console.log(`Monitor de pedidos iniciado`);
  console.log(`Impresora: ${PRINTER_NAME}`);
  if (DRY_RUN) console.log("Modo prueba: no envia a la impresora");

  await ciclo();
  if (ONCE) return;

  setInterval(() => {
    ciclo().catch((error) => {
      console.error("Error en monitor:", error.message);
    });
  }, INTERVALO_MS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
