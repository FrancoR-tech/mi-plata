import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Plus, Trash2, ShieldCheck, Flag, Repeat, Settings, Download, RefreshCw, ArrowRight,
  Home, TrendingUp, AlertTriangle, Wifi, WifiOff, CalendarClock, Image as ImageIcon, Check, Circle, PieChart as PieIcon,
} from "lucide-react";

/* ══════════════ constantes ══════════════ */

const CAT_GASTO = ["Casa","Comida","Transporte","Salud","Estudio","Salidas","Servicios","Impuestos","Otros"];
const CAT_ENTRADA = ["Sueldo","Trabajos aparte","Alquiler que cobro","Otros"];

/* ── sobres: en qué se reparte lo que entra ──
   El mapeo de categorías define qué gasto cae en qué sobre cuando mido lo real. */
const SOBRES = {
  necesarios:  { label: "Lo necesario",  color: "#16232B", que: "Lo que no podés no pagar: comida, transporte, salud, servicios." },
  deudas:      { label: "Deudas",        color: "#8E2F3E", que: "Lo que le sacás de encima a la tarjeta o al préstamo." },
  colchon:     { label: "Colchón",       color: "#4A7C8C", que: "Plata a mano para un imprevisto. No se invierte: se guarda." },
  inversiones: { label: "Inversiones",   color: "#1E6B55", que: "Lo que ponés a crecer y no vas a tocar." },
  recompensas: { label: "Recompensas",   color: "#C9A24B", que: "Tus gustos. Sin esto el plan no se sostiene." },
};
const CATS_NECESARIAS = ["Casa","Comida","Transporte","Salud","Servicios","Impuestos","Estudio"];
const CATS_GUSTO = ["Salidas","Otros"];
const REPARTO_BASE = { necesarios: 25, deudas: 0, colchon: 25, inversiones: 35, recompensas: 15 };

const INSTRUMENTOS = {
  cripto:     { label: "Cripto", moneda: "USD", dolar: "cripto" },
  stable:     { label: "Stablecoin (USDT)", moneda: "USD", dolar: "cripto", fijo: 1 },
  cedear:     { label: "CEDEAR", moneda: "ARS" },
  accion:     { label: "Acción argentina", moneda: "ARS" },
  bono:       { label: "Bono u ON", moneda: "ARS" },
  fci:        { label: "Fondo (FCI)", moneda: "ARS" },
  accion_usd: { label: "Acción del exterior", moneda: "USD", dolar: "mep" },
};

const PLATAFORMAS = {
  IOL: "local", IEB: "local", "Bull Market": "local", Cocos: "local", Balanz: "local",
  PPI: "local", "Banco u otro broker": "local", Lemon: "local", Belo: "local", Buenbit: "local",
  Binance: "exterior", Nexo: "exterior", BingX: "exterior", "Billetera propia": "propia", Otra: "local",
};

const LENTES = { pesos:"En pesos", reales:"En pesos de hoy", dolares:"En dólares" };

const ROJOS  = ["#8E2F3E","#A23F4C","#B4505A","#C36269","#CE757B","#D7888D","#DE9BA0","#E4AEB2","#E9C0C3"];
const VERDES = ["#12503F","#1E6B55","#2C7F67","#3E9179","#55A38C","#6FB49F","#8CC4B2","#AAD3C4","#C7E1D6"];
const AZULES = ["#22414F","#2F5568","#3D6A80","#4E8098","#6295AC","#79A9BE","#93BCCE","#AFCFDC","#CBE1E9"];

const VIEJO_DIAS = 5;
const SEMILLA_FECHA = "2026-07-09";
const SEMILLA_IPC = {
  "2025-04":2.8,"2025-05":1.5,"2025-06":1.6,"2025-07":1.9,"2025-08":1.9,"2025-09":2.1,
  "2025-10":2.3,"2025-11":2.5,"2025-12":2.8,"2026-01":2.9,"2026-02":2.9,"2026-03":3.4,
  "2026-04":2.6,"2026-05":2.1,
};

const INICIAL = {
  configurado: false,
  estimacion: { entra: 0, sale: 0 },
  entradas: [], gastos: [], fijos: [], saldos: {}, deudas: {}, metas: [], inversiones: [], vencimientos: [],
  precios: {},
  colchonMeses: 3,
  colchonBase: "auto",
  reparto: { ...REPARTO_BASE },
  mercado: { mep: 1531.6, cripto: 1568.31, blue: 1510, oficial: 1510, actualizado: null },
  ipc: { serie: SEMILLA_IPC, promedio: 2.7, actualizado: null },
  ultimoMesFijos: null, fotos: {},
};

/* ══════════════ utilidades ══════════════ */

const hoyYM = () => new Date().toISOString().slice(0, 7);
const hoyISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);
const diasDesde = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const diasHasta = (iso) => Math.ceil((new Date(`${iso}T12:00:00`) - new Date()) / 86400000);

const M = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const ML = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const nombreMes = (ym) => `${M[+ym.slice(5, 7) - 1]} ${ym.slice(2, 4)}`;
const mesLargo = (ym) => `${ML[+ym.slice(5, 7) - 1]} de ${ym.slice(0, 4)}`;
const sumaMeses = (ym, n) => {
  const [a, m] = ym.split("-").map(Number);
  return new Date(a, m - 1 + n, 1).toISOString().slice(0, 7);
};
const rangoMeses = (desde, hasta) => {
  const out = []; let k = desde;
  while (k <= hasta && out.length < 60) { out.push(k); k = sumaMeses(k, 1); }
  return out;
};

const fmt = (n, d = 0) =>
  new Intl.NumberFormat("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number.isFinite(n) ? n : 0);
const corto = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `${fmt(n / 1e6, 1)} M`;
  if (a >= 1e4) return `${fmt(n / 1e3, 0)} mil`;
  return fmt(n);
};
const pctS = (n) => `${n >= 0 ? "+" : ""}${fmt(n, 1)}%`;
const clave = (tipo, ticker) => `${tipo}|${ticker}`;

/* Tenencias: una cripto necesita muchos decimales (0,00042319 BTC) y una acción
   ninguno (20 CEDEARs). Muestro los que hagan falta y ni uno más: nunca
   "20,00000000", nunca un satoshi de menos. */
const fmtUni = (n) => {
  if (!Number.isFinite(n) || n === 0) return "0";
  const a = Math.abs(n);
  const dec = a >= 1000 ? 0 : a >= 1 ? 4 : a >= 0.01 ? 6 : 8;
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(n);
};
/* Precios: un BTC vale 65.000 y una fracción de token 0,00000001. Mismo criterio. */
const fmtPre = (n) => {
  if (!Number.isFinite(n)) return "0";
  const a = Math.abs(n);
  const dec = a >= 1000 ? 0 : a >= 1 ? 2 : a >= 0.01 ? 4 : 8;
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(n);
};

function mesesParaCancelar(saldo, cuota, r) {
  if (cuota <= 0) return null;
  if (r <= 0) return Math.ceil(saldo / cuota);
  if (cuota <= saldo * r) return null;
  return Math.ceil(-Math.log(1 - (saldo * r) / cuota) / Math.log(1 + r));
}

/* migra datos de versiones anteriores al modelo v8 */
function migrar(x) {
  const y = { ...x };
  // deudas: de array (v6/v7) a objeto por mes
  if (Array.isArray(y.deudas)) {
    const arr = y.deudas;
    y.deudas = arr.length ? { [hoyYM()]: arr.map((z) => ({ ...z, id: z.id || uid() })) } : {};
  } else if (!y.deudas || typeof y.deudas !== "object") {
    y.deudas = {};
  }
  // liquido viejo (v5-) -> saldo del mes actual
  if (Array.isArray(y.liquido) && y.liquido.length && (!y.saldos || !Object.keys(y.saldos).length)) {
    const pesos = y.liquido.filter((g) => g.tipo !== "dolares").reduce((s, g) => s + g.cantidad, 0);
    const dolares = y.liquido.filter((g) => g.tipo === "dolares").reduce((s, g) => s + g.cantidad, 0);
    y.saldos = { [hoyYM()]: { pesos, plazo: 0, dolares } };
  }
  delete y.liquido;
  if (!y.saldos || typeof y.saldos !== "object") y.saldos = {};
  // reparto: quien viene de una versión anterior arranca con la base
  if (!y.reparto || typeof y.reparto !== "object") y.reparto = { ...REPARTO_BASE };
  else y.reparto = { ...REPARTO_BASE, ...y.reparto };
  return y;
}

/* devuelve el último valor declarado en o antes de "mes" dentro de un mapa {ym: v} */
function arrastrar(mapa, mes) {
  const claves = Object.keys(mapa).filter((k) => k <= mes).sort();
  return claves.length ? { ym: claves[claves.length - 1], valor: mapa[claves[claves.length - 1]] } : null;
}

const TIP = { background: "#F5F7F2", border: "1px solid #16232B", borderRadius: 4, fontSize: 12, color: "#16232B", boxShadow: "none" };
const TIP_ITEM = { color: "#16232B" };
const TIP_LABEL = { color: "#8A968F", marginBottom: 2 };

/* ══════════════ app ══════════════ */

export default function App() {
  const [d, setD] = useState(INICIAL);
  const [cargando, setCargando] = useState(true);
  const [lente, setLente] = useState("pesos");
  const [tab, setTab] = useState("hoy");
  const [aviso, setAviso] = useState(null);
  const [online, setOnline] = useState(null);
  const yaBusque = useRef(false);
  const navRef = useRef(null);
  const ym = hoyYM();
  const [mesVista, setMesVista] = useState(ym);
  const viendoPasado = mesVista < ym;

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("plata:v8");
        if (r?.value) setD(migrar({ ...INICIAL, ...JSON.parse(r.value) }));
        else {
          // intento levantar datos de una versión anterior
          for (const k of ["plata:v7", "plata:v6"]) {
            const viejo = await window.storage.get(k);
            if (viejo?.value) { setD(migrar({ ...INICIAL, ...JSON.parse(viejo.value) })); break; }
          }
        }
      } catch { /* primera vez */ }
      setCargando(false);
    })();
  }, []);

  const guardar = useCallback(async (n) => {
    setD(n);
    try { await window.storage.set("plata:v8", JSON.stringify(n)); }
    catch { setAviso("No se pudo guardar. Los cambios duran solo esta sesión."); }
  }, []);

  useEffect(() => { if (aviso) { const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t); } }, [aviso]);

  useEffect(() => {
    const el = navRef.current?.querySelector(".tab.on");
    if (el?.scrollIntoView) el.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab]);

  /* ── lo único que se busca solo: dólar e inflación ── */
  const buscarTodo = useCallback(async (silencioso) => {
    if (!silencioso) setAviso("Buscando dólar e inflación…");
    const n = JSON.parse(JSON.stringify(d));
    let ok = 0;
    try {
      const j = await (await fetch("https://dolarapi.com/v1/dolares")).json();
      const g = (c) => j.find((x) => x.casa === c)?.venta;
      n.mercado = {
        mep: g("bolsa") ?? n.mercado.mep, cripto: g("cripto") ?? n.mercado.cripto,
        blue: g("blue") ?? n.mercado.blue, oficial: g("oficial") ?? n.mercado.oficial,
        actualizado: new Date().toISOString(),
      };
      ok++;
    } catch { /* sin red */ }
    try {
      const j = await (await fetch("https://api.argentinadatos.com/v1/finanzas/indices/inflacion")).json();
      const serie = {};
      j.slice(-30).forEach((x) => { serie[String(x.fecha).slice(0, 7)] = x.valor; });
      const claves = Object.keys(serie).sort();
      if (claves.length) {
        const u3 = claves.slice(-3).map((k) => serie[k]);
        n.ipc = { serie, promedio: u3.reduce((a, b) => a + b, 0) / u3.length, actualizado: new Date().toISOString() };
        ok++;
      }
    } catch { /* sin red */ }
    setOnline(ok > 0);
    if (!ok) { if (!silencioso) setAviso("No hay conexión. Sigo con los valores que ya tengo."); return; }
    await guardar(n);
    if (!silencioso) setAviso(`Listo. MEP $${fmt(n.mercado.mep)} · cripto $${fmt(n.mercado.cripto)}.`);
  }, [d, guardar]);

  useEffect(() => {
    if (cargando || !d.configurado || yaBusque.current) return;
    yaBusque.current = true;
    if (!d.mercado.actualizado || diasDesde(d.mercado.actualizado) >= 1) buscarTodo(true);
  }, [cargando, d.configurado, d.mercado.actualizado, buscarTodo]);

  /* ── inflación ── */
  const ipcClaves = useMemo(() => Object.keys(d.ipc.serie).sort(), [d.ipc.serie]);
  const ultimoOficial = ipcClaves[ipcClaves.length - 1] || null;
  const mesesEstimados = useMemo(() => {
    if (!ultimoOficial) return 0;
    let c = 0, k = sumaMeses(ultimoOficial, 1);
    while (k <= ym) { c++; k = sumaMeses(k, 1); }
    return c;
  }, [ultimoOficial, ym]);

  const factorReal = useCallback((mes) => {
    if (!mes || mes >= ym) return 1;
    let f = 1, k = mes;
    while (k < ym) { f *= 1 + (d.ipc.serie[k] ?? d.ipc.promedio) / 100; k = sumaMeses(k, 1); }
    return f;
  }, [d.ipc, ym]);

  const inflacionMensual = d.ipc.serie[ultimoOficial] ?? d.ipc.promedio;

  const conv = useCallback((p, mes = ym) => {
    if (lente === "pesos") return p;
    if (lente === "reales") return p * factorReal(mes);
    return p / (d.mercado.mep || 1);
  }, [lente, factorReal, d.mercado.mep, ym]);
  const signo = lente === "dolares" ? "US$" : "$";

  /* ── precios (todos manuales) ── */
  const dolarDe = useCallback((t) => (INSTRUMENTOS[t]?.dolar === "cripto" ? d.mercado.cripto : d.mercado.mep), [d.mercado]);
  const precioDe = useCallback((tipo, ticker) => {
    if (INSTRUMENTOS[tipo].fijo) return { valor: INSTRUMENTOS[tipo].fijo, fecha: hoyISO() };
    return d.precios[clave(tipo, ticker)] || null;
  }, [d.precios]);

  /* ── posiciones: compras y ventas agrupadas, promedio ponderado ── */
  const posiciones = useMemo(() => {
    const g = {};
    d.inversiones.forEach((l) => {
      const k = clave(l.tipo, l.ticker);
      if (!g[k]) g[k] = { k, tipo: l.tipo, ticker: l.ticker, lotes: [], ventas: [], plataformas: new Set() };
      if (l.venta) g[k].ventas.push(l);
      else { g[k].lotes.push(l); g[k].plataformas.add(l.plataforma); }
    });

    return Object.values(g).map((p) => {
      const inst = INSTRUMENTOS[p.tipo];
      const enUSD = inst.moneda === "USD";
      const dHoy = dolarDe(p.tipo);
      const precio = precioDe(p.tipo, p.ticker);

      const compradas = p.lotes.reduce((s, l) => s + l.cantidad, 0);
      const vendidas = p.ventas.reduce((s, l) => s + l.cantidad, 0);
      const cantidad = Math.max(0, compradas - vendidas);          // lo que aún tenés
      const promedio = compradas ? p.lotes.reduce((s, l) => s + l.cantidad * l.precioCompra, 0) / compradas : 0;

      /* costo de lo comprado, en tres monedas (promedio ponderado) */
      let costoNominal = 0, costoReal = 0, costoUSD = 0;
      p.lotes.forEach((l) => {
        const dCompra = l.dolarCompra || dHoy;
        const ars = l.cantidad * l.precioCompra * (enUSD ? dCompra : 1);
        costoNominal += ars;
        costoReal += ars * factorReal(l.fechaCompra?.slice(0, 7));
        costoUSD += enUSD ? l.cantidad * l.precioCompra : ars / dCompra;
      });
      /* costo promedio por unidad, para prorratear lo que queda y lo vendido */
      const costoUnitNom = compradas ? costoNominal / compradas : 0;

      /* resultado realizado: por cada venta, precio de venta − costo promedio */
      let realizado = 0;
      p.ventas.forEach((l) => {
        const dVenta = l.dolarVenta || dHoy;
        const ingreso = l.cantidad * l.precioVenta * (enUSD ? dVenta : 1);
        realizado += ingreso - l.cantidad * costoUnitNom;
      });

      /* fracción que todavía tenés, para prorratear el costo en cada moneda */
      const frac = compradas ? cantidad / compradas : 0;
      const costoRestante = costoNominal * frac;      // ARS nominal
      const costoRestReal = costoReal * frac;          // ARS de hoy
      const costoRestUSD = costoUSD * frac;            // USD

      const valor = precio ? cantidad * precio.valor * (enUSD ? dHoy : 1) : null;
      const valorUSD = precio ? cantidad * precio.valor * (enUSD ? 1 : 1 / dHoy) : null;
      const rend = valor && costoRestante ? {
        nominal: (valor / costoRestante - 1) * 100,
        real: costoRestReal ? (valor / costoRestReal - 1) * 100 : null,
        usd: costoRestUSD && valorUSD ? (valorUSD / costoRestUSD - 1) * 100 : null,
      } : null;

      return { ...p, inst, enUSD, cantidad, compradas, vendidas, promedio, precio, valor, costoRestante, realizado, rend, plataformas: [...p.plataformas] };
    }).sort((a, b) => (b.valor || 0) - (a.valor || 0));
  }, [d.inversiones, dolarDe, precioDe, factorReal]);

  /* ── total invertido HOY (a precio de mercado) ── */
  const totalInvertido = useMemo(() => posiciones.reduce((s, p) => s + (p.valor || 0), 0), [posiciones]);
  const realizadoTotal = useMemo(() => posiciones.reduce((s, p) => s + (p.realizado || 0), 0), [posiciones]);
  const sinPrecio = posiciones.filter((p) => !p.precio && p.cantidad > 0);
  const preciosViejos = posiciones.filter((p) => p.precio && !p.inst.fijo && p.cantidad > 0 && diasDesde(p.precio.fecha) > VIEJO_DIAS);

  /* ── inversiones tal como estaban en el mes que se mira ──
     en el presente: valor de mercado. en el pasado: solo lo comprado (neto vendido) hasta ese mes, a costo. */
  const posicionesMes = useMemo(() => {
    if (!viendoPasado) return posiciones.map((p) => ({ ...p, valorMes: p.valor, aCosto: false }));
    return posiciones.map((p) => {
      const lotes = p.lotes.filter((l) => (l.fechaCompra || "").slice(0, 7) <= mesVista);
      const ventas = p.ventas.filter((l) => (l.fechaVenta || "").slice(0, 7) <= mesVista);
      const comp = lotes.reduce((s, l) => s + l.cantidad, 0);
      const vend = ventas.reduce((s, l) => s + l.cantidad, 0);
      const cantidad = Math.max(0, comp - vend);
      if (!lotes.length || cantidad <= 0) return null;
      const costoUnit = comp ? lotes.reduce((s, l) => s + l.cantidad * l.precioCompra * (p.enUSD ? (l.dolarCompra || dolarDe(p.tipo)) : 1), 0) / comp : 0;
      return { ...p, lotes, cantidad, valorMes: cantidad * costoUnit, aCosto: true };
    }).filter(Boolean).sort((a, b) => (b.valorMes || 0) - (a.valorMes || 0));
  }, [posiciones, viendoPasado, mesVista, dolarDe]);
  const invertidoMes = useMemo(() => posicionesMes.reduce((s, p) => s + (p.valorMes || 0), 0), [posicionesMes]);

  /* ── disponibilidades: se declara un saldo por mes y la app lo arrastra ── */
  const valorSaldo = useCallback((s) => (s ? (s.pesos || 0) + (s.plazo || 0) + (s.dolares || 0) * d.mercado.mep : 0), [d.mercado.mep]);
  const mesesConSaldo = useMemo(() => Object.keys(d.saldos).sort(), [d.saldos]);
  const ultimoMesSaldo = mesesConSaldo[mesesConSaldo.length - 1] || null;
  const totalLiquido = useMemo(() => valorSaldo(ultimoMesSaldo ? d.saldos[ultimoMesSaldo] : null), [ultimoMesSaldo, d.saldos, valorSaldo]);
  /* líquido arrastrado hasta el mes que se mira */
  const saldoMesRef = useMemo(() => arrastrar(d.saldos, mesVista), [d.saldos, mesVista]);
  const liquidoMes = viendoPasado ? valorSaldo(saldoMesRef?.valor) : totalLiquido;

  /* ── deudas: mapa por mes, se arrastra el último saldo conocido ── */
  const mapaDeudaValor = useMemo(() => {
    const m = {};
    Object.entries(d.deudas).forEach(([k, arr]) => { m[k] = arr.reduce((s, x) => s + x.monto, 0); });
    return m;
  }, [d.deudas]);
  const mesesConDeuda = useMemo(() => Object.keys(d.deudas).sort(), [d.deudas]);
  const ultimoMesDeuda = mesesConDeuda[mesesConDeuda.length - 1] || null;
  const deudaRefHoy = useMemo(() => arrastrar(mapaDeudaValor, ym), [mapaDeudaValor, ym]);
  const totalDeuda = deudaRefHoy?.valor || 0;
  const deudasHoy = ultimoMesDeuda ? d.deudas[ultimoMesDeuda] : [];
  const interesesMes = useMemo(() => (deudasHoy || []).reduce((s, x) => s + (x.intereses || 0), 0), [deudasHoy]);
  const deudaCreciendo = useMemo(() => (deudasHoy || []).find((x) => x.intereses > 0 && x.cuota > 0 && x.cuota <= x.intereses), [deudasHoy]);
  /* deuda del mes que se mira */
  const deudaRefMes = useMemo(() => arrastrar(mapaDeudaValor, mesVista), [mapaDeudaValor, mesVista]);
  const deudaMes = viendoPasado ? (deudaRefMes?.valor || 0) : totalDeuda;

  const enLimpio = totalLiquido + totalInvertido - totalDeuda;
  const enLimpioMes = viendoPasado ? liquidoMes + invertidoMes - deudaMes : enLimpio;

  /* ── meses reales; el mes en curso no cuenta para promedios ── */
  const mesesConDato = useMemo(() => {
    const s = new Set();
    d.entradas.forEach((x) => s.add(x.fecha.slice(0, 7)));
    d.gastos.forEach((x) => s.add(x.fecha.slice(0, 7)));
    return [...s].sort();
  }, [d.entradas, d.gastos]);

  const porMesReal = useMemo(() => {
    if (!mesesConDato.length) return [];
    return rangoMeses(mesesConDato[0], mesesConDato[mesesConDato.length - 1]).map((k) => ({
      ym: k, mes: nombreMes(k), enCurso: k === ym,
      entra: d.entradas.filter((x) => x.fecha.startsWith(k)).reduce((s, x) => s + x.monto, 0),
      sale: d.gastos.filter((x) => x.fecha.startsWith(k)).reduce((s, x) => s + x.monto, 0),
    }));
  }, [mesesConDato, d.entradas, d.gastos, ym]);

  const cerrados = porMesReal.filter((m) => !m.enCurso);
  const conGasto = cerrados.filter((m) => m.sale > 0);
  const conEntrada = cerrados.filter((m) => m.entra > 0);

  /* ── registro mensual: une flujos + saldos declarados + arqueo ── */
  const registro = useMemo(() => {
    const claves = new Set([...mesesConDato, ...mesesConSaldo]);
    if (!claves.length) return [];
    const orden = [...claves].sort();
    const todos = rangoMeses(orden[0], ym < orden[orden.length - 1] ? orden[orden.length - 1] : ym);
    let saldoPrevio = null; // valor del último saldo declarado
    return todos.map((k) => {
      const entra = d.entradas.filter((x) => x.fecha.startsWith(k)).reduce((s, x) => s + x.monto, 0);
      const sale = d.gastos.filter((x) => x.fecha.startsWith(k)).reduce((s, x) => s + x.monto, 0);
      const neto = entra - sale;
      const declarado = d.saldos[k] ? valorSaldo(d.saldos[k]) : null;
      const esperado = saldoPrevio != null ? saldoPrevio + neto : null;
      const desvio = declarado != null && esperado != null ? declarado - esperado : null;
      const fila = { ym: k, mes: nombreMes(k), enCurso: k === ym, entra, sale, neto, declarado, esperado, desvio, saldoRaw: d.saldos[k] || null };
      if (declarado != null) saldoPrevio = declarado;
      else if (esperado != null) saldoPrevio = esperado;
      return fila;
    });
  }, [mesesConDato, mesesConSaldo, d.entradas, d.gastos, d.saldos, valorSaldo, ym]);

  const gasto = conGasto.length
    ? { valor: conGasto.slice(-3).reduce((s, m) => s + m.sale, 0) / Math.min(3, conGasto.length), estimado: false }
    : { valor: d.estimacion.sale, estimado: true };
  const ingreso = conEntrada.length
    ? { valor: conEntrada.slice(-3).reduce((s, m) => s + m.entra, 0) / Math.min(3, conEntrada.length), estimado: false }
    : { valor: d.estimacion.entra, estimado: true };
  const ahorro = { valor: ingreso.valor - gasto.valor, estimado: gasto.estimado || ingreso.estimado };

  /* ── colchón ── */
  const baseColchon = d.colchonBase === "sueldo" ? "sueldo"
    : d.colchonBase === "gasto" ? "gasto"
    : (!gasto.estimado ? "gasto" : "sueldo");
  const valorBase = baseColchon === "sueldo" ? ingreso.valor : gasto.valor;
  const mesesCubiertos = valorBase > 0 ? totalLiquido / valorBase : 0;
  const colchonListo = valorBase > 0 && mesesCubiertos >= d.colchonMeses;

  const porPlataforma = useMemo(() => {
    const m = {};
    d.inversiones.forEach((l) => {
      if (l.venta) return;
      const p = posiciones.find((x) => x.k === clave(l.tipo, l.ticker));
      if (!p || !p.valor || !p.compradas) return;
      m[l.plataforma] = (m[l.plataforma] || 0) + p.valor * (l.cantidad / p.compradas);
    });
    return Object.entries(m).map(([name, value]) => ({ name, value, tipo: PLATAFORMAS[name] || "local" })).sort((a, b) => b.value - a.value);
  }, [d.inversiones, posiciones]);
  const concentracion = porPlataforma.length && totalInvertido > 0
    ? { ...porPlataforma[0], p: (porPlataforma[0].value / totalInvertido) * 100 } : null;

  const revelacion = useMemo(() => {
    if (conEntrada.length < 4) return null;
    const v = conEntrada[0], n = conEntrada[conEntrada.length - 1];
    return { nominal: (n.entra / v.entra - 1) * 100, real: (n.entra / (v.entra * factorReal(v.ym)) - 1) * 100, desde: mesLargo(v.ym) };
  }, [conEntrada, factorReal]);

  const proximos = useMemo(() => {
    const hoy = new Date(), out = [];
    d.vencimientos.forEach((v) => {
      for (let k = 0; k < 2; k++) {
        const f = new Date(hoy.getFullYear(), hoy.getMonth() + k, v.dia);
        const dias = Math.ceil((f - hoy) / 86400000);
        if (dias >= 0 && dias <= 14) { out.push({ ...v, dias }); break; }
      }
    });
    return out.sort((a, b) => a.dias - b.dias);
  }, [d.vencimientos]);

  useEffect(() => {
    if (cargando || !d.configurado) return;
    if (d.fotos[ym]?.dia === hoyISO()) return;
    guardar({ ...d, fotos: { ...d.fotos, [ym]: { p: Math.round(enLimpio), dia: hoyISO() } } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, d.configurado, ym]);

  /* ── próximo paso ── */
  /* ══════ reparto: cómo se divide lo que entra ══════
     Objetivo: lo que el usuario define. Real: lo que efectivamente pasó ese mes,
     medido con los datos que ya tengo. La ecuación cierra siempre:
     necesarios + gustos + deudas + inversiones + resto = lo que entró. */
  const repartoReal = useMemo(() => {
    const k = mesVista;
    const entra = d.entradas.filter((x) => x.fecha.startsWith(k)).reduce((s, x) => s + x.monto, 0);
    const gastosMes = d.gastos.filter((x) => x.fecha.startsWith(k));
    const necesarios = gastosMes.filter((x) => CATS_NECESARIAS.includes(x.categoria)).reduce((s, x) => s + x.monto, 0);
    const recompensas = gastosMes.filter((x) => CATS_GUSTO.includes(x.categoria)).reduce((s, x) => s + x.monto, 0);
    const inversiones = d.inversiones
      .filter((l) => !l.venta && (l.fechaCompra || "").startsWith(k))
      .reduce((s, l) => {
        const inst = INSTRUMENTOS[l.tipo];
        const enUSD = inst?.moneda === "USD";
        return s + l.cantidad * l.precioCompra * (enUSD ? (l.dolarCompra || d.mercado.mep) : 1);
      }, 0);
    const deudas = (d.deudas[k] || []).reduce((s, x) => s + (x.cuota || 0), 0);
    const colchon = entra - necesarios - recompensas - inversiones - deudas;
    const hayDatos = entra > 0 || gastosMes.length > 0;
    return { entra, necesarios, recompensas, inversiones, deudas, colchon, hayDatos };
  }, [mesVista, d.entradas, d.gastos, d.inversiones, d.deudas, d.mercado.mep]);

  /* sugerencia según la etapa: la plata sigue el orden que manda la guía */
  const repartoSugerido = useMemo(() => {
    const conDeudaCara = interesesMes > 0 || !!deudaCreciendo;
    const base = d.reparto || REPARTO_BASE;
    const nec = base.necesarios, rec = base.recompensas;
    const resto = Math.max(0, 100 - nec - rec);
    if (conDeudaCara) {
      /* la deuda cara le gana a cualquier inversión: se lleva casi todo el resto */
      const deu = Math.round(resto * 0.7), col = resto - deu;
      return { necesarios: nec, deudas: deu, colchon: col, inversiones: 0, recompensas: rec,
        por: "Tenés deuda que te cobra intereses. Pagarla rinde más que cualquier inversión, así que se lleva la prioridad y las inversiones esperan." };
    }
    if (!colchonListo) {
      const col = Math.round(resto * 0.42), inv = resto - col;
      return { necesarios: nec, deudas: 0, colchon: col, inversiones: inv, recompensas: rec,
        por: "Sin deudas caras y con el colchón a medio armar: la prioridad es terminarlo. Cuando lo completes, este porcentaje se vuelca solo a inversiones." };
    }
    return { necesarios: nec, deudas: 0, colchon: 0, inversiones: resto, recompensas: rec,
      por: "Colchón hecho y sin deudas caras: todo lo que no gastás puede ir a crecer." };
  }, [interesesMes, deudaCreciendo, colchonListo, d.reparto]);

  const guia = useMemo(() => {
    const P = [];

    P.push({
      id: "registro", que: "Registrá tu primer mes", ir: "movimientos",
      hecho: cerrados.length >= 1,
      por: cerrados.length >= 1
        ? "Ya cerraste al menos un mes. Desde acá tus números salen de lo que pasó, no de lo que estimaste."
        : "Todo lo que ves ahora sale de lo que me contaste al arrancar. Anotá los gastos e ingresos de un mes para que los números empiecen a ser tuyos.",
    });

    P.push({
      id: "rojo", que: "Gastá menos de lo que entra", ir: "movimientos",
      hecho: ahorro.valor >= 0,
      por: ahorro.valor >= 0
        ? `Bien: de lo que entra te queda un resto para guardar${ahorro.estimado ? " (según lo que estimaste)" : ""}.`
        : `Se te va $${corto(Math.abs(ahorro.valor))} más de lo que entra por mes${ahorro.estimado ? ", según lo que me contaste" : ""}. Es lo primero que hay que dar vuelta.`,
    });

    const sinDeudaCara = interesesMes === 0 && !deudaCreciendo;
    P.push({
      id: "deudas", que: "Sacate las deudas caras de encima", ir: "deudas",
      hecho: sinDeudaCara,
      por: deudaCreciendo
        ? `"${deudaCreciendo.nombre}" está creciendo: tu pago no cubre los intereses, así que cada mes debés más.`
        : interesesMes > 0
        ? `Debés $${corto(totalDeuda)} y te cobran $${corto(interesesMes)} por mes solo por tenerla. Cancelarla es la única ganancia garantizada que tenés a mano.`
        : "No tenés deudas que te cobren intereses. Ese es el lugar donde querés estar.",
    });

    P.push({
      id: "colchon1", que: "Armá un mes de colchón", ir: "colchon",
      hecho: valorBase > 0 && mesesCubiertos >= 1,
      por: valorBase <= 0
        ? "Contame cuánto gastás o cobrás y calculo cuánto aguantás sin ingresos."
        : mesesCubiertos >= 1
        ? `Aguantás ${fmt(mesesCubiertos, 1)} meses sin cobrar. El primer mes ya está.`
        : `Si mañana te quedás sin ingresos, aguantás ${fmt(mesesCubiertos, 1)} meses. Apuntá a uno para empezar.`,
    });

    P.push({
      id: "colchonN", que: `Completá tu colchón (${d.colchonMeses} meses)`, ir: "colchon",
      hecho: colchonListo,
      por: colchonListo
        ? `Colchón hecho: aguantás ${fmt(mesesCubiertos, 1)} meses. De acá en adelante, lo que ahorres puede ir a crecer.`
        : valorBase > 0
        ? `Vas ${fmt(mesesCubiertos, 1)} de ${d.colchonMeses} meses. Faltan $${corto(Math.max(0, d.colchonMeses * valorBase - totalLiquido))}.`
        : `Apuntá a ${d.colchonMeses} meses de gastos guardados.`,
    });

    const concentracionRiesgo = concentracion && concentracion.p > 60 && concentracion.tipo === "exterior";
    const invOk = d.inversiones.length === 0 ? colchonListo : (sinPrecio.length === 0 && !concentracionRiesgo);
    P.push({
      id: "inversiones",
      que: sinPrecio.length ? `Cargá el precio de ${sinPrecio.length === 1 ? sinPrecio[0].ticker : "tus activos"}` : d.inversiones.length ? "Cuidá tus inversiones" : "Cuando puedas, empezá a invertir",
      ir: "inversiones",
      hecho: invOk,
      por: sinPrecio.length
        ? "Sin el precio de hoy no puedo calcular cuánto vale tu cartera ni cuánto rindió. Cargá el precio de cada activo."
        : concentracionRiesgo
        ? `El ${fmt(concentracion.p, 0)}% está en ${concentracion.name}, una sola plataforma del exterior. Conviene repartir el riesgo.`
        : d.inversiones.length
        ? "Tus inversiones están al día. Mantené los precios actualizados para ver cuánto rinden."
        : "Con el colchón hecho, la plata que ahorres de más puede empezar a crecer. Anotá tu primera compra cuando estés listo.",
    });

    P.push({
      id: "metas", que: "Ponele nombre y fecha a una meta", ir: "metas",
      hecho: d.metas.length > 0,
      por: d.metas.length > 0
        ? "Ya tenés una meta en marcha. Seguí sumando a tu ritmo."
        : "Con el colchón hecho y ahorro en marcha, esa plata necesita un destino y una fecha.",
    });

    const idx = P.findIndex((p) => !p.hecho);
    const completo = idx === -1;
    const indice = completo ? P.length - 1 : idx;
    const hechos = P.filter((p) => p.hecho).length;
    return { pasos: P, actual: P[indice], indice, total: P.length, hechos, completo };
  }, [deudaCreciendo, interesesMes, totalDeuda, valorBase, ahorro, sinPrecio, cerrados.length, mesesCubiertos, colchonListo, d.colchonMeses, concentracion, d.metas, totalLiquido]);

  const add = (k, o) => guardar({ ...d, [k]: [{ ...o, id: uid() }, ...d[k]] });
  const del = (k, id) => guardar({ ...d, [k]: d[k].filter((x) => x.id !== id) });
  const setPrecio = (tipo, ticker, valor) =>
    guardar({ ...d, precios: { ...d.precios, [clave(tipo, ticker)]: { valor, fecha: hoyISO() } } });

  /* deudas por mes */
  const addDeuda = (mes, o) =>
    guardar({ ...d, deudas: { ...d.deudas, [mes]: [{ ...o, id: uid() }, ...(d.deudas[mes] || [])] } });
  const delDeuda = (mes, id) => {
    const arr = (d.deudas[mes] || []).filter((x) => x.id !== id);
    const nd = { ...d.deudas };
    if (arr.length) nd[mes] = arr; else delete nd[mes];
    guardar({ ...d, deudas: nd });
  };
  const copiarDeudas = (mes) => {
    const ref = arrastrar(d.deudas, sumaMeses(mes, -1));
    if (!ref) return;
    guardar({ ...d, deudas: { ...d.deudas, [mes]: ref.valor.map((x) => ({ ...x, id: uid() })) } });
  };

  const cargarFijos = () => {
    if (!d.fijos.length) return;
    const nuevos = d.fijos.map((f) => ({ id: uid(), monto: f.monto, fecha: `${ym}-01`, categoria: f.categoria, nota: f.nombre }));
    guardar({ ...d, gastos: [...nuevos, ...d.gastos], ultimoMesFijos: ym });
    setAviso(`${nuevos.length} gastos fijos cargados para ${mesLargo(ym)}.`);
  };

  const exportarJSON = () => {
    const b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = `mi-plata-${hoyISO()}.json`; a.click();
  };

  const exportarImagen = () => {
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    const g = c.getContext("2d");
    g.fillStyle = "#E7EAE3"; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = "#16232B"; g.font = "600 30px Inter, sans-serif"; g.fillText("MI PLATA", 80, 120);
    g.font = "400 26px Inter, sans-serif"; g.fillStyle = "#8A968F"; g.fillText(mesLargo(ym).toUpperCase(), 80, 165);
    g.fillStyle = "#8A968F"; g.font = "400 26px Inter, sans-serif"; g.fillText("Lo que tengo, en limpio", 80, 300);
    g.fillStyle = "#16232B"; g.font = "500 92px ui-monospace, monospace"; g.fillText(`$${fmt(enLimpio)}`, 80, 400);
    const filas = [
      ["Aguanto sin cobrar", valorBase > 0 ? `${fmt(mesesCubiertos, 1)} meses` : "—"],
      ["Ahorro por mes", `$${corto(ahorro.valor)}${ahorro.estimado ? " (estimado)" : ""}`],
      ["Invertido", `$${corto(totalInvertido)}`],
      ["Debo", totalDeuda ? `$${corto(totalDeuda)}` : "nada"],
    ];
    filas.forEach(([k, v], i) => {
      const y = 540 + i * 110;
      g.strokeStyle = "#D3D9CF"; g.beginPath(); g.moveTo(80, y - 45); g.lineTo(1000, y - 45); g.stroke();
      g.fillStyle = "#8A968F"; g.font = "400 30px Inter, sans-serif"; g.fillText(k, 80, y);
      g.fillStyle = "#16232B"; g.font = "500 38px ui-monospace, monospace";
      g.fillText(v, 1000 - g.measureText(v).width, y);
    });
    if (revelacion) {
      g.fillStyle = "#F5F7F2"; g.fillRect(80, 1020, 920, 160);
      g.fillStyle = "#16232B"; g.fillRect(80, 1020, 4, 160);
      g.font = "400 28px Inter, sans-serif";
      g.fillText(`Mi sueldo subió ${fmt(revelacion.nominal, 0)}% desde ${revelacion.desde}.`, 120, 1080);
      g.fillStyle = revelacion.real >= 0 ? "#1E6B55" : "#8E2F3E";
      g.fillText(`En pesos de hoy, ${fmt(Math.abs(revelacion.real), 0)}% ${revelacion.real >= 0 ? "más" : "menos"}.`, 120, 1130);
    }
    g.fillStyle = "#8A968F"; g.font = "400 22px Inter, sans-serif";
    g.fillText("Inflación: IPC del INDEC · Dólar: DolarApi", 80, 1280);
    c.toBlob((b) => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `mi-plata-${ym}.png`; a.click(); });
    setAviso("Imagen descargada.");
  };

  const faltanFijos = d.fijos.length > 0 && d.ultimoMesFijos !== ym;
  const sinConexion = online === false;

  if (cargando) return <div className="app"><style>{CSS}</style><div className="cargando">Abriendo tus datos…</div></div>;
  if (!d.configurado) return <Onboarding guardar={guardar} base={d} />;

  const CTX = { d, add, del, guardar, conv, signo, lente, ym, mesVista, viendoPasado, setAviso };

  const mesesNav = (() => {
    // rango navegable: del primer dato hasta hoy
    const marcas = [...mesesConDato, ...mesesConSaldo, ...Object.keys(d.deudas), ...d.inversiones.map((l) => (l.fechaCompra || "").slice(0, 7))].filter(Boolean).sort();
    const desde = marcas[0] && marcas[0] < ym ? marcas[0] : sumaMeses(ym, -11);
    return rangoMeses(desde, ym);
  })();
  const idxMes = mesesNav.indexOf(mesVista);
  const irMes = (delta) => {
    const i = idxMes + delta;
    if (i >= 0 && i < mesesNav.length) setMesVista(mesesNav[i]);
  };

  return (
    <div className="app">
      <style>{CSS}</style>

      <header className="barra">
        <span className="logo">Mi plata <span className="sello-version">v8.2 · reparto</span></span>
        <div className="acciones">
          <span className={`estado ${sinConexion ? "off" : ""}`}>{sinConexion ? <WifiOff size={13} /> : <Wifi size={13} />}</span>
          <button className="btn-icono" onClick={exportarImagen} title="Guardar resumen como imagen"><ImageIcon size={15} /></button>
          <button className="btn-icono" onClick={() => buscarTodo(false)} title="Actualizar dólar e inflación"><RefreshCw size={15} /></button>
          <button className="btn-icono" onClick={exportarJSON} title="Descargar mis datos"><Download size={15} /></button>
        </div>
      </header>

      {aviso && <div className="aviso">{aviso}</div>}
      {sinConexion && !d.mercado.actualizado && (
        <div className="offline">
          Sin conexión. Uso el dólar y la inflación de {mesLargo(SEMILLA_FECHA.slice(0, 7))}, que vienen guardados.
          Podés corregirlos a mano en Ajustes.
        </div>
      )}

      <div className={`mes-nav ${viendoPasado ? "pasado" : ""}`}>
        <button className="mes-flecha" onClick={() => irMes(-1)} disabled={idxMes <= 0} aria-label="Mes anterior">‹</button>
        <div className="mes-centro">
          <select value={mesVista} onChange={(e) => setMesVista(e.target.value)}>
            {mesesNav.slice().reverse().map((k) => <option key={k} value={k}>{mesLargo(k)}{k === ym ? " · hoy" : ""}</option>)}
          </select>
          {viendoPasado && <button className="mes-hoy" onClick={() => setMesVista(ym)}>volver a hoy</button>}
        </div>
        <button className="mes-flecha" onClick={() => irMes(1)} disabled={idxMes >= mesesNav.length - 1} aria-label="Mes siguiente">›</button>
      </div>

      {viendoPasado && (
        <div className="offline pasado-aviso">
          Estás mirando <b>{mesLargo(mesVista)}</b>. Tus inversiones se muestran <b>a precio de costo</b> —lo que
          pusiste—, no a valor de mercado de entonces, que la app no tiene. El de hoy sí está a valor de mercado:
          son dos varas distintas.
        </div>
      )}

      <section className="hero">
        <span className="hero-label">{viendoPasado ? `Lo que tenías en ${nombreMes(mesVista)}, a costo` : "Lo que tenés, en limpio"}</span>
        <div className="hero-numero">{signo}{fmt(conv(enLimpioMes, viendoPasado ? mesVista : ym))}</div>
        <div className="pills">
          {Object.entries(LENTES).map(([k, v]) => (
            <button key={k} className={`pill ${lente === k ? "pill-on" : ""}`} onClick={() => setLente(k)}>{v}</button>
          ))}
        </div>
        <p className="hero-pista">
          {viendoPasado
            ? `Líquido declarado + inversiones a costo − deuda declarada, tal como estaban en ${nombreMes(mesVista)}.`
            : lente === "pesos" ? "Lo que tenés guardado e invertido, menos lo que debés."
            : lente === "reales" ? `Los montos viejos, traducidos a pesos de hoy. IPC del INDEC hasta ${ultimoOficial ? nombreMes(ultimoOficial) : "—"}${mesesEstimados > 0 ? `; los ${mesesEstimados === 1 ? "últimos" : `últimos ${mesesEstimados}`} meses son estimación` : ""}.`
            : `Al MEP, $${fmt(d.mercado.mep)}. Las cripto se valúan al dólar cripto, $${fmt(d.mercado.cripto)}.`}
        </p>

        {!viendoPasado && (revelacion ? (
          <div className="revelacion">
            Desde {revelacion.desde}, lo que entra por mes subió <b>{fmt(revelacion.nominal, 0)}%</b>.
            En pesos de hoy, eso es <b className={revelacion.real >= 0 ? "ok" : "mal"}>{pctS(revelacion.real)}</b>.
          </div>
        ) : (
          <div className="revelacion promesa">
            <b>{4 - conEntrada.length} {4 - conEntrada.length === 1 ? "mes" : "meses"} más</b> de anotar lo que entra y vas a poder
            ver cómo se movió tu sueldo de verdad, no solo en el papel.
            <span className="progreso">{[0, 1, 2, 3].map((i) => <span key={i} className={i < conEntrada.length ? "on" : ""} />)}</span>
          </div>
        ))}
      </section>

      {!viendoPasado && (
        <div className={`paso ${guia.completo ? "paso-completo" : ""}`}>
          <button className="paso-cabeza" onClick={() => setTab(guia.actual.ir)}>
            <span className="paso-eyebrow">{guia.completo ? "Vas al día" : `Tu próximo paso · ${guia.indice + 1} de ${guia.total}`}</span>
            <span className="paso-que">{guia.completo ? "Tenés todo encaminado" : guia.actual.que}</span>
            <span className="paso-por">{guia.completo ? "Cubriste los pasos base: registro, deudas, colchón y una meta. Seguí sumando a tu ritmo." : guia.actual.por}</span>
            <ArrowRight size={16} className="paso-flecha" />
          </button>
          <div className="paso-barra"><div style={{ width: `${(guia.hechos / guia.total) * 100}%` }} /></div>
          <div className="paso-lista">
            {guia.pasos.map((p, i) => (
              <button key={p.id} className={`paso-item ${p.hecho ? "hecho" : ""} ${i === guia.indice && !guia.completo ? "es-actual" : ""}`} onClick={() => setTab(p.ir)}>
                <span className="paso-check">
                  {p.hecho ? <Check size={12} strokeWidth={3} /> : i === guia.indice && !guia.completo ? <span className="punto-lleno" /> : <Circle size={12} strokeWidth={2} />}
                </span>
                <span className="paso-item-txt">{p.que}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!viendoPasado && proximos.length > 0 && (
        <div className="venc-tira">
          <CalendarClock size={14} />
          {proximos.slice(0, 3).map((v) => (
            <span key={v.id} className={v.dias <= 3 ? "urgente" : ""}>
              {v.nombre} {v.dias === 0 ? "vence hoy" : v.dias === 1 ? "vence mañana" : `en ${v.dias} días`}
            </span>
          ))}
        </div>
      )}

      {!viendoPasado && faltanFijos && (
        <button className="recordatorio" onClick={cargarFijos}>
          <Repeat size={14} /> Tenés {d.fijos.length} gastos fijos sin cargar en {mesLargo(ym)}. Cargalos de una.
        </button>
      )}

      <nav className="tabs" ref={navRef}>
        {[["hoy","Resumen",Home],["movimientos","Entra y sale",ArrowRight],["reparto","Reparto",PieIcon],["colchon","Colchón",ShieldCheck],
          ["inversiones","Inversiones",TrendingUp],["deudas","Deudas",AlertTriangle],["registro","Mes a mes",CalendarClock],
          ["metas","Metas",Flag],["vencimientos","Vencimientos",CalendarClock],["ajustes","Ajustes",Settings]].map(([k, l, I]) => (
          <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}><I size={15} /> <span className="tab-label">{l}</span></button>
        ))}
      </nav>

      <main>
        {tab === "hoy" && <Resumen {...CTX} porMesReal={porMesReal} gasto={gasto} ingreso={ingreso}
          totalLiquido={liquidoMes} totalInvertido={viendoPasado ? invertidoMes : totalInvertido} irA={setTab} />}
        {tab === "movimientos" && <Movimientos {...CTX} />}
        {tab === "colchon" && <Colchon liquido={totalLiquido} valorBase={valorBase} base={baseColchon} meses={mesesCubiertos}
          objetivo={d.colchonMeses} setObjetivo={(n) => guardar({ ...d, colchonMeses: n })}
          setBase={(b) => guardar({ ...d, colchonBase: b })} elegido={d.colchonBase}
          ahorro={ahorro} listo={colchonListo} estimado={baseColchon === "gasto" ? gasto.estimado : ingreso.estimado} />}
        {tab === "inversiones" && <Inversiones {...CTX} posiciones={posiciones} posicionesMes={posicionesMes} setPrecio={setPrecio} porPlataforma={porPlataforma}
          total={totalInvertido} invertidoMes={invertidoMes} realizadoTotal={realizadoTotal} concentracion={concentracion} dolarDe={dolarDe} sinPrecio={sinPrecio} preciosViejos={preciosViejos} />}
        {tab === "deudas" && <Deudas {...CTX} addDeuda={addDeuda} delDeuda={delDeuda} copiarDeudas={copiarDeudas}
          deudaMes={deudaMes} deudaRefMes={deudaRefMes} inflacionMensual={inflacionMensual} />}
        {tab === "registro" && <Registro {...CTX} registro={registro} valorSaldo={valorSaldo}
          totalLiquido={totalLiquido} ultimoMesSaldo={ultimoMesSaldo} irMesVista={setMesVista} />}
        {tab === "reparto" && <Reparto {...CTX} ingreso={ingreso} repartoReal={repartoReal} repartoSugerido={repartoSugerido} irA={setTab} />}
        {tab === "metas" && <Metas {...CTX} ahorroUSD={ahorro.valor / d.mercado.mep} colchonListo={colchonListo} />}
        {tab === "vencimientos" && <Vencimientos {...CTX} proximos={proximos} />}
        {tab === "ajustes" && <Ajustes {...CTX} online={online} ultimoOficial={ultimoOficial} mesesEstimados={mesesEstimados} exportarImagen={exportarImagen} />}
      </main>
    </div>
  );
}

/* ══════════════ onboarding ══════════════ */

function Onboarding({ guardar, base }) {
  const [paso, setPaso] = useState(0);
  const [v, setV] = useState(["", "", ""]);
  const set = (i, x) => setV((p) => p.map((y, k) => (k === i ? x : y)));

  const terminar = () => {
    const [e, s, t] = v.map((x) => Math.max(0, +x || 0));
    guardar({
      ...base, configurado: true, estimacion: { entra: e, sale: s },
      saldos: t ? { [hoyYM()]: { pesos: t, plazo: 0, dolares: 0 } } : {},
    });
  };

  const pasos = [
    { pre: "Empecemos por lo simple.", q: "¿Cuánta plata te entra por mes?", h: "Sueldo, changas, todo junto. Un número aproximado alcanza: no lo voy a tomar como si ya hubiera pasado." },
    { pre: "Bien.", q: "¿Y cuánto se te va, más o menos?", h: "Alquiler, comida, transporte, todo. Si no sabés, tirá un número. Cuando anotes un mes entero, lo reemplazo por el de verdad." },
    { pre: "Última.", q: "¿Cuánto tenés guardado hoy?", h: "En la cuenta, abajo del colchón, donde sea. Solo pesos por ahora. Los dólares y las inversiones los sumás después." },
  ];
  const p = pasos[paso];

  return (
    <div className="app"><style>{CSS}</style>
      <div className="onb">
        <div className="onb-progreso">{pasos.map((_, i) => <span key={i} className={i <= paso ? "on" : ""} />)}</div>
        <span className="onb-pre">{p.pre}</span>
        <h1>{p.q}</h1>
        <p className="onb-hint">{p.h}</p>
        <div className="onb-input">
          <span>$</span>
          <input type="number" min="0" autoFocus value={v[paso]} placeholder="0" onChange={(e) => set(paso, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") paso < 2 ? setPaso(paso + 1) : terminar(); }} />
        </div>
        <div className="onb-botones">
          {paso > 0 && <button className="btn-fantasma" onClick={() => setPaso(paso - 1)}>Atrás</button>}
          <button className="btn-primario" onClick={() => (paso < 2 ? setPaso(paso + 1) : terminar())}>
            {paso < 2 ? "Seguir" : "Ver mi situación"} <ArrowRight size={15} />
          </button>
        </div>
        <p className="onb-pie">Tus datos quedan en este dispositivo. No los ve nadie, ni nosotros.</p>
      </div>
    </div>
  );
}

/* ══════════════ torta reusable ══════════════ */

function Torta({ datos, paleta, signo, vacio }) {
  if (!datos.length) return <p className="chico">{vacio}</p>;
  return (
    <div className="torta">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie data={datos} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={2} stroke="none">
            {datos.map((_, i) => <Cell key={i} fill={paleta[i % paleta.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `${signo}${fmt(v)}`} contentStyle={TIP} itemStyle={TIP_ITEM} labelStyle={TIP_LABEL} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="leyenda">
        {datos.slice(0, 6).map((c, i) => (
          <li key={c.name}><span className="punto" style={{ background: paleta[i % paleta.length] }} />{c.name}<b>{signo}{corto(c.value)}</b></li>
        ))}
      </ul>
    </div>
  );
}

const agrupar = (arr, campo, fn) => {
  const m = {};
  arr.forEach((x) => { m[x[campo]] = (m[x[campo]] || 0) + fn(x); });
  return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

/* ══════════════ resumen ══════════════ */

function Resumen({ d, porMesReal, gasto, ingreso, totalLiquido, totalInvertido, conv, signo, irA, mesVista, viendoPasado, ym }) {
  const datos = porMesReal.map((m) => ({ ...m, entra: conv(m.entra, m.ym), sale: conv(m.sale, m.ym), foco: m.ym === mesVista }));
  const gastosVista = viendoPasado ? d.gastos.filter((g) => g.fecha.startsWith(mesVista)) : d.gastos;
  const entradasVista = viendoPasado ? d.entradas.filter((g) => g.fecha.startsWith(mesVista)) : d.entradas;
  const tortaGastos = useMemo(() => agrupar(gastosVista, "categoria", (g) => conv(g.monto, g.fecha.slice(0, 7))), [gastosVista, conv]);
  const tortaEntradas = useMemo(() => agrupar(entradasVista, "categoria", (g) => conv(g.monto, g.fecha.slice(0, 7))), [entradasVista, conv]);

  /* stats: en el pasado, muestro lo que pasó ese mes; en el presente, el promedio */
  const filaMes = porMesReal.find((m) => m.ym === mesVista);
  const entraMostrar = viendoPasado ? { valor: filaMes?.entra || 0, estimado: false } : ingreso;
  const saleMostrar = viendoPasado ? { valor: filaMes?.sale || 0, estimado: false } : gasto;
  const de100 = entraMostrar.valor > 0 ? Math.round(((entraMostrar.valor - saleMostrar.valor) / entraMostrar.valor) * 100) : null;
  const Marca = ({ e }) => e ? <span className="marca-est">≈ estimado</span> : null;

  return (
    <div className="grid">
      <div className="tarjeta trio">
        <div className="stat"><span className="stat-l">{viendoPasado ? `Entró en ${nombreMes(mesVista)}` : <>Entra por mes <Marca e={ingreso.estimado} /></>}</span>
          <span className="stat-v ok">{signo}{corto(conv(entraMostrar.valor, viendoPasado ? mesVista : ym))}</span></div>
        <div className="stat"><span className="stat-l">{viendoPasado ? `Salió en ${nombreMes(mesVista)}` : <>Sale por mes <Marca e={gasto.estimado} /></>}</span>
          <span className="stat-v mal">{signo}{corto(conv(saleMostrar.valor, viendoPasado ? mesVista : ym))}</span></div>
        <div className="stat"><span className="stat-l">De cada $100 que entran</span>
          <span className={`stat-v ${de100 === null ? "" : de100 > 0 ? "ok" : "mal"}`}>
            {de100 === null ? "—" : de100 > 0 ? `guardás $${de100}` : `te faltan $${Math.abs(de100)}`}</span></div>
      </div>

      <div className="tarjeta trio">
        <div className="stat"><span className="stat-l">{viendoPasado ? "Tenías disponible" : "Disponible ya"}</span><span className="stat-v">{signo}{corto(conv(totalLiquido, viendoPasado ? mesVista : ym))}</span></div>
        <div className="stat"><span className="stat-l">{viendoPasado ? "Invertido (a costo)" : "Invertido"}</span><span className="stat-v">{signo}{corto(conv(totalInvertido, viendoPasado ? mesVista : ym))}</span></div>
        <div className="stat"><span className="stat-l">Proporción invertida</span>
          <span className="stat-v">{totalLiquido + totalInvertido > 0 ? `${fmt((totalInvertido / (totalLiquido + totalInvertido)) * 100, 0)}%` : "—"}</span></div>
      </div>

      <div className="tarjeta ancho">
        <h3>Lo que entró y lo que salió</h3>
        {porMesReal.length < 2 ? (
          <div className="futuro">
            <div className="futuro-barras">{[...Array(6)].map((_, i) => <span key={i} style={{ height: `${18 + i * 11}%` }} />)}</div>
            <div>
              <p className="chico"><b>Acá va a aparecer tu historia.</b> Un mes, una barra. No dibujo meses que no viviste.</p>
              <button className="btn-secundario" style={{ marginTop: 12 }} onClick={() => irA("movimientos")}>Anotar mi primer gasto</button>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datos} margin={{ top: 6, right: 4, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#D3D9CF" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="#8A968F" />
              <YAxis tickFormatter={corto} tick={{ fontSize: 10 }} stroke="#8A968F" />
              <Tooltip formatter={(v) => `${signo}${fmt(v)}`} contentStyle={TIP} itemStyle={TIP_ITEM} labelStyle={TIP_LABEL} />
              <Bar dataKey="entra" name="Entró" fill="#1E6B55" radius={[2, 2, 0, 0]}>
                {datos.map((e, i) => <Cell key={i} fillOpacity={viendoPasado && !e.foco ? 0.35 : 1} />)}
              </Bar>
              <Bar dataKey="sale" name="Salió" fill="#8E2F3E" radius={[2, 2, 0, 0]}>
                {datos.map((e, i) => <Cell key={i} fillOpacity={viendoPasado && !e.foco ? 0.35 : 1} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="tarjeta">
        <h3>{viendoPasado ? `A dónde se fue en ${nombreMes(mesVista)}` : "A dónde se va tu plata"}</h3>
        <Torta datos={tortaGastos} paleta={ROJOS} signo={signo} vacio={`Sin gastos anotados ${viendoPasado ? `en ${nombreMes(mesVista)}` : "todavía"}.`} />
      </div>

      <div className="tarjeta">
        <h3>{viendoPasado ? `De dónde vino en ${nombreMes(mesVista)}` : "De dónde viene tu plata"}</h3>
        <Torta datos={tortaEntradas} paleta={VERDES} signo={signo} vacio={`Sin ingresos anotados ${viendoPasado ? `en ${nombreMes(mesVista)}` : "todavía"}.`} />
      </div>
    </div>
  );
}

/* ══════════════ colchón ══════════════ */

function Colchon({ liquido, valorBase, base, meses, objetivo, setObjetivo, setBase, elegido, ahorro, listo, estimado }) {
  const obj = objetivo * valorBase;
  const falta = Math.max(0, obj - liquido);
  const p = obj > 0 ? Math.min(100, (liquido / obj) * 100) : 0;
  const cuando = falta > 0 && ahorro.valor > 0 ? Math.ceil(falta / ahorro.valor) : null;

  return (
    <div className="grid">
      <div className="tarjeta ancho">
        <span className="stat-l">Si mañana dejás de cobrar, aguantás</span>
        <div className="colchon-num">{valorBase > 0 ? (meses > 99 ? "99+" : fmt(meses, 1)) : "—"}<span> meses</span></div>
        <div className="barra"><div style={{ width: `${p}%`, background: listo ? "#1E6B55" : "#8E2F3E" }} /></div>
        <p className="colchon-texto">
          {valorBase === 0 ? "Contame cuánto gastás o cuánto cobrás y te digo cuánto aguantás."
            : listo ? "Tenés el colchón hecho. Todo lo que ahorres de acá en adelante puede ir a crecer, no a protegerte."
            : <>Te faltan <b>${corto(falta)}</b> para llegar a {objetivo} meses.{cuando ? ` A tu ritmo, los juntás en ${cuando} ${cuando === 1 ? "mes" : "meses"}.` : " Hoy no estás ahorrando, así que no hay fecha."}</>}
        </p>
        {estimado && valorBase > 0 && (
          <p className="pie">Esto sale de lo que <b>declaraste</b>, no de lo que anotaste. Cuando cierres un mes completo, el número se vuelve tuyo.</p>
        )}
      </div>

      <div className="tarjeta">
        <h3>Contra qué se mide</h3>
        <div className="seg">
          {[["auto", "Automático"], ["gasto", "Mi gasto"], ["sueldo", "Mi sueldo"]].map(([k, l]) => (
            <button key={k} className={elegido === k ? "on" : ""} onClick={() => setBase(k)}>{l}</button>
          ))}
        </div>
        <p className="chico">Ahora mide contra tu <b>{base === "sueldo" ? "sueldo" : "gasto"}</b>: ${corto(valorBase)} por mes.</p>
        <p className="pie">
          Medir contra el gasto es más exacto: sin trabajo no necesitás reponer lo que ahorrabas, solo lo que gastás.
          Contra el sueldo pide más y es más conservador. En automático uso el gasto apenas tengas un mes completo
          anotado; hasta entonces, el sueldo.
        </p>
      </div>

      <div className="tarjeta">
        <h3>Qué tan grande</h3>
        <div className="seg">{[3, 6, 12].map((n) => <button key={n} className={objetivo === n ? "on" : ""} onClick={() => setObjetivo(n)}>{n} meses</button>)}</div>
        <p className="pie">Tres si tenés sueldo fijo. Seis si trabajás por tu cuenta. Doce si mantenés a alguien o tu rubro es volátil.</p>
        <p className="chico" style={{ marginTop: 14 }}>
          <b>No cuentan tus inversiones.</b> Las emergencias no eligen el día. Si tenés que vender en una mala semana,
          el colchón no te protegió: te cobró.
        </p>
      </div>
    </div>
  );
}

/* ══════════════ inversiones ══════════════ */

function Inversiones({ d, add, del, conv, signo, posiciones, posicionesMes, setPrecio, porPlataforma, total, invertidoMes, realizadoTotal, concentracion, dolarDe, sinPrecio, preciosViejos, mesVista, viendoPasado, ym, setAviso }) {
  const [tipo, setTipo] = useState("cripto"), [ticker, setTicker] = useState(""), [plataforma, setPlataforma] = useState("Binance");
  const [cantidad, setCantidad] = useState(""), [precioCompra, setPC] = useState(""), [fechaCompra, setFC] = useState(hoyISO());
  const [abierta, setAbierta] = useState(null);
  const [vendiendo, setVendiendo] = useState(null);          // posición que se está vendiendo
  const [vCant, setVCant] = useState(""), [vPrecio, setVPrecio] = useState(""), [vFecha, setVFecha] = useState(hoyISO());

  const inst = INSTRUMENTOS[tipo];
  const lista = viendoPasado ? posicionesMes : posiciones;

  const agregar = async () => {
    const c = +cantidad, pc = inst.fijo || +precioCompra;
    if (!c || !ticker || !pc) return;
    let dolarCompra = dolarDe(tipo);
    if (inst.moneda === "USD") {
      try {
        const casa = inst.dolar === "cripto" ? "cripto" : "bolsa";
        const [a, m, dd] = fechaCompra.split("-");
        const j = await (await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}/${a}/${m}/${dd}`)).json();
        if (j?.venta) dolarCompra = j.venta;
      } catch { /* usamos el de hoy */ }
    }
    add("inversiones", { tipo, ticker: ticker.toUpperCase(), plataforma, cantidad: c, precioCompra: pc, fechaCompra, dolarCompra });
    setTicker(""); setCantidad(""); setPC("");
  };

  const vender = async (p) => {
    const c = +vCant, pv = p.inst.fijo || +vPrecio;
    if (!c || !pv) { setAviso && setAviso("Poné cuántas unidades vendés y a qué precio."); return; }
    if (c > p.cantidad + 1e-9) { setAviso && setAviso(`No podés vender ${fmtUni(c)}: solo tenés ${fmtUni(p.cantidad)}.`); return; }
    let dolarVenta = dolarDe(p.tipo);
    if (p.enUSD) {
      try {
        const casa = p.inst.dolar === "cripto" ? "cripto" : "bolsa";
        const [a, m, dd] = vFecha.split("-");
        const j = await (await fetch(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}/${a}/${m}/${dd}`)).json();
        if (j?.venta) dolarVenta = j.venta;
      } catch { /* usamos el de hoy */ }
    }
    add("inversiones", { venta: true, tipo: p.tipo, ticker: p.ticker, plataforma: p.plataformas[0] || "Otra", cantidad: c, precioVenta: pv, fechaVenta: vFecha, dolarVenta });
    setVendiendo(null); setVCant(""); setVPrecio("");
    setAviso && setAviso(`Venta anotada: ${fmtUni(c)} ${p.ticker} a ${p.enUSD ? "US$" : "$"}${fmtPre(pv)}.`);
  };

  const tortaTipos = useMemo(() => {
    const m = {};
    lista.forEach((p) => { const val = viendoPasado ? p.valorMes : p.valor; if (val) m[p.inst.label] = (m[p.inst.label] || 0) + val; });
    return Object.entries(m).map(([name, value]) => ({ name, value: conv(value, viendoPasado ? mesVista : ym) })).sort((a, b) => b.value - a.value);
  }, [lista, conv, viendoPasado, mesVista, ym]);

  return (
    <div className="grid">
      {viendoPasado ? (
        <div className="tarjeta ancho nota-suave">
          Estás mirando <b>{nombreMes(mesVista)}</b>. Muestro solo lo que ya habías comprado para entonces, valuado
          <b> a precio de costo</b> —lo que le pusiste—. El valor de mercado y el rendimiento se ven en el mes actual.
        </div>
      ) : (
        <div className="tarjeta ancho nota-suave">
          <b>Ninguna plataforma está conectada y ningún precio se busca solo.</b> Elegir "Binance" o "IOL" solo anota
          dónde tenés cada cosa. El precio de hoy lo ponés vos, y te aviso cuando quede viejo. Nunca pongas la clave
          de tu broker en una app.
        </div>
      )}

      {!viendoPasado && sinPrecio.length > 0 && (
        <div className="tarjeta ancho alerta-suave">
          <AlertTriangle size={15} />
          <span>Falta el precio de hoy de {sinPrecio.map((p) => p.ticker).join(", ")}. Hasta que lo cargues, no cuentan en tu patrimonio.</span>
        </div>
      )}
      {!viendoPasado && preciosViejos.length > 0 && (
        <div className="tarjeta ancho alerta-suave">
          <AlertTriangle size={15} />
          <span>{preciosViejos.length === 1 ? "Un precio tiene" : `${preciosViejos.length} precios tienen`} más de {VIEJO_DIAS} días. Actualizalos abajo.</span>
        </div>
      )}

      {!viendoPasado && (
      <div className="tarjeta">
        <h3>Anotar una compra</h3>
        <div className="campos">
          <label>Qué compraste<select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(INSTRUMENTOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          <label>Símbolo<input value={ticker} onChange={(e) => setTicker(e.target.value)}
            placeholder={tipo === "cripto" ? "BTC, ETH, SOL…" : tipo === "cedear" ? "AAPL, KO, MELI…" : "AL30, YPFD…"} /></label>
          <label>Dónde lo tenés<select value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
            {Object.keys(PLATAFORMAS).map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>Cuántas unidades<input type="number" min="0" step="any" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="0" /></label>
          {!inst.fijo && <label>Precio al que compraste ({inst.moneda === "USD" ? "en dólares" : "en pesos"})
            <input type="number" min="0" step="any" value={precioCompra} onChange={(e) => setPC(e.target.value)} placeholder="0" /></label>}
          <label>Cuándo compraste<input type="date" max={hoyISO()} value={fechaCompra} onChange={(e) => setFC(e.target.value)} /></label>
        </div>
        <button className="btn-primario ancho-btn" onClick={agregar}><Plus size={15} /> Anotar compra</button>
        <p className="pie">
          Cada compra se guarda por separado. Si comprás BTC tres veces, se agrupan en una sola posición con
          <b> precio promedio</b>, y el rendimiento se calcula compra por compra, ajustando cada una por la inflación
          desde su propia fecha.
        </p>
      </div>
      )}

      <div className="tarjeta">
        <h3>Composición {viendoPasado ? `en ${nombreMes(mesVista)}` : "de tu cartera"}</h3>
        <Torta datos={tortaTipos} paleta={AZULES} signo={signo} vacio={viendoPasado ? `No tenías inversiones en ${nombreMes(mesVista)}.` : "Cargá una compra y su precio de hoy."} />
      </div>

      {!viendoPasado && porPlataforma.length > 1 && (
        <div className="tarjeta ancho">
          <h3>Dónde está tu plata invertida</h3>
          <ul className="barras">
            {porPlataforma.map((p) => (
              <li key={p.name}>
                <div className="barra-fila"><span>{p.name}{p.tipo === "exterior" && <em> · exterior</em>}</span><b>{fmt((p.value / total) * 100, 0)}%</b></div>
                <div className="barra"><div style={{ width: `${(p.value / total) * 100}%`, background: p.tipo === "exterior" ? "#8E2F3E" : "#1E6B55" }} /></div>
              </li>
            ))}
          </ul>
          {concentracion && concentracion.p > 40 && (
            <p className="pie">El {fmt(concentracion.p, 0)}% está en {concentracion.name}.
              {concentracion.tipo === "exterior" && " Es del exterior: si algo sale mal, ningún organismo argentino te ampara."}</p>
          )}
        </div>
      )}

      {!viendoPasado && Math.abs(realizadoTotal) > 0.5 && (
        <div className="tarjeta ancho" style={{ borderColor: realizadoTotal >= 0 ? "#BcccC4" : "#D8C4CC" }}>
          <span className="stat-l">Ganancia ya realizada (lo que vendiste)</span>
          <div className="alerta-num" style={{ color: realizadoTotal >= 0 ? "var(--verde)" : "var(--rojo)" }}>
            {realizadoTotal >= 0 ? "+" : "−"}${fmt(Math.abs(realizadoTotal))}
          </div>
          <p className="colchon-texto">
            Es la diferencia entre lo que cobraste al vender y lo que te habían costado esas unidades, a precio
            promedio. Ganancia cerrada: ya no depende del mercado.
          </p>
        </div>
      )}

      <div className="tarjeta ancho">
        <h3>{viendoPasado ? `Lo que tenías en ${nombreMes(mesVista)}` : "Tus posiciones"} <span className="conteo">{lista.length}</span></h3>
        {!lista.length ? <p className="chico">{viendoPasado ? `No habías comprado nada hasta ${nombreMes(mesVista)}.` : "Todavía no anotaste ninguna compra."}</p> : (
          <ul className="lista">
            {lista.map((p) => {
              const mon = p.enUSD ? "US$" : "$";
              const dias = p.precio && !p.inst.fijo ? diasDesde(p.precio.fecha) : 0;
              const valorCelda = viendoPasado ? p.valorMes : p.valor;
              return (
                <li key={p.k} className="pos">
                  <div className="pos-fila">
                    <div className="inv-izq">
                      <div className="inv-top">
                        <span className="ticker">{p.ticker}</span>
                        <span className="chip chip-neutro">{p.inst.label}</span>
                        {p.plataformas.map((pl) => (
                          <span key={pl} className={`chip ${PLATAFORMAS[pl] === "exterior" ? "chip-mal" : "chip-ok"}`}>{pl}</span>
                        ))}
                      </div>
                      <span className="li-fecha">
                        {fmtUni(p.cantidad)} unidades · promedio de compra {mon}{fmtPre(p.promedio)}
                        {p.lotes.length > 1 && ` · ${p.lotes.length} compras`}
                        {!viendoPasado && p.vendidas > 0 && ` · vendiste ${fmtUni(p.vendidas)}`}
                      </span>
                      {!viendoPasado && p.rend && p.cantidad > 0 && (
                        <div className="rend izq">
                          <span>{pctS(p.rend.nominal)} nominal</span>
                          {p.rend.real != null && <span className={p.rend.real >= 0 ? "ok" : "mal"}>{pctS(p.rend.real)} real</span>}
                          {p.rend.usd != null && <span className={p.rend.usd >= 0 ? "ok" : "mal"}>{pctS(p.rend.usd)} en USD</span>}
                        </div>
                      )}
                      {!viendoPasado && p.realizado != null && Math.abs(p.realizado) > 0.5 && (
                        <span className="li-fecha" style={{ color: p.realizado >= 0 ? "var(--verde)" : "var(--rojo)" }}>
                          realizado {p.realizado >= 0 ? "+" : "−"}${corto(Math.abs(p.realizado))}
                        </span>
                      )}
                      {viendoPasado && <span className="li-fecha">valuado a costo</span>}
                    </div>

                    <div className="pos-der">
                      <span className="monto">{p.cantidad <= 0 ? "vendida" : valorCelda ? `${signo}${fmt(conv(valorCelda, viendoPasado ? mesVista : ym))}` : "sin precio"}</span>
                      {!viendoPasado && !p.inst.fijo && p.cantidad > 0 && (
                        <div className="precio-hoy">
                          <label>Precio de hoy ({mon})</label>
                          <input type="number" min="0" step="any" key={`${p.k}-${p.precio?.valor}`}
                            defaultValue={p.precio?.valor ?? ""} placeholder="cargalo"
                            onBlur={(e) => { const v = +e.target.value; if (v > 0 && v !== p.precio?.valor) setPrecio(p.tipo, p.ticker, v); }} />
                          {p.precio && <span className={dias > VIEJO_DIAS ? "viejo" : "li-viejo"}>
                            {dias === 0 ? "actualizado hoy" : `hace ${dias} ${dias === 1 ? "día" : "días"}`}
                          </span>}
                        </div>
                      )}
                      <div className="pos-acciones">
                        {!viendoPasado && p.cantidad > 0 && (
                          <button className="btn-fantasma" onClick={() => { setVendiendo(vendiendo === p.k ? null : p.k); setVCant(""); setVPrecio(""); setVFecha(hoyISO()); }}>
                            {vendiendo === p.k ? "cancelar" : "vender"}
                          </button>
                        )}
                        <button className="btn-fantasma" onClick={() => setAbierta(abierta === p.k ? null : p.k)}>
                          {abierta === p.k ? "ocultar" : "movimientos"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!viendoPasado && vendiendo === p.k && (() => {
                    /* vista previa: qué pasa exactamente si confirmás esta venta */
                    const cV = +vCant || 0;
                    const pV = p.inst.fijo || +vPrecio || 0;
                    const costoUnit = p.cantidad > 0 ? p.costoRestante / p.cantidad : 0;
                    const dV = dolarDe(p.tipo);
                    const ingreso = cV * pV * (p.enUSD ? dV : 1);
                    const costoParte = cV * costoUnit;
                    const resultado = ingreso - costoParte;
                    const valido = cV > 0 && pV > 0 && cV <= p.cantidad + 1e-9;
                    const pctSel = p.cantidad > 0 ? (cV / p.cantidad) * 100 : 0;
                    return (
                      <div className="venta-form">
                        <div className="venta-cabeza">
                          <span className="venta-titulo">Vender {p.ticker}</span>
                          <span className="venta-tenencia">tenés {fmtUni(p.cantidad)}</span>
                        </div>

                        <span className="venta-lbl">Cuánto vendés</span>
                        <div className="pct-botones">
                          {[25, 50, 75, 100].map((q) => (
                            <button key={q} className={`pct-btn ${cV > 0 && Math.abs(pctSel - q) < 0.5 ? "on" : ""}`}
                              onClick={() => setVCant(String(+(p.cantidad * (q / 100)).toFixed(10)))}>
                              {q === 100 ? "Todo" : `${q}%`}
                            </button>
                          ))}
                        </div>

                        <div className="campos-fila">
                          <label>Unidades<input type="number" min="0" step="any" value={vCant}
                            onChange={(e) => setVCant(e.target.value)} placeholder={`hasta ${fmtUni(p.cantidad)}`} /></label>
                          {!p.inst.fijo && <label>Precio de venta ({mon})<input type="number" min="0" step="any" value={vPrecio}
                            onChange={(e) => setVPrecio(e.target.value)} placeholder={p.precio ? fmtPre(p.precio.valor) : "0"} /></label>}
                          <label>Cuándo<input type="date" max={hoyISO()} value={vFecha} onChange={(e) => setVFecha(e.target.value)} /></label>
                        </div>
                        {!p.inst.fijo && p.precio && !vPrecio && (
                          <button className="btn-fantasma" onClick={() => setVPrecio(String(p.precio.valor))}>
                            usar el precio de hoy ({mon}{fmtPre(p.precio.valor)})
                          </button>
                        )}

                        {valido && (
                          <div className="venta-preview">
                            <div className="pv-fila"><span>Cobrás</span><b>${fmt(ingreso)}</b></div>
                            <div className="pv-fila"><span>Te había costado</span><b>${fmt(costoParte)}</b></div>
                            <div className="pv-fila pv-total">
                              <span>{resultado >= 0 ? "Ganancia" : "Pérdida"}</span>
                              <b className={resultado >= 0 ? "ok" : "mal"}>{resultado >= 0 ? "+" : "−"}${fmt(Math.abs(resultado))}</b>
                            </div>
                            <div className="pv-fila pv-resto"><span>Te quedan</span><b>{fmtUni(p.cantidad - cV)} {p.ticker}</b></div>
                          </div>
                        )}

                        <button className="btn-primario ancho-btn" onClick={() => vender(p)}>
                          <Plus size={15} /> {pctSel >= 99.5 ? `Vender todo mi ${p.ticker}` : "Anotar la venta"}
                        </button>
                        <p className="pie">La ganancia se calcula contra tu costo promedio. Podés vender por partes: lo que no vendas sigue en tu cartera.</p>
                      </div>
                    );
                  })()}

                  {abierta === p.k && (() => {
                    /* registro de operaciones: compras y ventas en una sola línea de tiempo */
                    const ops = [
                      ...p.lotes.map((l) => ({ ...l, k: "compra", fecha: l.fechaCompra, precio: l.precioCompra })),
                      ...p.ventas.map((l) => ({ ...l, k: "venta", fecha: l.fechaVenta, precio: l.precioVenta })),
                    ].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
                    const costoUnit = p.cantidad > 0 ? p.costoRestante / p.cantidad : 0;
                    return (
                      <div className="ops">
                        <div className="ops-titulo">Registro de operaciones <span className="conteo">{ops.length}</span></div>
                        <ul className="ops-lista">
                          {ops.map((l) => {
                            const total = l.cantidad * l.precio;
                            const res = l.k === "venta" ? total * (p.enUSD ? (l.dolarVenta || 1) : 1) - l.cantidad * costoUnit : null;
                            return (
                              <li key={l.id} className={`op op-${l.k}`}>
                                <span className={`op-tipo ${l.k}`}>{l.k}</span>
                                <div className="op-datos">
                                  <span className="op-linea1">
                                    <b>{fmtUni(l.cantidad)}</b> {p.ticker} × {mon}{fmtPre(l.precio)}
                                  </span>
                                  <span className="op-linea2">
                                    {l.fecha}{l.plataforma ? ` · ${l.plataforma}` : ""}
                                  </span>
                                </div>
                                <div className="op-der">
                                  <span className="op-total">{mon}{fmtPre(total)}</span>
                                  {res !== null && Math.abs(res) > 0.5 && (
                                    <span className={`op-res ${res >= 0 ? "ok" : "mal"}`}>{res >= 0 ? "+" : "−"}${corto(Math.abs(res))}</span>
                                  )}
                                </div>
                                <button className="btn-x" onClick={() => del("inversiones", l.id)} title="Borrar esta operación"><Trash2 size={13} /></button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })()}
                </li>
              );
            })}
          </ul>
        )}
        {lista.length > 0 && (
          <p className="pie">
            {viendoPasado
              ? <>Cada posición se muestra <b>a costo</b>: la plata que le destinaste hasta {nombreMes(mesVista)}. Para ver cuánto rindió, volvé a hoy.</>
              : <>El rendimiento <b>real</b> descuenta la inflación desde la compra. El de <b>USD</b> usa el dólar del día. Cuando vendés, la ganancia pasa a ser <b>realizada</b> y se calcula contra tu costo promedio.</>}
          </p>
        )}
      </div>
    </div>
  );
}

/* ══════════════ deudas ══════════════ */

function Deudas({ d, addDeuda, delDeuda, copiarDeudas, deudaMes, deudaRefMes, inflacionMensual, mesVista, viendoPasado, ym }) {
  const [nombre, setNombre] = useState(""), [monto, setMonto] = useState("");
  const [cuota, setCuota] = useState(""), [intereses, setInt] = useState("");

  const mesEdit = mesVista; // se edita el mes que se está mirando
  const declaradoEste = d.deudas[mesEdit] || null;
  const lista = declaradoEste || [];
  const arrastradaDe = deudaRefMes && deudaRefMes.ym !== mesEdit ? deudaRefMes.ym : null;
  const totalMes = lista.reduce((s, x) => s + x.monto, 0);
  const interesesMes = lista.reduce((s, x) => s + (x.intereses || 0), 0);

  const calc = (x) => {
    const r = x.intereses > 0 && x.monto > 0 ? x.intereses / x.monto : 0;
    return {
      r, anual: r > 0 ? (Math.pow(1 + r, 12) - 1) * 100 : null,
      meses: mesesParaCancelar(x.monto, x.cuota, r),
      creciendo: x.intereses > 0 && x.cuota > 0 && x.cuota <= x.intereses,
    };
  };

  const ordenadas = [...lista].sort((a, b) => (b.intereses || 0) - (a.intereses || 0) || b.monto - a.monto);
  const grafico = ordenadas.map((x) => ({ name: x.nombre.slice(0, 14), Saldo: x.monto, Intereses: x.intereses || 0 }));

  return (
    <div className="grid">
      <div className="tarjeta ancho nota-suave">
        Las deudas se declaran <b>mes a mes</b>. Estás editando las de <b>{mesLargo(mesEdit)}</b>.
        {" "}Como una deuda puede pagarse toda de una, arrastrarse o atrasarse, no la adivino: cada mes ponés
        el saldo que tenías. Si no tocás un mes, la app arrastra el último que cargaste.
      </div>

      {!declaradoEste && arrastradaDe && (
        <div className="tarjeta ancho alerta-suave" style={{ color: "var(--tinta)", borderColor: "var(--linea)" }}>
          <span>En {nombreMes(mesEdit)} todavía no cargaste deudas. Vengo arrastrando las de {mesLargo(arrastradaDe)} (${corto(deudaRefMes.valor)}).</span>
          <button className="btn-secundario" onClick={() => copiarDeudas(mesEdit)}>Copiarlas acá para editar</button>
        </div>
      )}

      {totalMes > 0 && (
        <div className="tarjeta ancho alerta">
          <span className="stat-l">Debías{viendoPasado ? ` en ${nombreMes(mesEdit)}` : ""}</span>
          <div className="alerta-num">${fmt(totalMes)}</div>
          {interesesMes > 0
            ? <p className="colchon-texto">Solo por tenerla, te cobran <b>${fmt(interesesMes)} por mes</b>. Es plata que se va sin que compres nada.</p>
            : <p className="colchon-texto">Si sabés cuánto te cobraron de intereses, cargalo y te digo exactamente cuánto te está costando.</p>}
        </div>
      )}

      <div className="tarjeta">
        <h3>Anotar una deuda en {nombreMes(mesEdit)}</h3>
        <div className="campos">
          <label>Qué es<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tarjeta Visa, préstamo, un amigo…" /></label>
          <label>Cuánto debés en total<input type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" /></label>
          <label>Cuánto pagás por mes<input type="number" min="0" value={cuota} onChange={(e) => setCuota(e.target.value)} placeholder="0" /></label>
          <label>Intereses del mes (opcional)<input type="number" min="0" value={intereses} onChange={(e) => setInt(e.target.value)} placeholder="0" /></label>
        </div>
        <p className="pie">
          Los tres números están en tu resumen de tarjeta. El saldo dice <b>total a pagar</b>, y los intereses
          aparecen como una línea aparte. Si no lo encontrás, dejalo vacío: prefiero no inventarte una tasa.
        </p>
        <button className="btn-primario ancho-btn" onClick={() => {
          const m = +monto; if (!nombre || !m) return;
          addDeuda(mesEdit, { nombre, monto: m, cuota: Math.max(0, +cuota || 0), intereses: Math.max(0, +intereses || 0) });
          setNombre(""); setMonto(""); setCuota(""); setInt("");
        }}><Plus size={15} /> Anotar en {nombreMes(mesEdit)}</button>
      </div>

      <div className="tarjeta">
        <h3>Cuánto pesa cada una</h3>
        {!grafico.length ? <p className="chico">Sin deudas cargadas en {nombreMes(mesEdit)}.</p> : (
          <ResponsiveContainer width="100%" height={Math.max(160, grafico.length * 54)}>
            <BarChart data={grafico} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#D3D9CF" horizontal={false} />
              <XAxis type="number" tickFormatter={corto} tick={{ fontSize: 10 }} stroke="#8A968F" />
              <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11 }} stroke="#8A968F" />
              <Tooltip formatter={(v) => `$${fmt(v)}`} contentStyle={TIP} itemStyle={TIP_ITEM} labelStyle={TIP_LABEL} />
              <Bar dataKey="Saldo" fill="#8E2F3E" radius={[0, 2, 2, 0]} />
              <Bar dataKey="Intereses" fill="#CE757B" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="tarjeta ancho">
        <h3>Tus deudas en {nombreMes(mesEdit)}, de la más cara a la más barata</h3>
        {!lista.length ? <p className="chico">{arrastradaDe ? "Copiá las del mes anterior para editarlas, o cargá una nueva." : "Nada anotado en este mes."}</p> : (
          <ul className="lista">
            {ordenadas.map((x) => {
              const c = calc(x);
              return (
                <li key={x.id} className="inv">
                  <div className="inv-izq">
                    <div className="inv-top">
                      <span className="ticker">{x.nombre}</span>
                      {c.creciendo && <span className="chip chip-mal">crece</span>}
                    </div>
                    <span className="li-fecha">
                      {x.cuota > 0 ? `pagás $${corto(x.cuota)} por mes` : "sin pago mensual cargado"}
                      {x.intereses > 0 && ` · te cobran $${corto(x.intereses)} de intereses`}
                    </span>
                    <span className="li-fecha">
                      {c.creciendo ? "Tu pago no cubre los intereses: cada mes debés más."
                        : c.meses ? `Se cancela en ${c.meses} ${c.meses === 1 ? "mes" : "meses"}${x.intereses > 0 ? "" : ", sin contar los intereses que se sumen"}.`
                        : x.cuota > 0 ? "" : "Cargá cuánto pagás por mes y te digo cuándo termina."}
                    </span>
                  </div>
                  <div className="inv-der">
                    <span className="monto mal">${fmt(x.monto)}</span>
                    {c.anual && (
                      <div className="rend">
                        <span>equivale a {fmt(c.anual, 0)}% al año</span>
                        {c.r * 100 > inflacionMensual && <span className="mal">más que la inflación</span>}
                      </div>
                    )}
                    <button className="btn-x" onClick={() => delDeuda(mesEdit, x.id)}><Trash2 size={13} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {interesesMes > 0 && <p className="pie">La tasa anual la calculo desde los intereses que cargaste, no la invento.</p>}
      </div>
    </div>
  );
}

/* ══════════════ reparto ══════════════ */

const ORDEN_SOBRES = ["necesarios", "deudas", "colchon", "inversiones", "recompensas"];

function Reparto({ d, guardar, conv, signo, ingreso, repartoReal, repartoSugerido, mesVista, viendoPasado, ym, setAviso, irA }) {
  const r = d.reparto || REPARTO_BASE;
  const suma = ORDEN_SOBRES.reduce((s, k) => s + (r[k] || 0), 0);
  const base = ingreso.valor;
  const cuadra = suma === 100;

  const set = (k, v) => {
    const n = Math.max(0, Math.min(100, Math.round(+v || 0)));
    guardar({ ...d, reparto: { ...r, [k]: n } });
  };
  const aplicarSugerido = () => {
    const { por, ...s } = repartoSugerido;
    guardar({ ...d, reparto: s });
    setAviso && setAviso("Listo: apliqué el reparto que te sugiero para tu etapa.");
  };
  /* ¿el objetivo actual difiere de lo que sugiero? */
  const difiere = ORDEN_SOBRES.some((k) => (r[k] || 0) !== (repartoSugerido[k] || 0));

  const visibles = ORDEN_SOBRES.filter((k) => (r[k] || 0) > 0);
  const pctReal = (v) => (repartoReal.entra > 0 ? (v / repartoReal.entra) * 100 : 0);

  return (
    <div className="grid">
      <div className="tarjeta ancho">
        <span className="stat-l">De cada $100 que entran</span>
        <div className="reparto-titular">
          {visibles.map((k) => (
            <span key={k} className="rt-item">
              <span className="rt-punto" style={{ background: SOBRES[k].color }} />
              <b>{r[k]}</b> {SOBRES[k].label.toLowerCase()}
            </span>
          ))}
        </div>

        <div className="reparto-barra">
          {visibles.map((k) => (
            <div key={k} className="rb-tramo" style={{ width: `${r[k]}%`, background: SOBRES[k].color }} title={`${SOBRES[k].label}: ${r[k]}%`} />
          ))}
          {suma < 100 && <div className="rb-tramo rb-libre" style={{ width: `${100 - suma}%` }} title="sin asignar" />}
        </div>

        {!cuadra && (
          <p className={`reparto-aviso ${suma > 100 ? "mal" : ""}`}>
            {suma > 100
              ? <>Estás repartiendo <b>{suma}%</b> de lo que entra: {suma - 100} puntos de más. Bajá alguno.</>
              : <>Te quedan <b>{100 - suma} puntos</b> sin asignar. Ponelos en algún sobre.</>}
          </p>
        )}

        <p className="colchon-texto">
          {ingreso.estimado
            ? <>Calculado sobre los ${fmt(base)} que estimaste que entran por mes. Cuando cierres meses reales, uso el promedio de verdad.</>
            : <>Calculado sobre ${fmt(base)}, tu promedio real de los últimos meses.</>}
        </p>
      </div>

      <div className="tarjeta ancho">
        <h3>Tus sobres</h3>
        <ul className="sobres">
          {ORDEN_SOBRES.map((k) => {
            const S = SOBRES[k];
            const pct = r[k] || 0;
            const plata = (base * pct) / 100;
            return (
              <li key={k} className={pct === 0 ? "sobre off" : "sobre"}>
                <span className="sb-color" style={{ background: S.color }} />
                <div className="sb-datos">
                  <span className="sb-nombre">{S.label}</span>
                  <span className="sb-que">{S.que}</span>
                </div>
                <div className="sb-pct">
                  <input type="number" min="0" max="100" value={pct} onChange={(e) => set(k, e.target.value)} />
                  <span className="sb-simbolo">%</span>
                </div>
                <span className="sb-plata">{pct > 0 ? `${signo}${fmt(conv(plata))}` : "—"}</span>
              </li>
            );
          })}
        </ul>
        <p className="pie">
          Los porcentajes son tuyos: cambialos cuando quieras. Lo que ves a la derecha es cuánta plata es cada sobre
          {ingreso.estimado ? " sobre lo que estimaste" : " sobre tu ingreso promedio"}.
        </p>
      </div>

      {difiere && (
        <div className="tarjeta ancho sug">
          <span className="stat-l">Lo que te sugiero para tu etapa</span>
          <div className="sug-fila">
            {ORDEN_SOBRES.filter((k) => repartoSugerido[k] > 0).map((k) => (
              <span key={k} className="sug-item">
                <span className="rt-punto" style={{ background: SOBRES[k].color }} />
                {repartoSugerido[k]}% {SOBRES[k].label.toLowerCase()}
              </span>
            ))}
          </div>
          <p className="colchon-texto">{repartoSugerido.por}</p>
          <button className="btn-secundario" onClick={aplicarSugerido}>Usar esta sugerencia</button>
        </div>
      )}

      <div className="tarjeta ancho">
        <h3>Dónde fue de verdad {viendoPasado ? `en ${nombreMes(mesVista)}` : "este mes"}</h3>
        {!repartoReal.hayDatos ? (
          <p className="chico">
            Todavía no anotaste movimientos {viendoPasado ? `en ${nombreMes(mesVista)}` : "este mes"}.
            Cuando lo hagas, acá comparo lo que te propusiste con lo que realmente pasó.
          </p>
        ) : repartoReal.entra <= 0 ? (
          <p className="chico">
            Anotaste gastos pero todavía no cargaste lo que entró {viendoPasado ? `en ${nombreMes(mesVista)}` : "este mes"}.
            Sin ese número no puedo calcular porcentajes. <button className="btn-fantasma" onClick={() => irA("movimientos")}>anotar lo que entró</button>
          </p>
        ) : (
          <>
            <div className="reparto-barra">
              {ORDEN_SOBRES.map((k) => {
                const p = pctReal(repartoReal[k] || 0);
                if (p <= 0) return null;
                return <div key={k} className="rb-tramo" style={{ width: `${Math.min(p, 100)}%`, background: SOBRES[k].color }} title={`${SOBRES[k].label}: ${fmt(p, 0)}%`} />;
              })}
            </div>
            <ul className="comp">
              {ORDEN_SOBRES.map((k) => {
                const real = repartoReal[k] || 0;
                const obj = r[k] || 0;
                if (real === 0 && obj === 0) return null;
                const pr = pctReal(real);
                const dif = pr - obj;
                const importa = Math.abs(dif) >= 3;
                const bien = k === "necesarios" || k === "recompensas" || k === "deudas" ? dif <= 0 : dif >= 0;
                return (
                  <li key={k} className="comp-fila">
                    <span className="sb-color" style={{ background: SOBRES[k].color }} />
                    <span className="comp-nombre">{SOBRES[k].label}</span>
                    <span className="comp-real">{fmt(pr, 0)}%</span>
                    <span className="comp-obj">de {obj}%</span>
                    <span className={`comp-dif ${!importa ? "" : bien ? "ok" : "mal"}`}>
                      {!importa ? "en línea" : `${dif > 0 ? "+" : "−"}${fmt(Math.abs(dif), 0)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
            {repartoReal.colchon < 0 && (
              <p className="reparto-aviso mal">
                Se te fue <b>${fmt(Math.abs(repartoReal.colchon))}</b> más de lo que entró. Saliste de lo guardado
                o de la tarjeta: por eso el colchón queda en rojo.
              </p>
            )}
            <p className="pie">
              El <b>colchón</b> no se anota: es lo que sobra después de todo lo demás. Por eso la cuenta siempre cierra
              contra lo que entró. Las categorías {CATS_GUSTO.join(" y ").toLowerCase()} cuentan como recompensas; el resto, como necesario.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════ metas ══════════════ */

function Metas({ d, add, del, ahorroUSD, colchonListo }) {
  const [n, setN] = useState(""), [c, setC] = useState(""), [l, setL] = useState(""), [f, setF] = useState("");

  const analizar = (m) => {
    const falta = m.costoUSD - m.llevoUSD;
    if (falta <= 0) return { estado: "listo", texto: "¡Ya la tenés! Llegaste a la meta." };
    if (!m.fecha) {
      if (ahorroUSD <= 0) return { estado: "neutro", texto: "Ponele una fecha o empezá a ahorrar y te digo cuándo llegás." };
      const k = Math.ceil(falta / ahorroUSD), x = new Date(); x.setMonth(x.getMonth() + k);
      return { estado: "ok", texto: `Buen ritmo: a lo que ahorrás hoy, la tenés en ${k} ${k === 1 ? "mes" : "meses"}, para ${mesLargo(x.toISOString().slice(0, 7))}.` };
    }
    const dias = diasHasta(m.fecha);
    if (dias < 0) return { estado: "neutro", texto: `Se pasó la fecha y te faltan US$${fmt(falta)}. Ponele una fecha nueva y seguí: ya tenés US$${fmt(m.llevoUSD)} juntados.` };
    const meses = Math.max(dias / 30.44, 0.1);
    const necesario = falta / meses;
    const base = `Te faltan US$${fmt(falta)} y quedan ${dias} ${dias === 1 ? "día" : "días"}.`;
    if (ahorroUSD <= 0) return { estado: "neutro", texto: `${base} Con US$${fmt(necesario)} por mes llegás justo. Empezá con lo que puedas: cada dólar te acerca.` };
    if (ahorroUSD >= necesario) return { estado: "ok", texto: `${base} A tu ritmo llegás holgado, ya ahorrás US$${fmt(ahorroUSD)} por mes. Vas muy bien.` };
    const pctCubierto = Math.round((ahorroUSD / necesario) * 100);
    const extra = Math.ceil(necesario - ahorroUSD);
    return { estado: "atrasado", texto: `${base} Ya cubrís el ${pctCubierto}% del ritmo que necesitás. Sumando US$${fmt(extra)} más por mes llegás a tiempo, o corré la fecha un poco. Vas encaminado.` };
  };

  return (
    <div className="grid">
      {!colchonListo && (
        <div className="tarjeta ancho nota-suave">
          Podés anotar metas cuando quieras. Pero sin colchón armado, cualquier imprevisto se las come. Primero el colchón.
        </div>
      )}
      <div className="tarjeta">
        <h3>Una cosa que querés</h3>
        <div className="campos">
          <label>Qué<input value={n} onChange={(e) => setN(e.target.value)} placeholder="Viaje, auto, mudanza…" /></label>
          <label>Cuánto cuesta, en dólares<input type="number" min="0" value={c} onChange={(e) => setC(e.target.value)} placeholder="0" /></label>
          <label>Cuánto llevás, en dólares<input type="number" min="0" value={l} onChange={(e) => setL(e.target.value)} placeholder="0" /></label>
          <label>Para cuándo la querés<input type="date" min={hoyISO()} value={f} onChange={(e) => setF(e.target.value)} /></label>
        </div>
        <button className="btn-primario ancho-btn" onClick={() => {
          const x = +c; if (!n || !x) return;
          add("metas", { nombre: n, costoUSD: x, llevoUSD: Math.max(0, +l || 0), fecha: f || null });
          setN(""); setC(""); setL(""); setF("");
        }}><Plus size={15} /> Agregar</button>
        <p className="pie">
          En dólares porque el precio de un auto o un pasaje no baja cuando sube la inflación. La fecha es opcional,
          pero con ella te digo cuánto tenés que guardar por mes para llegar.
          {ahorroUSD > 0 && <> Hoy ahorrás unos <b>US${fmt(ahorroUSD)}</b>.</>}
        </p>
      </div>

      {d.metas.map((m) => {
        const p = Math.min(100, (m.llevoUSD / m.costoUSD) * 100);
        const a = analizar(m);
        return (
          <div className="tarjeta" key={m.id}>
            <div className="meta-head">
              <h3>{m.nombre}</h3>
              <button className="btn-x" onClick={() => del("metas", m.id)}><Trash2 size={13} /></button>
            </div>
            {m.fecha && <p className="meta-fecha">para el {new Date(`${m.fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</p>}
            <div className="barra"><div style={{ width: `${p}%`, background: a.estado === "atrasado" ? "#C9A24B" : a.estado === "listo" ? "#1E6B55" : "#1E6B55" }} /></div>
            <div className="meta-cifras"><span>US${fmt(m.llevoUSD)} de US${fmt(m.costoUSD)}</span><span className="meta-pct">{fmt(p, 0)}%</span></div>
            <p className="meta-proy">{a.texto}</p>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════ vencimientos ══════════════ */

function Vencimientos({ d, add, del, proximos }) {
  const [nombre, setNombre] = useState(""), [dia, setDia] = useState("10"), [monto, setMonto] = useState("");
  return (
    <div className="grid">
      <div className="tarjeta">
        <h3>Algo que pagás siempre el mismo día</h3>
        <div className="campos">
          <label>Qué es<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tarjeta, alquiler, monotributo…" /></label>
          <label>Qué día del mes<input type="number" min="1" max="31" value={dia} onChange={(e) => setDia(e.target.value)} /></label>
          <label>Cuánto, si lo sabés<input type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" /></label>
        </div>
        <button className="btn-primario ancho-btn" onClick={() => {
          const k = +dia; if (!nombre || !k || k < 1 || k > 31) return;
          add("vencimientos", { nombre, dia: k, monto: Math.max(0, +monto || 0) }); setNombre(""); setMonto("");
        }}><Plus size={15} /> Agregar</button>
        <p className="pie">Te aviso arriba de todo cuando falten catorce días o menos. Sin notificaciones ni permisos.</p>
      </div>

      <div className="tarjeta">
        <h3>Lo que se viene</h3>
        {!proximos.length ? <p className="chico">Nada en los próximos catorce días.</p> : (
          <ul className="lista">
            {proximos.map((v) => (
              <li key={v.id}>
                <div className="li-izq">
                  <span className={`chip ${v.dias <= 3 ? "chip-mal" : "chip-neutro"}`}>{v.dias === 0 ? "hoy" : `${v.dias} días`}</span>
                  <span className="li-nota">{v.nombre}</span>
                </div>
                {v.monto > 0 && <span className="monto">${corto(v.monto)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tarjeta ancho">
        <h3>Todos</h3>
        {!d.vencimientos.length ? <p className="chico">Nada cargado.</p> : (
          <ul className="lista">
            {d.vencimientos.map((v) => (
              <li key={v.id}>
                <div className="li-izq"><span className="li-nota">{v.nombre}</span><span className="li-fecha">día {v.dia}</span></div>
                <div className="li-der">{v.monto > 0 && <span className="monto">${corto(v.monto)}</span>}
                  <button className="btn-x" onClick={() => del("vencimientos", v.id)}><Trash2 size={13} /></button></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ══════════════ entra y sale ══════════════ */

function Movimientos({ d, add, del, guardar, conv, signo, lente, mesVista, viendoPasado, ym }) {
  const [tipo, setTipo] = useState("gastos"), [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(viendoPasado ? `${mesVista}-15` : hoyISO());
  const [cat, setCat] = useState("Comida"), [nota, setNota] = useState("");
  const [fN, setFN] = useState(""), [fM, setFM] = useState(""), [fC, setFC] = useState("Casa");
  const [soloMes, setSoloMes] = useState(true);

  const cats = tipo === "gastos" ? CAT_GASTO : CAT_ENTRADA;
  const todos = [...d.gastos.map((x) => ({ ...x, k: "gastos" })), ...d.entradas.map((x) => ({ ...x, k: "entradas" }))]
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const todo = soloMes ? todos.filter((m) => m.fecha.startsWith(mesVista)) : todos;
  const mesFecha = fecha.slice(0, 7);

  return (
    <div className="grid">
      <div className="tarjeta">
        <h3>Anotar algo{viendoPasado ? ` en ${nombreMes(mesVista)}` : ""}</h3>
        <div className="seg">
          <button className={tipo === "gastos" ? "on" : ""} onClick={() => { setTipo("gastos"); setCat("Comida"); }}>Salió plata</button>
          <button className={tipo === "entradas" ? "on" : ""} onClick={() => { setTipo("entradas"); setCat("Sueldo"); }}>Entró plata</button>
        </div>
        <div className="campos">
          <label>Cuánto (en pesos)<input type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" /></label>
          <label>Cuándo<input type="date" max={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
          <label>En qué<select value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Detalle, si querés<input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Super, alquiler…" /></label>
        </div>
        {mesFecha !== ym && (
          <p className="pie" style={{ color: mesFecha === mesVista ? "var(--verde)" : "var(--rojo)" }}>
            Este movimiento va a caer en <b>{mesLargo(mesFecha)}</b>. Cambiá la fecha si querés que caiga en otro mes.
          </p>
        )}
        <button className="btn-primario ancho-btn" onClick={() => {
          const m = +monto; if (!m || m <= 0) return;
          add(tipo, { monto: m, fecha, categoria: cat, nota }); setMonto(""); setNota("");
        }}><Plus size={15} /> Anotar</button>
      </div>

      <div className="tarjeta">
        <h3>Gastos que se repiten todos los meses</h3>
        <p className="chico" style={{ marginBottom: 12 }}>Cargalos una vez. Cada mes te aviso y los sumás con un toque.</p>
        <div className="campos">
          <label>Qué es<input value={fN} onChange={(e) => setFN(e.target.value)} placeholder="Alquiler, prepaga, Netflix…" /></label>
          <label>Cuánto<input type="number" min="0" value={fM} onChange={(e) => setFM(e.target.value)} placeholder="0" /></label>
          <label>Categoría<select value={fC} onChange={(e) => setFC(e.target.value)}>{CAT_GASTO.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <button className="btn-secundario ancho-btn" onClick={() => {
          const m = +fM; if (!fN || !m) return;
          guardar({ ...d, fijos: [...d.fijos, { id: uid(), nombre: fN, monto: m, categoria: fC }] }); setFN(""); setFM("");
        }}><Repeat size={14} /> Guardar como fijo</button>
        {d.fijos.length > 0 && (
          <ul className="lista chica">{d.fijos.map((f) => (
            <li key={f.id}><span className="li-nota">{f.nombre}</span>
              <div className="li-der"><span className="monto">${corto(f.monto)}</span>
                <button className="btn-x" onClick={() => guardar({ ...d, fijos: d.fijos.filter((x) => x.id !== f.id) })}><Trash2 size={13} /></button></div></li>
          ))}</ul>
        )}
      </div>

      <div className="tarjeta ancho">
        <div className="fila-titulo">
          <h3>{soloMes ? `Lo anotado en ${nombreMes(mesVista)}` : "Todo lo anotado"} <span className="conteo">{todo.length}</span></h3>
          <button className="btn-fantasma" onClick={() => setSoloMes(!soloMes)}>{soloMes ? "ver todos los meses" : `ver solo ${nombreMes(mesVista)}`}</button>
        </div>
        {!todo.length ? <p className="chico">Nada anotado {soloMes ? `en ${nombreMes(mesVista)}` : "todavía"}.</p> : (
          <ul className="lista">
            {todo.slice(0, 80).map((m) => {
              const v = conv(m.monto, m.fecha.slice(0, 7));
              const cambio = lente === "reales" && Math.abs(v - m.monto) / m.monto > 0.02;
              return (
                <li key={m.id}>
                  <div className="li-izq">
                    <span className={`chip ${m.k === "gastos" ? "chip-mal" : "chip-ok"}`}>{m.categoria}</span>
                    <span className="li-nota">{m.nota || "—"}</span>
                    <span className="li-fecha">{m.fecha}</span>
                  </div>
                  <div className="li-der">
                    <span className={`monto ${m.k === "gastos" ? "mal" : "ok"}`}>{m.k === "gastos" ? "−" : "+"}{signo}{fmt(v)}</span>
                    {cambio && <span className="li-viejo">eran ${corto(m.monto)}</span>}
                    <button className="btn-x" onClick={() => del(m.k, m.id)}><Trash2 size={13} /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ══════════════ registro mes a mes ══════════════ */

function Registro({ d, guardar, conv, signo, registro, valorSaldo, totalLiquido, ultimoMesSaldo, ym, setAviso }) {
  const [mes, setMes] = useState(ym);
  const actual = d.saldos[mes] || { pesos: "", plazo: "", dolares: "" };
  const [pesos, setPesos] = useState(actual.pesos ?? "");
  const [plazo, setPlazo] = useState(actual.plazo ?? "");
  const [dolares, setDolares] = useState(actual.dolares ?? "");

  const cambiarMes = (nuevo) => {
    setMes(nuevo);
    const s = d.saldos[nuevo] || {};
    setPesos(s.pesos ?? ""); setPlazo(s.plazo ?? ""); setDolares(s.dolares ?? "");
  };

  const guardarSaldo = () => {
    const p = +pesos || 0, pl = +plazo || 0, u = +dolares || 0;
    if (!p && !pl && !u) {
      const s = { ...d.saldos }; delete s[mes]; guardar({ ...d, saldos: s });
      setAviso && setAviso(`Borré el saldo de ${mesLargo(mes)}.`);
      return;
    }
    guardar({ ...d, saldos: { ...d.saldos, [mes]: { pesos: p, plazo: pl, dolares: u } } });
    setAviso && setAviso(`Guardado: en ${nombreMes(mes)} tenías $${fmt(p + pl + u * d.mercado.mep)}.`);
  };

  const filaMes = registro.find((r) => r.ym === mes);
  const desvio = filaMes?.desvio;

  /* opciones de mes: 12 hacia atrás y 1 hacia adelante desde hoy */
  const opciones = useMemo(() => {
    const out = [];
    for (let i = 12; i >= -1; i--) out.push(sumaMeses(ym, -i));
    return out;
  }, [ym]);

  return (
    <div className="grid">
      <div className="tarjeta ancho">
        <span className="stat-l">Tu disponible hoy</span>
        <div className="colchon-num">{signo}{fmt(conv(totalLiquido))}</div>
        <p className="colchon-texto">
          {ultimoMesSaldo
            ? <>Sale del último saldo que declaraste, en {mesLargo(ultimoMesSaldo)}. Este es el número que alimenta tu colchón.</>
            : "Todavía no declaraste ningún saldo. Cargá el de este mes abajo."}
        </p>
      </div>

      <div className="tarjeta ancho">
        <h3>Tu punto de partida</h3>
        <p className="chico" style={{ marginBottom: 12 }}>
          Estos son los números que pusiste al arrancar, cuando todavía no habías anotado meses. La app los usa
          <b> solo hasta que cierres un mes real</b>; ahí los reemplaza por lo de verdad. Corregilos cuando quieras.
        </p>
        <div className="campos-fila">
          <label>Lo que calculás que entra por mes<input type="number" min="0" value={d.estimacion.entra || ""}
            onChange={(e) => guardar({ ...d, estimacion: { ...d.estimacion, entra: Math.max(0, +e.target.value || 0) } })} placeholder="0" /></label>
          <label>Lo que calculás que se va por mes<input type="number" min="0" value={d.estimacion.sale || ""}
            onChange={(e) => guardar({ ...d, estimacion: { ...d.estimacion, sale: Math.max(0, +e.target.value || 0) } })} placeholder="0" /></label>
        </div>
      </div>

      <div className="tarjeta">
        <h3>Cerrar un mes</h3>
        <div className="campos">
          <label>Qué mes<select value={mes} onChange={(e) => cambiarMes(e.target.value)}>
            {opciones.map((k) => <option key={k} value={k}>{mesLargo(k)}{k === ym ? " (este mes)" : ""}</option>)}
          </select></label>
          <label>Pesos en la cuenta<input type="number" min="0" value={pesos} onChange={(e) => setPesos(e.target.value)} placeholder="0" /></label>
          <label>Plazo fijo o fondo<input type="number" min="0" value={plazo} onChange={(e) => setPlazo(e.target.value)} placeholder="0" /></label>
          <label>Dólares (billetes o cuenta)<input type="number" min="0" value={dolares} onChange={(e) => setDolares(e.target.value)} placeholder="0" /></label>
        </div>
        <button className="btn-primario ancho-btn" onClick={guardarSaldo}><Plus size={15} /> Guardar el saldo de {nombreMes(mes)}</button>
        <p className="pie">
          Anotá lo que <b>realmente</b> tenías disponible al terminar el mes: mirá tu homebanking y copiá el número.
          Podés cargar meses viejos o corregir cualquiera. Solo cuenta la plata líquida; las inversiones van aparte.
        </p>
      </div>

      <div className="tarjeta">
        <h3>El control del mes</h3>
        {!filaMes || filaMes.esperado == null || filaMes.declarado == null ? (
          <p className="chico">
            Cuando tengas el saldo de <b>dos meses seguidos</b> declarados, acá te muestro si lo que anotaste como
            gastos cuadra con lo que realmente se movió en tus cuentas. Es la parte más útil, y la que ninguna
            planilla te hace sola.
          </p>
        ) : (
          <>
            <ul className="lista chica">
              <li><span className="li-nota">Tenías al mes anterior</span><span className="monto">${corto(filaMes.esperado - filaMes.neto)}</span></li>
              <li><span className="li-nota">Entró</span><span className="monto ok">+${corto(filaMes.entra)}</span></li>
              <li><span className="li-nota">Salió (lo anotado)</span><span className="monto mal">−${corto(filaMes.sale)}</span></li>
              <li><span className="li-nota">Debería quedarte</span><span className="monto">${corto(filaMes.esperado)}</span></li>
              <li><span className="li-nota">Declaraste</span><span className="monto">${corto(filaMes.declarado)}</span></li>
            </ul>
            {Math.abs(desvio) < Math.max(filaMes.esperado * 0.02, 5000) ? (
              <p className="pie" style={{ color: "var(--verde)" }}>Cuadra. Lo que anotaste explica todo lo que se movió.</p>
            ) : desvio < 0 ? (
              <p className="colchon-texto"><b className="mal">Te faltan ${corto(-desvio)}.</b> Gastaste esa plata pero no la anotaste. Son los gastos hormiga que se escapan.</p>
            ) : (
              <p className="colchon-texto"><b className="ok">Te sobran ${corto(desvio)}.</b> Entró plata que no registraste, o anotaste de más algún gasto.</p>
            )}
          </>
        )}
      </div>

      <div className="tarjeta ancho">
        <h3>Todos los meses</h3>
        {!registro.some((r) => r.declarado != null) ? (
          <p className="chico">Todavía no cerraste ningún mes.</p>
        ) : (
          <ul className="lista">
            {registro.slice().reverse().filter((r) => r.declarado != null || r.entra > 0 || r.sale > 0).map((r) => (
              <li key={r.ym}>
                <div className="li-izq">
                  <span className={`chip ${r.declarado != null ? "chip-ok" : "chip-neutro"}`}>{nombreMes(r.ym)}</span>
                  <span className="li-fecha">
                    {r.declarado != null ? `saldo $${corto(r.declarado)}` : "sin cerrar"}
                    {r.desvio != null && Math.abs(r.desvio) >= Math.max(r.esperado * 0.02, 5000) &&
                      (r.desvio < 0 ? ` · faltaron $${corto(-r.desvio)}` : ` · sobraron $${corto(r.desvio)}`)}
                  </span>
                </div>
                <div className="li-der">
                  <span className={`monto ${r.neto >= 0 ? "ok" : "mal"}`}>{r.neto >= 0 ? "+" : "−"}${corto(Math.abs(r.neto))}</span>
                  <button className="btn-fantasma" onClick={() => cambiarMes(r.ym)}>editar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="pie">El número verde o rojo de la derecha es lo que entró menos lo que salió ese mes. El saldo es lo que declaraste tener al cerrarlo.</p>
      </div>
    </div>
  );
}

/* ══════════════ ajustes ══════════════ */

function Ajustes({ d, guardar, online, ultimoOficial, mesesEstimados, exportarImagen }) {
  const [abierto, setAbierto] = useState(false);
  const ult = d.mercado.actualizado ? new Date(d.mercado.actualizado).toLocaleString("es-AR") : `sin actualizar (valores del ${SEMILLA_FECHA})`;
  const ipcMeses = Object.entries(d.ipc.serie).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);

  return (
    <div className="grid">
      <div className="tarjeta">
        <h3>El dólar</h3>
        <ul className="lista chica">
          {[["MEP", "mep"], ["Cripto", "cripto"], ["Blue", "blue"], ["Oficial", "oficial"]].map(([k, key]) => (
            <li key={key}><span className="li-nota">{k}</span><span className="monto">${fmt(d.mercado[key], 2)}</span></li>
          ))}
        </ul>
        <p className="pie">Fuente: DolarApi. {ult}. {online === false && "Ahora no hay conexión."}</p>
        <div className="campos" style={{ marginTop: 12 }}>
          <label>Corregir el MEP<input type="number" min="0" value={d.mercado.mep}
            onChange={(e) => guardar({ ...d, mercado: { ...d.mercado, mep: +e.target.value } })} /></label>
          <label>Corregir el dólar cripto<input type="number" min="0" value={d.mercado.cripto}
            onChange={(e) => guardar({ ...d, mercado: { ...d.mercado, cripto: +e.target.value } })} /></label>
        </div>
      </div>

      <div className="tarjeta">
        <h3>La inflación</h3>
        <ul className="lista chica">{ipcMeses.map(([k, v]) => (
          <li key={k}><span className="li-nota">{nombreMes(k)}</span><span className="monto">{fmt(v, 1)}%</span></li>))}
        </ul>
        <p className="pie">
          IPC del INDEC. El último dato oficial es de <b>{ultimoOficial ? nombreMes(ultimoOficial) : "—"}</b>.
          {mesesEstimados > 0 && ` Los ${mesesEstimados === 1 ? "últimos" : `últimos ${mesesEstimados}`} meses los estimo con el promedio reciente: el INDEC todavía no los publicó.`}
        </p>
        <div className="campos" style={{ marginTop: 12 }}>
          <label>Estimación para los meses sin dato (%)<input type="number" min="0" step="0.1" value={d.ipc.promedio}
            onChange={(e) => guardar({ ...d, ipc: { ...d.ipc, promedio: +e.target.value } })} /></label>
        </div>
      </div>

      <div className="tarjeta ancho">
        <h3>De dónde salen los números</h3>
        <p className="chico">
          Dólar e inflación se buscan solos: DolarApi y el IPC del INDEC vía ArgentinaDatos, ambos públicos y gratuitos.
          Todos los precios de tus inversiones —cripto, CEDEARs, acciones, bonos— los cargás vos. No existe una fuente
          pública y confiable que se pueda consultar desde el navegador sin las claves de tu broker.
        </p>
        <button className="btn-secundario" style={{ marginTop: 14 }} onClick={exportarImagen}>
          <ImageIcon size={14} /> Guardar mi resumen como imagen
        </button>
      </div>

      <div className="tarjeta ancho">
        <button className="btn-fantasma" onClick={() => setAbierto(!abierto)}>{abierto ? "Ocultar" : "Mostrar"} opciones peligrosas</button>
        {abierto && (<div style={{ marginTop: 14 }}>
          <p className="chico">Se borra todo. No hay vuelta atrás.</p>
          <button className="btn-peligro" style={{ marginTop: 10 }} onClick={() => guardar(INICIAL)}>Borrar todos mis datos</button>
        </div>)}
      </div>
    </div>
  );
}

/* ══════════════ estilos ══════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
.app{--papel:#E7EAE3;--alto:#F5F7F2;--tinta:#16232B;--verde:#1E6B55;--rojo:#8E2F3E;--niebla:#8A968F;--linea:#D3D9CF;--sombra:0 1px 2px rgba(22,35,43,.04),0 2px 8px rgba(22,35,43,.03);
background:var(--papel);color:var(--tinta);font-family:Inter,system-ui,sans-serif;min-height:100vh;
padding:0 clamp(16px,4vw,28px) 40px;max-width:1080px;margin:0 auto;font-size:15px;-webkit-font-smoothing:antialiased}
.app *{box-sizing:border-box}
.app h1,.app h3{font-family:'Bricolage Grotesque',Inter,sans-serif}
.app h3{font-size:12px;text-transform:uppercase;letter-spacing:.09em;color:var(--niebla);margin:0 0 14px;font-weight:600}
.cargando{padding:100px 0;text-align:center;color:var(--niebla)}
.ok{color:var(--verde)}.mal{color:var(--rojo)}
header.barra{display:flex;align-items:center;justify-content:space-between;padding:22px 0 16px;position:sticky;top:0;background:var(--papel);z-index:20}
.logo{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:20px;letter-spacing:-.02em}
.sello-version{font-family:'IBM Plex Mono',monospace;font-weight:400;font-size:10px;letter-spacing:0;color:var(--papel);background:var(--verde);padding:2px 7px;border-radius:99px;vertical-align:middle;margin-left:4px}
.acciones{display:flex;gap:7px;align-items:center}
.estado{color:var(--verde);display:flex;padding:0 4px}.estado.off{color:var(--rojo)}
.btn-icono{background:none;border:1px solid var(--linea);border-radius:6px;padding:8px 9px;color:var(--niebla);cursor:pointer;display:flex;transition:border-color .15s,color .15s,background .15s}
.btn-icono:hover{color:var(--tinta);border-color:var(--tinta);background:rgba(22,35,43,.04)}
.aviso{padding:11px 14px;background:var(--tinta);color:var(--papel);font-size:12.5px;border-radius:6px;margin-bottom:14px;box-shadow:var(--sombra)}
.offline{padding:11px 14px;background:var(--alto);border:1px dashed var(--linea);border-radius:6px;font-size:12.5px;color:var(--niebla);margin-bottom:14px;line-height:1.55}

.onb{max-width:460px;margin:0 auto;padding:72px 0}
.onb-progreso{display:flex;gap:5px;margin-bottom:38px}
.onb-progreso span{height:2px;flex:1;background:var(--linea)}.onb-progreso span.on{background:var(--tinta)}
.onb-pre{font-size:12px;color:var(--niebla);font-family:'IBM Plex Mono',monospace}
.onb h1{font-size:30px;line-height:1.2;margin:8px 0 10px;letter-spacing:-.02em;font-weight:700}
.onb-hint{font-size:14px;color:var(--niebla);line-height:1.55;margin:0 0 26px}
.onb-input{display:flex;align-items:center;gap:8px;border-bottom:2px solid var(--tinta);padding-bottom:6px}
.onb-input span{font-size:26px;color:var(--niebla);font-family:'IBM Plex Mono',monospace}
.onb-input input{border:none;background:none;font-size:34px;font-family:'IBM Plex Mono',monospace;width:100%;color:var(--tinta);padding:0}
.onb-input input:focus{outline:none}
.onb-botones{display:flex;gap:10px;margin-top:30px;align-items:center}
.onb-pie{font-size:11.5px;color:var(--niebla);margin-top:40px}

.hero{padding:22px 0 26px;border-top:1px solid var(--linea);border-bottom:1px solid var(--linea)}
.hero-label{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--niebla);font-family:'IBM Plex Mono',monospace}
.hero-numero{font-family:'IBM Plex Mono',monospace;font-size:clamp(42px,9vw,64px);font-weight:500;letter-spacing:-.03em;line-height:1.02;margin:8px 0 16px}
.pills{display:flex;gap:6px;flex-wrap:wrap}
.pill{background:none;border:1px solid var(--linea);border-radius:99px;padding:5px 13px;font-size:12.5px;color:var(--niebla);cursor:pointer;font-family:inherit}
.pill:hover{border-color:var(--tinta);color:var(--tinta)}
.pill-on{background:var(--tinta);border-color:var(--tinta);color:var(--papel)}
.hero-pista{font-size:12.5px;color:var(--niebla);margin:10px 0 0;line-height:1.55}
.revelacion{margin-top:18px;padding:14px 16px;background:var(--alto);border-left:2px solid var(--tinta);font-size:14px;line-height:1.6}
.promesa{border-left-color:var(--niebla);color:var(--niebla)}
.promesa b{color:var(--tinta)}
.progreso{display:flex;gap:4px;margin-top:12px}
.progreso span{height:3px;width:34px;background:var(--linea);border-radius:2px}
.progreso span.on{background:var(--verde)}

.paso{background:var(--tinta);color:var(--papel);border-radius:10px;margin:20px 0 0;overflow:hidden;box-shadow:var(--sombra)}
.paso-cabeza{display:grid;gap:5px;width:100%;text-align:left;background:none;color:inherit;border:none;padding:20px 46px 18px 20px;cursor:pointer;position:relative;font-family:inherit}
.paso-cabeza:hover{background:#1D2E38}
.paso-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#8FA69B;font-family:'IBM Plex Mono',monospace}
.paso-que{font-family:'Bricolage Grotesque',sans-serif;font-size:21px;font-weight:700;letter-spacing:-.01em;line-height:1.15}
.paso-por{font-size:13.5px;color:#B4BEB7;line-height:1.55;max-width:60ch}
.paso-flecha{position:absolute;right:20px;top:22px;color:#8FA69B}
.paso-barra{height:3px;background:rgba(231,234,227,.14);margin:0 20px}
.paso-barra>div{height:100%;background:var(--verde);border-radius:2px;transition:width .5s ease}
.paso-lista{display:flex;flex-direction:column;padding:12px 12px 14px}
.paso-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:none;color:#9FB0A6;font-family:inherit;font-size:13px;padding:8px 10px;border-radius:7px;cursor:pointer;transition:background .15s,color .15s}
.paso-item:hover{background:rgba(231,234,227,.06);color:var(--papel)}
.paso-item.hecho .paso-item-txt{color:#7E8D84}
.paso-item.es-actual{color:var(--papel);font-weight:500;background:rgba(231,234,227,.07)}
.paso-check{display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;color:#6E7D74}
.paso-item.hecho .paso-check{color:var(--verde)}
.paso-item.es-actual .paso-check{color:var(--papel)}
.punto-lleno{width:8px;height:8px;border-radius:50%;background:currentColor;display:block}
.paso-completo .paso-barra>div{background:#6FB49F}

.mes-nav{display:flex;align-items:center;gap:10px;margin:12px 0 0;padding:8px 10px;background:var(--alto);border:1px solid var(--linea);border-radius:5px}
.mes-nav.pasado{border-color:var(--tinta);background:#EDEFEA}
.mes-flecha{background:none;border:1px solid var(--linea);border-radius:4px;width:32px;height:32px;font-size:20px;line-height:1;color:var(--tinta);cursor:pointer;flex-shrink:0}
.mes-flecha:hover:not(:disabled){border-color:var(--tinta)}
.mes-flecha:disabled{opacity:.3;cursor:default}
.mes-centro{flex:1;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.mes-centro select{width:auto;min-width:180px;text-align:center;font-family:'Bricolage Grotesque',sans-serif;font-weight:600;border:none;background:none;font-size:15px}
.mes-hoy{background:none;border:1px solid var(--tinta);border-radius:99px;padding:3px 11px;font-size:11.5px;color:var(--tinta);cursor:pointer;font-family:inherit}
.mes-hoy:hover{background:var(--tinta);color:var(--papel)}
.pasado-aviso{border-style:solid;border-color:var(--tinta)}
.fila-titulo{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px}
.fila-titulo h3{margin:0}
.venc-tira{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px;padding:10px 14px;background:var(--alto);border:1px solid var(--linea);border-radius:4px;font-size:12.5px;color:var(--niebla)}
.venc-tira span{white-space:nowrap}
.venc-tira .urgente{color:var(--rojo);font-weight:500}
.recordatorio{display:flex;align-items:center;gap:9px;width:100%;margin-top:10px;padding:11px 14px;background:var(--alto);border:1px dashed var(--linea);border-radius:4px;font-size:13px;cursor:pointer;font-family:inherit;text-align:left;color:var(--tinta)}
.recordatorio:hover{border-color:var(--tinta)}

.tabs{display:flex;gap:3px;margin:24px 0 20px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.tabs::-webkit-scrollbar{display:none}
.tab{background:none;border:none;border-radius:99px;padding:9px 15px;font-size:13px;color:var(--niebla);cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap;font-family:inherit;transition:background .15s,color .15s}
.tab svg{opacity:.7}
.tab:hover{color:var(--tinta);background:rgba(22,35,43,.05)}
.tab.on{color:var(--papel);background:var(--tinta);font-weight:500}
.tab.on svg{opacity:1}
.tab-label{display:inline}

.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.ancho{grid-column:1/-1}
.tarjeta{background:var(--alto);border:1px solid var(--linea);border-radius:8px;padding:20px;box-shadow:var(--sombra)}
.nota-suave{font-size:13.5px;line-height:1.6;border-left:2px solid var(--rojo)}
.alerta{border-color:#D8C4CC}
.alerta-suave{display:flex;gap:10px;align-items:center;font-size:13px;color:var(--rojo);border-color:#D8C4CC}
.alerta-num{font-family:'IBM Plex Mono',monospace;font-size:32px;color:var(--rojo);margin:4px 0 10px}

.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.stat{display:flex;flex-direction:column;gap:5px}
.stat-l{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--niebla);font-family:'IBM Plex Mono',monospace;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.stat-v{font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:500}
.marca-est{background:var(--linea);color:#5A6660;padding:1px 5px;border-radius:2px;letter-spacing:0;text-transform:none;font-size:9.5px}

.futuro{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.futuro-barras{display:flex;align-items:flex-end;gap:6px;height:100px;flex:0 0 140px}
.futuro-barras span{flex:1;background:var(--linea);border-radius:2px 2px 0 0}

.colchon-num{font-family:'IBM Plex Mono',monospace;font-size:clamp(36px,8vw,52px);font-weight:500;letter-spacing:-.03em;margin:4px 0 16px}
.colchon-num span{font-size:20px;color:var(--niebla);letter-spacing:0}
.colchon-texto{font-size:14px;line-height:1.6;margin:14px 0 0;max-width:62ch}
.barra{height:7px;background:var(--linea);border-radius:4px;overflow:hidden}
.barra>div{height:100%;border-radius:4px;transition:width .4s ease}
.barras{list-style:none;padding:0;margin:0;display:grid;gap:12px}
.barra-fila{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}
.barra-fila em{color:var(--rojo);font-style:normal;font-size:11px}
.barra-fila b{font-family:'IBM Plex Mono',monospace;font-weight:500}

.torta{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.torta>div:first-child{flex:1 1 170px}
.leyenda{list-style:none;padding:0;margin:0;font-size:12.5px;flex:1 1 150px}
.leyenda li{display:flex;align-items:center;gap:7px;padding:3px 0;color:var(--niebla)}
.leyenda b{margin-left:auto;color:var(--tinta);font-family:'IBM Plex Mono',monospace;font-weight:500}
.punto{width:7px;height:7px;border-radius:50%;flex-shrink:0}

.seg{display:flex;gap:1px;background:var(--linea);border:1px solid var(--linea);border-radius:3px;overflow:hidden;margin-bottom:14px}
.seg button{flex:1;background:var(--alto);border:none;padding:8px;font-size:13px;cursor:pointer;color:var(--niebla);font-family:inherit}
.seg button.on{background:var(--tinta);color:var(--papel)}

.campos{display:grid;gap:11px}
.campos label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--niebla);text-transform:uppercase;letter-spacing:.05em;font-family:'IBM Plex Mono',monospace}
.app input,.app select{background:var(--papel);border:1px solid var(--linea);border-radius:6px;padding:10px 12px;font-size:14px;color:var(--tinta);font-family:'IBM Plex Mono',monospace;width:100%;transition:border-color .15s}
.app input:hover,.app select:hover{border-color:#B9C1BA}
.app input:focus,.app select:focus{outline:2px solid var(--verde);outline-offset:-1px;border-color:var(--verde)}

.btn-primario{background:var(--tinta);color:var(--papel);border:none;border-radius:6px;padding:12px 18px;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;font-weight:500;transition:background .15s,transform .05s}
.btn-primario:hover{background:#22333D}
.btn-primario:active{transform:scale(.99)}
.btn-secundario{background:none;color:var(--tinta);border:1px solid var(--tinta);border-radius:6px;padding:11px 16px;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;transition:background .15s}
.btn-secundario:hover{background:rgba(22,35,43,.05)}
.btn-fantasma{background:none;border:none;color:var(--niebla);font-size:12px;cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:3px;padding:4px 0}
.btn-fantasma:hover{color:var(--tinta)}
.btn-peligro{background:none;color:var(--rojo);border:1px solid var(--rojo);border-radius:6px;padding:9px 14px;font-size:13px;cursor:pointer;font-family:inherit}
.btn-peligro:hover{background:var(--rojo);color:var(--alto)}
.ancho-btn{width:100%;margin-top:14px}

.pie{font-size:11.5px;color:var(--niebla);margin:12px 0 0;line-height:1.6}
.pie b,.colchon-texto b,.chico b,.nota-suave b{color:var(--tinta)}
.chico{font-size:13px;color:var(--niebla);margin:0;line-height:1.6}
.conteo{font-family:'IBM Plex Mono',monospace;color:var(--linea);margin-left:6px}

.lista{list-style:none;padding:0;margin:0}
.lista.chica{margin-top:10px;font-size:13px}
.lista li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--linea)}
.lista li:last-child{border-bottom:none}
.li-izq{display:flex;align-items:center;gap:10px;min-width:0}
.li-der{display:flex;align-items:center;gap:10px}
.chip{font-size:9.5px;padding:3px 7px;border-radius:2px;font-family:'IBM Plex Mono',monospace;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
.chip-mal{background:#EDDCDF;color:var(--rojo)}
.chip-ok{background:#DDE8E2;color:var(--verde)}
.chip-neutro{background:#E2E5E8;color:#4A5C68}
.li-nota{font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.li-fecha{font-size:11px;color:var(--niebla);font-family:'IBM Plex Mono',monospace;line-height:1.5}
.li-viejo{font-size:10px;color:var(--niebla);font-family:'IBM Plex Mono',monospace}
.monto{font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:500}
.btn-x{background:none;border:none;color:var(--linea);cursor:pointer;padding:3px;display:flex}
.btn-x:hover{color:var(--rojo)}

.inv{align-items:flex-start}
.inv-izq{display:flex;flex-direction:column;gap:5px;min-width:0}
.inv-top{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.ticker{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:14px}
.inv-der{display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.rend{display:flex;gap:9px;font-size:10.5px;font-family:'IBM Plex Mono',monospace;color:var(--niebla);flex-wrap:wrap;justify-content:flex-end}
.rend.izq{justify-content:flex-start}
.viejo{color:var(--rojo);font-size:10px;font-family:'IBM Plex Mono',monospace}

.lista li.pos{display:block}
.pos-fila{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
.pos-der{display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex-shrink:0}
.precio-hoy{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.precio-hoy label{font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--niebla);font-family:'IBM Plex Mono',monospace}
.precio-hoy input{width:120px;padding:5px 8px;font-size:12.5px;text-align:right}
.pos-acciones{display:flex;gap:12px;align-items:center}
.venta-form{margin-top:14px;padding:16px;border:1px solid var(--linea);border-radius:8px;background:var(--papel)}

/* ── reparto ── */
.reparto-titular{display:flex;flex-wrap:wrap;gap:6px 18px;margin:10px 0 14px}
.rt-item{display:flex;align-items:center;gap:7px;font-size:14px;color:var(--niebla)}
.rt-item b{font-family:'IBM Plex Mono',monospace;font-size:19px;font-weight:500;color:var(--tinta)}
.rt-punto{width:9px;height:9px;border-radius:50%;flex-shrink:0}
.reparto-barra{display:flex;height:14px;border-radius:99px;overflow:hidden;background:var(--linea);margin:6px 0 12px;gap:2px}
.rb-tramo{height:100%;transition:width .35s ease}
.rb-libre{background:repeating-linear-gradient(45deg,var(--linea),var(--linea) 4px,#C3CBC4 4px,#C3CBC4 8px)}
.reparto-aviso{font-size:13px;color:var(--niebla);line-height:1.55;margin:10px 0 0;padding:9px 12px;background:var(--papel);border-left:2px solid var(--niebla);border-radius:0 5px 5px 0}
.reparto-aviso.mal{color:var(--rojo);border-left-color:var(--rojo)}

.sobres{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:2px}
.sobre{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--linea)}
.sobre:last-child{border-bottom:none}
.sobre.off{opacity:.45}
.sb-color{width:4px;align-self:stretch;border-radius:99px;flex-shrink:0;min-height:34px}
.sb-datos{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.sb-nombre{font-size:14.5px;font-weight:500}
.sb-que{font-size:11.5px;color:var(--niebla);line-height:1.45}
.sb-pct{display:flex;align-items:center;gap:3px;flex-shrink:0}
.sb-pct input{width:58px;text-align:right;padding:7px 8px;font-size:14px}
.sb-simbolo{font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--niebla)}
.sb-plata{font-family:'IBM Plex Mono',monospace;font-size:14px;min-width:96px;text-align:right;flex-shrink:0}

.sug{border-color:#B9C7BF;background:linear-gradient(var(--alto),var(--alto)) padding-box}
.sug-fila{display:flex;flex-wrap:wrap;gap:5px 14px;margin:9px 0 10px}
.sug-item{display:flex;align-items:center;gap:6px;font-size:13px;font-family:'IBM Plex Mono',monospace}

.comp{list-style:none;padding:0;margin:12px 0 0;display:flex;flex-direction:column;gap:1px}
.comp-fila{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--linea);font-size:13px}
.comp-fila:last-child{border-bottom:none}
.comp-fila .sb-color{min-height:16px;align-self:center;height:16px}
.comp-nombre{flex:1;min-width:0}
.comp-real{font-family:'IBM Plex Mono',monospace;font-weight:500;font-size:14px}
.comp-obj{font-family:'IBM Plex Mono',monospace;color:var(--niebla);font-size:11.5px;min-width:48px}
.comp-dif{font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--niebla);min-width:56px;text-align:right}
.comp-dif.ok{color:var(--verde)}
.comp-dif.mal{color:var(--rojo)}
@media(max-width:720px){
  .sobre{flex-wrap:wrap;gap:6px 10px;align-items:center}
  .sb-color{min-height:20px}
  .sb-datos{flex:1 1 auto;order:1;min-width:0}
  .sb-pct{order:2;flex:0 0 auto}
  .sb-plata{order:3;flex:1 0 100%;min-width:0;text-align:right;padding-left:16px}
  .sb-pct input{width:64px;font-size:16px}
  .comp-obj{display:none}
}
.venta-cabeza{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.venta-titulo{font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:16px;letter-spacing:-.01em}
.venta-tenencia{font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--niebla)}
.venta-lbl{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--niebla);font-family:'IBM Plex Mono',monospace;margin-bottom:7px}
.pct-botones{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px}
.pct-btn{background:var(--alto);border:1px solid var(--linea);border-radius:6px;padding:9px 4px;font-size:12.5px;color:var(--tinta);cursor:pointer;font-family:'IBM Plex Mono',monospace;transition:background .12s,border-color .12s,color .12s}
.pct-btn:hover{border-color:var(--tinta)}
.pct-btn.on{background:var(--tinta);border-color:var(--tinta);color:var(--papel);font-weight:500}
.venta-preview{margin-top:14px;padding:12px 14px;background:var(--alto);border:1px solid var(--linea);border-radius:7px}
.pv-fila{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:4px 0;font-size:13px;color:var(--niebla)}
.pv-fila b{font-family:'IBM Plex Mono',monospace;font-weight:500;color:var(--tinta)}
.pv-total{border-top:1px solid var(--linea);margin-top:5px;padding-top:8px}
.pv-total span{color:var(--tinta);font-weight:500}
.pv-total b{font-size:16px}
.pv-resto{border-top:1px dashed var(--linea);margin-top:5px;padding-top:8px;font-size:12px}

.ops{margin-top:12px;padding-top:12px;border-top:1px dashed var(--linea)}
.ops-titulo{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--niebla);font-family:'IBM Plex Mono',monospace;margin-bottom:8px}
.ops-lista{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
.op{display:flex;align-items:center;gap:11px;padding:9px 11px;background:var(--papel);border:1px solid var(--linea);border-radius:7px}
.op-tipo{font-size:9px;text-transform:uppercase;letter-spacing:.06em;font-family:'IBM Plex Mono',monospace;padding:3px 7px;border-radius:3px;flex-shrink:0;width:52px;text-align:center}
.op-tipo.compra{background:#DDE8E2;color:var(--verde)}
.op-tipo.venta{background:#EDDCDF;color:var(--rojo)}
.op-datos{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.op-linea1{font-size:12.5px;font-family:'IBM Plex Mono',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.op-linea1 b{font-weight:500}
.op-linea2{font-size:10.5px;color:var(--niebla);font-family:'IBM Plex Mono',monospace}
.op-der{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0}
.op-total{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500}
.op-res{font-family:'IBM Plex Mono',monospace;font-size:10.5px}
@media(max-width:720px){
  .pct-btn{padding:13px 4px;font-size:13px}
  .op{gap:9px;padding:10px}
  .op-tipo{width:46px;font-size:8.5px;padding:3px 4px}
  .op-linea1{font-size:12px;white-space:normal}
  .venta-form{padding:14px}
}
.campos-fila{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.campos-fila label{display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--niebla);text-transform:uppercase;letter-spacing:.05em;font-family:'IBM Plex Mono',monospace}
@media(max-width:760px){.campos-fila{grid-template-columns:1fr}}
.lotes{list-style:none;padding:10px 0 0;margin:10px 0 0;border-top:1px dashed var(--linea)}
.lotes li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border:none}

.meta-head{display:flex;justify-content:space-between;align-items:flex-start}
.meta-fecha{font-size:11.5px;color:var(--niebla);font-family:'IBM Plex Mono',monospace;margin:-6px 0 12px}
.meta-cifras{display:flex;justify-content:space-between;font-size:12.5px;font-family:'IBM Plex Mono',monospace;color:var(--niebla);margin-top:9px}
.meta-pct{color:var(--tinta);font-weight:500}
.meta-proy{font-size:13.5px;margin:10px 0 0;line-height:1.55}

/* ── tablet: el trío de números respira mejor en 3 pero el grid baja a 1 ── */
@media(max-width:900px){
  .grid{grid-template-columns:1fr}
}

/* ── celular ── */
@media(max-width:720px){
  .app{padding-bottom:calc(84px + env(safe-area-inset-bottom))}
  .trio{grid-template-columns:1fr;gap:0}
  .trio .stat{flex-direction:row;justify-content:space-between;align-items:baseline;padding:13px 0;border-bottom:1px solid var(--linea)}
  .trio .stat:last-child{border-bottom:none}
  .trio .stat-l{flex:1}
  .app input,.app select{font-size:16px}
  .precio-hoy input{font-size:14px}

  /* la navegación se vuelve barra fija abajo, tipo app */
  .tabs{position:fixed;left:0;right:0;bottom:0;z-index:60;margin:0;
    background:rgba(245,247,242,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    border-top:1px solid var(--linea);border-radius:0;
    padding:7px 8px calc(7px + env(safe-area-inset-bottom));gap:2px;
    box-shadow:0 -3px 16px rgba(22,35,43,.07);scroll-snap-type:x proximity}
  .tab{flex-direction:column;gap:3px;padding:6px 9px;min-width:62px;font-size:9.5px;border-radius:10px;scroll-snap-align:center}
  .tab svg{width:19px;height:19px}
  .tab-label{font-size:9.5px;letter-spacing:.01em;line-height:1}
  .tab:hover{background:none}
  .tab.on{background:var(--tinta)}

  .paso-cabeza{padding:18px 42px 16px 18px}
  .onb{padding:44px 0}
  .inv{flex-direction:column;align-items:flex-start;gap:8px}
  .inv-der{align-items:flex-start;width:100%}
  .rend{justify-content:flex-start}
  .pos-fila{flex-direction:column}
  .pos-der{align-items:flex-start;width:100%}
  .precio-hoy{align-items:flex-start}
  .precio-hoy input{text-align:left}
  .mes-centro select{min-width:0;width:100%}
  .hero-numero{margin-bottom:14px}
}

/* ── pantallas anchas: un poco más de aire entre columnas ── */
@media(min-width:1000px){
  .grid{gap:22px}
  .tarjeta{padding:22px}
}
@media(prefers-reduced-motion:reduce){.app *{transition:none!important;animation:none!important}}
`;
