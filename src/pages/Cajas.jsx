import fallbackData from "../data/fallbackData";
import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw, Plus, CreditCard, Wallet, Landmark } from 'lucide-react';

export default function Cajas({ config, onDataChange }) {
  const [cajas, setCajas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('MOVIMIENTO'); // 'MOVIMIENTO' o 'CAMBIO_DIVISA'

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  const [formData, setFormData] = useState({
    cuenta_id: '',
    tipo_movimiento: 'ENTRADA', // 'ENTRADA', 'SALIDA'
    categoria: 'Venta',
    concepto: '',
    monto: '',
    cotizacion: dolarCotiz,
    persona_asociada: '',
    comprobante_ref: '',
    // Para cambio de divisas:
    cuenta_origen_id: '',
    cuenta_destino_id: '',
    monto_usd_comprado: '',
    precio_dolar_pago: dolarCotiz
  });

  useEffect(() => {
    fetchCajasData();
  }, []);

  const fetchCajasData = async () => {
    try {
      setLoading(true);
      const [resCajas, resMovs] = await Promise.all([
        fetch('/api/cajas').then(r => r.json()),
        fetch('/api/cajas/movimientos').then(r => r.json())
      ]);
      setCajas(resCajas || []);
      setMovimientos(resMovs || []);
      if (resCajas && resCajas.length > 0 && !formData.cuenta_id) {
        setFormData(prev => ({ ...prev, cuenta_id: resCajas[0].id }));
      }
    } catch (err) {
      console.warn("Using fallback cajas:", err); setCajas(fallbackData.cuentas_caja || []); setMovimientos(fallbackData.caja_movimientos || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMovimiento = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'CAMBIO_DIVISA') {
        // Operación de cambio: ej. compra de dólares
        const ctaDestino = cajas.find(c => c.id === parseInt(formData.cuenta_destino_id));
        const ctaOrigen = cajas.find(c => c.id === parseInt(formData.cuenta_origen_id));
        const montoUSD = parseFloat(formData.monto_usd_comprado) || 0;
        const cotiz = parseFloat(formData.precio_dolar_pago) || dolarCotiz;
        const totalPesosEgresados = montoUSD * cotiz;

        const payload = {
          cuenta_id: ctaDestino.id,
          tipo_movimiento: 'CAMBIO_DIVISA',
          categoria: 'Compra USD',
          concepto: `Compra de ${montoUSD} USD a tipo de cambio $${cotiz}`,
          monto: montoUSD,
          cotizacion: cotiz,
          cuenta_origen_id: ctaOrigen.id,
          monto_egreso: totalPesosEgresados,
          persona_asociada: formData.persona_asociada
        };

        const res = await fetch('/api/cajas/movimientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setShowModal(false);
          fetchCajasData();
          if (onDataChange) onDataChange();
        }
      } else {
        const payload = {
          cuenta_id: formData.cuenta_id,
          tipo_movimiento: formData.tipo_movimiento,
          categoria: formData.categoria,
          concepto: formData.concepto,
          monto: parseFloat(formData.monto) || 0,
          cotizacion: parseFloat(formData.cotizacion) || dolarCotiz,
          persona_asociada: formData.persona_asociada,
          comprobante_ref: formData.comprobante_ref
        };

        const res = await fetch('/api/cajas/movimientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setShowModal(false);
          fetchCajasData();
          if (onDataChange) onDataChange();
        }
      }
    } catch (err) {
      console.error("Error guardando movimiento de caja:", err);
    }
  };

  const getIconForType = (tipo) => {
    switch (tipo) {
      case 'Banco': return <Landmark className="w-5 h-5 text-sky-400" />;
      case 'Billetera Virtual': return <Wallet className="w-5 h-5 text-purple-400" />;
      default: return <DollarSign className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/90 p-6 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Cajas, Bancos & Tesorería
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Arqueo multidivisa en tiempo real: Caja Fuerte USD, Caja Pesos, Lemon Cash, Banco y cotizaciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setModalType('CAMBIO_DIVISA');
              setShowModal(true);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-4 py-2.5 rounded-xl transition flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            Compra / Venta Dólares
          </button>
          <button
            onClick={() => {
              setModalType('MOVIMIENTO');
              setShowModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Ingreso / Egreso
          </button>
        </div>
      </div>

      {/* Grid de Cajas y Cuentas Activas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cajas.map(c => (
          <div key={c.id} className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.tipo}</span>
              <div className="p-2 bg-slate-800 rounded-xl">
                {getIconForType(c.tipo)}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-white truncate">{c.nombre}</div>
              <div className="text-2xl font-bold font-mono mt-1 text-emerald-400">
                {c.moneda === 'USD' || c.moneda === 'USDT' ? `$${c.saldo_actual?.toLocaleString('es-AR')} ${c.moneda}` : `$${c.saldo_actual?.toLocaleString('es-AR')} ARS`}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
              <span>Saldo Inicial:</span>
              <span className="font-mono">${c.saldo_inicial?.toLocaleString('es-AR')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Historial de Movimientos de Caja */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">Libro Diario de Caja y Movimientos ({movimientos.length})</h2>
          <span className="text-xs text-slate-400 font-mono">Últimos registros</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando movimientos...</div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No hay movimientos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Caja / Cuenta</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Concepto / Detalle</th>
                  <th className="py-3 px-4">Asociado</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {movimientos.map((m) => {
                  const isEntrada = m.tipo_movimiento === 'ENTRADA' || m.tipo_movimiento === 'CAMBIO_DIVISA';
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(m.fecha).toLocaleDateString('es-AR')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {m.cuenta_nombre}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {m.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {m.concepto}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {m.persona_asociada || '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold font-mono ${isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isEntrada ? '+' : '-'}${m.monto?.toLocaleString('es-AR')} {m.moneda}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ingreso/Egreso o Arbitraje USD */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {modalType === 'CAMBIO_DIVISA' ? (
                  <>
                    <RefreshCw className="w-5 h-5 text-emerald-400" />
                    Operación de Cambio (Compra/Venta USD)
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5 text-sky-400" />
                    Registrar Movimiento de Caja
                  </>
                )}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateMovimiento} className="space-y-4">
              {modalType === 'CAMBIO_DIVISA' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Caja Salida (Pesos)</label>
                      <select
                        required
                        value={formData.cuenta_origen_id}
                        onChange={e => setFormData({ ...formData, cuenta_origen_id: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="">Seleccionar...</option>
                        {cajas.filter(c => c.moneda === 'ARS').map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} (${c.saldo_actual})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Caja Entrada (Dólares)</label>
                      <select
                        required
                        value={formData.cuenta_destino_id}
                        onChange={e => setFormData({ ...formData, cuenta_destino_id: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="">Seleccionar...</option>
                        {cajas.filter(c => c.moneda === 'USD').map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} (${c.saldo_actual})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto Dólares Comprados</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.monto_usd_comprado}
                        onChange={e => setFormData({ ...formData, monto_usd_comprado: e.target.value })}
                        placeholder="ej. 200"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cotización Pagada ($)</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.precio_dolar_pago}
                        onChange={e => setFormData({ ...formData, precio_dolar_pago: e.target.value })}
                        placeholder="ej. 1480"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold text-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-300 flex justify-between">
                    <span>Total Pesos a Egresar:</span>
                    <strong className="text-rose-400 font-mono text-sm">
                      ${((parseFloat(formData.monto_usd_comprado) || 0) * (parseFloat(formData.precio_dolar_pago) || 0)).toLocaleString('es-AR')} ARS
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo Movimiento</label>
                      <select
                        value={formData.tipo_movimiento}
                        onChange={e => setFormData({ ...formData, tipo_movimiento: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="ENTRADA">🟢 ENTRADA (Ingreso)</option>
                        <option value="SALIDA">🔴 SALIDA (Egreso / Pago)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Caja / Cuenta</label>
                      <select
                        value={formData.cuenta_id}
                        onChange={e => setFormData({ ...formData, cuenta_id: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        {cajas.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} ({c.moneda})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoría</label>
                      <select
                        value={formData.categoria}
                        onChange={e => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="Venta">Venta</option>
                        <option value="Servicio Técnico">Servicio Técnico</option>
                        <option value="Retiro Socio">Retiro Socio</option>
                        <option value="Pago Proveedor">Pago Proveedor</option>
                        <option value="Gasto Fijo">Gasto Fijo</option>
                        <option value="Gasto Extra / Comida">Gasto Extra / Comida</option>
                        <option value="Varios">Varios</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.monto}
                        onChange={e => setFormData({ ...formData, monto: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Concepto / Detalle *</label>
                    <input
                      type="text"
                      required
                      value={formData.concepto}
                      onChange={e => setFormData({ ...formData, concepto: e.target.value })}
                      placeholder="ej. Pago publicidad / Retiro de Fran / Nafta"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Persona Asociada (Opcional)</label>
                    <input
                      type="text"
                      value={formData.persona_asociada}
                      onChange={e => setFormData({ ...formData, persona_asociada: e.target.value })}
                      placeholder="ej. Fran / Eze / Lucas"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-lg shadow-emerald-600/30">
                  Registrar en Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
