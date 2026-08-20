import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Smartphone, 
  Package, 
  Wrench, 
  DollarSign, 
  Users, 
  CreditCard,
  Menu, 
  X 
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Ventas from "./pages/Ventas";
import Dispositivos from "./pages/Dispositivos";
import Inventario from "./pages/Inventario";
import Taller from "./pages/Taller";
import Cajas from "./pages/Cajas";
import CuentasCorrientes from "./pages/CuentasCorrientes";
import GastosFinanzas from "./pages/GastosFinanzas";
import fallbackData from "./data/fallbackData";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [config, setConfig] = useState(fallbackData.configuracion);
  const [loading, setLoading] = useState(true);

  const calculateFallbackDashboard = () => {
    const dolar = parseFloat(fallbackData.configuracion?.dolar_blue || 1480);
    const stockDisp = (fallbackData.dispositivos || [])
      .filter(d => d.estado === "En Stock" || d.estado === "Señado")
      .reduce((a, d) => a + (parseFloat(d.costo_usd) || 0) + (parseFloat(d.costo_reparacion_usd) || 0), 0);
    const stockAcc = (fallbackData.inventario_items || [])
      .reduce((a, i) => a + ((parseFloat(i.costo_usd) || ((parseFloat(i.costo_pesos)||0)/dolar)) * (i.stock_actual || 0)), 0);
    let saldoUSD = 0, saldoARS = 0;
    (fallbackData.cuentas_caja || []).forEach(c => {
      const s = parseFloat(c.saldo_actual) || 0;
      if (c.moneda === "USD" || c.moneda === "USDT") saldoUSD += s;
      else if (c.moneda === "ARS") saldoARS += s;
    });
    const totalLiquido = saldoUSD + (saldoARS / dolar);
    const ventas = fallbackData.ventas || [];
    const gananciaMes = ventas.reduce((a, v) => a + (parseFloat(v.ganancia_usd) || 0), 0);
    const totalVendidos = ventas.length;
    const promedio = totalVendidos > 0 ? gananciaMes / totalVendidos : 0;

    const deudores = (fallbackData.deudas_deudores || []).filter(d => d.tipo === "DEUDOR" && d.estado !== "Cancelado");
    const totalDeudoresUSD = deudores.reduce((a, d) => a + (parseFloat(d.monto_pendiente) || 0), 0);

    const deudas = (fallbackData.deudas_deudores || []).filter(d => d.tipo === "DEUDA" && d.estado !== "Cancelado");
    const totalDeudasUSD = deudas.reduce((a, d) => a + (parseFloat(d.monto_pendiente) || 0), 0);

    const ccProv = (fallbackData.entidades_cc || [])
      .filter(e => e.tipo === "PROVEEDOR")
      .reduce((a, e) => a + (parseFloat(e.saldo_adeudado) || 0), 0);

    return {
      kpis: {
        capitalTotalUSD: stockDisp + stockAcc + totalLiquido,
        stockDispositivosUSD: stockDisp,
        stockAccesoriosUSD: stockAcc,
        totalLiquidoUSD: totalLiquido,
        saldoCajasUSD: saldoUSD,
        saldoCajasARS: saldoARS,
        gananciaMesUSD: gananciaMes,
        totalEquiposVendidos: totalVendidos,
        promedioGananciaPorTel: promedio,
        totalDeudoresUSD: totalDeudoresUSD,
        totalDeudasUSD: totalDeudasUSD,
        saldoCCProveedores: ccProv,
        dolarActual: dolar
      },
      equiposEnStock: (fallbackData.dispositivos || []).filter(d => d.estado === "En Stock").length,
      reparacionesActivas: (fallbackData.reparaciones || []).filter(r => r.estado !== "Entregado y Cobrado").length,
      ultimasVentas: (fallbackData.ventas || []).slice(-5).reverse(),
      ultimosMovimientos: (fallbackData.caja_movimientos || []).slice(-6).reverse()
    };
  };

  const fetchGlobalData = async () => {
    try {
      const [resDash, resConf] = await Promise.all([
        fetch("/api/dashboard").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/config").then(r => r.ok ? r.json() : null).catch(() => null)
      ]);
      if (resDash && resDash.kpis) {
        setDashboardData(resDash);
      } else {
        setDashboardData(calculateFallbackDashboard());
      }
      if (resConf && resConf.config) {
        setConfig(resConf.config);
      } else {
        setConfig(fallbackData.configuracion);
      }
    } catch (err) {
      console.warn("Using fallback dashboard data:", err);
      setDashboardData(calculateFallbackDashboard());
      setConfig(fallbackData.configuracion);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const navItems = [
    { id: "dashboard", label: "Panel General", icon: LayoutDashboard },
    { id: "ventas", label: "Facturación / Ventas", icon: TrendingUp },
    { id: "dispositivos", label: "Stock Celulares", icon: Smartphone },
    { id: "inventario", label: "Accesorios & Repuestos", icon: Package },
    { id: "taller", label: "Servicio Técnico", icon: Wrench },
    { id: "cajas", label: "Cajas & Bancos", icon: DollarSign },
    { id: "cc", label: "Cuentas Corrientes", icon: Users },
    { id: "gastos", label: "Gastos & Finanzas", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50
        w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div>
          {/* Logo & Store Branding */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
                NP
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white">NEW POINT</h1>
                <p className="text-[11px] text-sky-400 font-semibold uppercase tracking-wider">Gestión & Lab</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all
                    ${isActive 
                      ? "bg-sky-600 text-white shadow-md shadow-sky-600/25 font-semibold" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & System Status */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Base de Datos:</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sincronizado
            </span>
          </div>
          <div className="text-[10px] text-slate-500 text-center pt-1">
            Sistema Local v1.0 • Optimizado
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-semibold text-slate-300">
              {navItems.find(i => i.id === activeTab)?.label}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
              <span>Dólar Blue:</span>
              <strong className="text-emerald-400">${config?.dolar_blue || "1480"}</strong>
            </div>
          </div>
        </header>

        {/* Dynamic Page Rendering */}
        <div className="p-6 max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && (
            <Dashboard 
              data={dashboardData} 
              config={config} 
              onNavigate={(tab) => setActiveTab(tab)} 
            />
          )}

          {activeTab === "ventas" && (
            <Ventas 
              config={config} 
              onDataChange={fetchGlobalData} 
            />
          )}

          {activeTab === "dispositivos" && (
            <Dispositivos 
              config={config} 
              onDataChange={fetchGlobalData} 
            />
          )}

          {activeTab === "inventario" && (
            <Inventario 
              config={config} 
              onDataChange={fetchGlobalData} 
            />
          )}

          {activeTab === "taller" && (
            <Taller 
              config={config} 
              onDataChange={fetchGlobalData} 
            />
          )}

          {activeTab === "cajas" && (
            <Cajas 
              config={config} 
              onDataChange={fetchGlobalData} 
            />
          )}

          {activeTab === "cc" && (
            <CuentasCorrientes 
              config={config} 
              onDataChange={fetchGlobalData} 
            />
          )}

          {activeTab === "gastos" && (
            <GastosFinanzas 
              config={config} 
              onDataChange={fetchGlobalData} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
