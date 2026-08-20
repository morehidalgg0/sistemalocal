import fallbackData from "../data/fallbackData";
import React, { useState, useEffect } from 'react';
import { Users, Plus, ArrowUpRight, ArrowDownRight, CreditCard, ChevronRight, DollarSign } from 'lucide-react';

export default function CuentasCorrientes({ config, onDataChange }) {
  const [entidades, setEntidades] = useState([]);
  const [selectedEntidad, setSelectedEntidad] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaEntidadModal, setShowNuevaEntidadModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);

  // Form Movimiento CC
  const [movForm, setMovForm] = useState({
    tipo: 'PAGO_REALIZADO', // 'PAGO_REALIZADO', 'ENTREGA_EQUIPO', 'AJUSTE'
    concepto: '',
    monto: '',
    impactar_caja: false,
    caja_id: ''
  });

  // Form Nueva Entidad
  const [entidadForm, setEntidadForm] = useState({
    nombre: '',
    tipo: 'PROVEEDOR',
    contacto: '',
    moneda_principal: 'USD',
    saldo_inicial: '0',
    notas: ''
  });

  useEffect(() => {
    fetchEntidades();
  }, []);

  const fetchEntidades = async () => {
    try {
      setLoading(true);
      const [resCC, resCajas] = await Promise.all([
        fetch('/api/cuentas-corrientes').then(r => r.json()),
        fetch('/api/cajas').then(r => r.json())
      ]);
      setEntidades(resCC || []);
      setCajas(resCajas || []);
      if (resCC && resCC.length > 0 && !selectedEntidad) {
        selectEntidad(resCC[0]);
      }
    } catch (err) {
      console.error("Error fetching CC:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectEntidad = async (entidad) => {
    setSelectedEntidad(entidad);
    try {
      const res = await fetch(`/api/cuentas-corrientes/${entidad.id}/movimientos`);
      const movs = await res.json();
      setMovimientos(movs || []);
    } catch (err) {
      console.error("Error fetching movimientos CC:", err);
    }
  };

  const handleCreateEntidad = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cuentas-corrientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entidadForm)
      });
      if (res.ok) {
        setShowNuevaEntidadModal(false);
        fetchEntidades();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error creando entidad CC:", err);
    }
  };

  const handleCreateMovimiento = async (e) => {
    e.preventDefault();
    if (!selectedEntidad) return;
    try {
      const res = await fetch(`/api/cuentas-corrientes/${selectedEntidad.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movForm)
      });
      if (res.ok) {
        setShowMovModal(false);
        setMovForm({ tipo: 'PAGO_REALIZADO', concepto: '', monto: '', impactar_caja: false, caja_id: '' });
        fetchEntidades();
        selectEntidad(selectedEntidad);
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error creando movimiento CC:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/90 p-6 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Cuentas Corrientes (CC)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Control de saldos adeudados y pagos con Proveedores (Garden, Lucas, Víctor), Técnicos (Rosario, Becker) y Socios.
          </p>
        </div>
        <button
          onClick={() => setShowNuevaEntidadModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta Corriente
        </button>
      </div>

      {/* Grid Principal: Lista a la izquierda / Ficha a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Cuentas Corrientes */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            Cuentas Registradas ({entidades.length})
          </div>

          <div className="space-y-2">
            {entidades.map(ent => {
              const isSelected = selectedEntidad?.id === ent.id;
              const deuda = parseFloat(ent.saldo_adeudado) || 0;
              return (
                <div
                  key={ent.id}
                  onClick={() => selectEntidad(ent)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected 
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md' 
                      : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/40'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {ent.nombre}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                        {ent.tipo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{ent.contacto || 'Sin contacto'}</div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-bold font-mono ${deuda > 0 ? 'text-rose-400' : deuda < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      ${Math.abs(deuda).toLocaleString('es-AR')} {ent.moneda_principal}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {deuda > 0 ? 'Le debemos' : deuda < 0 ? 'Nos debe' : 'Al día'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalle y Libro de la Cuenta Corriente Seleccionada */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          {selectedEntidad ? (
            <>
              {/* Header de la Ficha */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{selectedEntidad.nombre}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {selectedEntidad.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedEntidad.notas || 'Sin observaciones registradas.'}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Saldo Adeudado</div>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      ${parseFloat(selectedEntidad.saldo_adeudado || 0).toLocaleString('es-AR')} {selectedEntidad.moneda_principal}
                    </div>
                  </div>

                  <button
                    onClick={() => setShowMovModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Pago / Entrega
                  </button>
                </div>
              </div>

              {/* Movimientos de la Cuenta */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-300">Historial de Operaciones</h3>

                {movimientos.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm bg-slate-800/20 rounded-xl border border-slate-800">
                    No hay movimientos registrados para esta cuenta aún.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Tipo</th>
                          <th className="py-2.5 px-3">Concepto / Detalle</th>
                          <th className="py-2.5 px-3 text-right">Monto</th>
                          <th className="py-2.5 px-3 text-right">Saldo Resultante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {movimientos.slice().reverse().map(m => {
                          const isPago = m.tipo === 'PAGO_REALIZADO';
                          return (
                            <tr key={m.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 text-slate-400 text-xs whitespace-nowrap">
                                {new Date(m.fecha).toLocaleDateString('es-AR')}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isPago ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {isPago ? 'Pago Realizado' : 'Entrega / Cargo'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-200 text-xs">
                                {m.concepto}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold font-mono ${isPago ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPago ? '-' : '+'}${m.monto?.toLocaleString('es-AR')} {m.moneda}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-300 text-xs">
                                ${m.saldo_resultante?.toLocaleString('es-AR')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500">Selecciona una cuenta corriente para ver su detalle</div>
          )}
        </div>
      </div>

      {/* Modal Registrar Pago / Entrega CC */}
      {showMovModal && selectedEntidad && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Operación con {selectedEntidad.nombre}</h3>
              <button onClick={() => setShowMovModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateMovimiento} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo de Operación</label>
                <select
                  value={movForm.tipo}
                  onChange={e => setMovForm({ ...movForm, tipo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  <option value="PAGO_REALIZADO">🟢 PAGO REALIZADO (Resta de la deuda)</option>
                  <option value="ENTREGA_EQUIPO">🔴 ENTREGA DE EQUIPO / CARGO (Suma a la deuda)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Concepto / Detalle *</label>
                <input
                  type="text"
                  required
                  value={movForm.concepto}
                  onChange={e => setMovForm({ ...movForm, concepto: e.target.value })}
                  placeholder="ej. Pago efectivo / Entrega 16 Pro Max"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto ({selectedEntidad.moneda_principal}) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={movForm.monto}
                  onChange={e => setMovForm({ ...movForm, monto: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold"
                />
              </div>

              {movForm.tipo === 'PAGO_REALIZADO' && (
                <div className="space-y-2 p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="impactar_caja_cc"
                      checked={movForm.impactar_caja}
                      onChange={e => setMovForm({ ...movForm, impactar_caja: e.target.checked })}
                      className="rounded bg-slate-700 text-indigo-600"
                    />
                    <label htmlFor="impactar_caja_cc" className="text-xs text-slate-300">
                      Descontar dinero automáticamente de una Caja
                    </label>
                  </div>

                  {movForm.impactar_caja && (
                    <select
                      value={movForm.caja_id}
                      onChange={e => setMovForm({ ...movForm, caja_id: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    >
                      <option value="">Seleccionar caja...</option>
                      {cajas.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} (${c.saldo_actual})</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowMovModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl text-sm">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Entidad CC */}
      {showNuevaEntidadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Nueva Cuenta Corriente</h3>
              <button onClick={() => setShowNuevaEntidadModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEntidad} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={entidadForm.nombre}
                  onChange={e => setEntidadForm({ ...entidadForm, nombre: e.target.value })}
                  placeholder="ej. Distribuidora Sur / Juan Pérez"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo</label>
                  <select
                    value={entidadForm.tipo}
                    onChange={e => setEntidadForm({ ...entidadForm, tipo: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="PROVEEDOR">Proveedor</option>
                    <option value="TECNICO">Técnico / Laboratorio</option>
                    <option value="SOCIO">Socio / Colaborador</option>
                    <option value="CLIENTE_FRECUENTE">Cliente Frecuente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Moneda Principal</label>
                  <select
                    value={entidadForm.moneda_principal}
                    onChange={e => setEntidadForm({ ...entidadForm, moneda_principal: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="USD">USD ($ Dólar)</option>
                    <option value="ARS">ARS ($ Pesos)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Saldo Inicial Adeudado</label>
                <input
                  type="number"
                  step="any"
                  value={entidadForm.saldo_inicial}
                  onChange={e => setEntidadForm({ ...entidadForm, saldo_inicial: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Notas / Descripción</label>
                <textarea
                  rows="2"
                  value={entidadForm.notas}
                  onChange={e => setEntidadForm({ ...entidadForm, notas: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowNuevaEntidadModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl text-sm">
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
