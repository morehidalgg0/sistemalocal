import React from 'react';
import { 
  DollarSign, 
  Smartphone, 
  Package, 
  Wrench, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  CreditCard,
  AlertCircle
} from 'lucide-react';

export default function Dashboard({ data, config, onNavigate }) {
  const kpis = data?.kpis || {};
  const dolar = kpis.dolarActual || 1480;

  return (
    <div className="space-y-6">
      {/* Top Header Card con cotización del día */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700/60 shadow-xl gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Panel de Control General
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Resumen en tiempo real del local, stock, tesorería y cuentas corrientes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Dólar Blue Hoy</div>
              <div className="text-lg font-bold text-emerald-400">${dolar.toLocaleString('es-AR')}</div>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('ventas')}
            className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2 text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capital Total Activo */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Capital Total Activo</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ${kpis.capitalTotalUSD?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>En Pesos (~):</span>
            <span className="text-slate-300 font-medium">${(kpis.capitalTotalUSD * dolar)?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS</span>
          </div>
        </div>

        {/* Stock Celulares */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition cursor-pointer" onClick={() => onNavigate('dispositivos')}>
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Celulares</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ${kpis.stockDispositivosUSD?.toLocaleString('es-AR')} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Equipos disponibles:</span>
            <span className="text-indigo-400 font-bold">{data?.equiposEnStock || 0} equipos</span>
          </div>
        </div>

        {/* Dinero en Caja / Liquidez */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition cursor-pointer" onClick={() => onNavigate('cajas')}>
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Cajas & Liquidez</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ${kpis.saldoCajasUSD?.toLocaleString('es-AR')} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Caja Pesos:</span>
            <span className="text-emerald-400 font-bold">${kpis.saldoCajasARS?.toLocaleString('es-AR')} ARS</span>
          </div>
        </div>

        {/* Deudas y Cuentas a Pagar */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition cursor-pointer" onClick={() => onNavigate('cc')}>
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Deuda Proveedores (CC)</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">
            ${kpis.saldoCCProveedores?.toLocaleString('es-AR')} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Deudores por cobrar:</span>
            <span className="text-amber-400 font-bold">${kpis.totalDeudoresUSD?.toLocaleString('es-AR')} USD</span>
          </div>
        </div>
      </div>

      {/* Secciones Rápidas de Trabajo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accesos y Resumen de Estado */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-400" />
                Acciones Rápidas del Negocio
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button 
                onClick={() => onNavigate('ventas')} 
                className="p-4 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col items-center justify-center gap-2 group transition text-center"
              >
                <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg group-hover:bg-sky-500 group-hover:text-white transition">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Facturar Venta</span>
              </button>

              <button 
                onClick={() => onNavigate('dispositivos')} 
                className="p-4 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col items-center justify-center gap-2 group transition text-center"
              >
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Ingresar Celular</span>
              </button>

              <button 
                onClick={() => onNavigate('taller')} 
                className="p-4 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col items-center justify-center gap-2 group transition text-center"
              >
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition">
                  <Wrench className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Servicio Técnico</span>
              </button>

              <button 
                onClick={() => onNavigate('cajas')} 
                className="p-4 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex flex-col items-center justify-center gap-2 group transition text-center"
              >
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Movimiento Caja</span>
              </button>
            </div>
          </div>

          {/* Últimas Ventas */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Últimas Ventas Registradas
              </h2>
              <button onClick={() => onNavigate('ventas')} className="text-xs text-sky-400 hover:text-sky-300">Ver todas</button>
            </div>
            
            {(!data?.ultimasVentas || data.ultimasVentas.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No hay ventas registradas este mes aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-800">
                      <th className="pb-2">Dispositivo / Item</th>
                      <th className="pb-2">Cliente</th>
                      <th className="pb-2">Vendedor</th>
                      <th className="pb-2 text-right">Venta</th>
                      <th className="pb-2 text-right">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.ultimasVentas.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 font-medium text-slate-200">{v.item_detalle}</td>
                        <td className="py-2.5 text-slate-400">{v.cliente_nombre}</td>
                        <td className="py-2.5 text-slate-300">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-semibold">{v.vendedor_nombre}</span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-white">
                          ${v.precio_venta_usd ? `${v.precio_venta_usd} USD` : `$${v.precio_venta_pesos?.toLocaleString('es-AR')} ARS`}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-400">
                          +${v.ganancia_usd?.toFixed(1)} USD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral: Cuentas Corrientes Clave y Alertas */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Saldos en Cuenta Corriente
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
                <div>
                  <div className="text-sm font-semibold text-white">Garden (Mayorista)</div>
                  <div className="text-xs text-slate-400">Proveedor principal</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-rose-400">$10,314 USD</div>
                  <div className="text-[10px] text-slate-400">Adeudado</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
                <div>
                  <div className="text-sm font-semibold text-white">Lucas Moroni</div>
                  <div className="text-xs text-slate-400">Proveedor equipos</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-rose-400">$2,025 USD</div>
                  <div className="text-[10px] text-slate-400">Adeudado</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/40">
                <div>
                  <div className="text-sm font-semibold text-white">Ema Haase</div>
                  <div className="text-xs text-slate-400">Socio / Cuenta</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-rose-400">$446 USD</div>
                  <div className="text-[10px] text-slate-400">Adeudado</div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('cc')}
              className="w-full mt-3 py-2 text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 rounded-xl transition text-center"
            >
              Ver todas las Cuentas Corrientes →
            </button>
          </div>

          {/* Estado de Gastos Fijos del Mes */}
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Gastos del Mes
            </h2>
            <p className="text-xs text-slate-400 mb-3">Control de alquileres, sueldos y servicios del local.</p>
            <button 
              onClick={() => onNavigate('gastos')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
            >
              Gestionar Gastos Fijos e Inversiones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
