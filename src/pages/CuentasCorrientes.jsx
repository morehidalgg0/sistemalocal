import fallbackData from "../data/fallbackData";
import React, { useState, useEffect } from 'react';
import { Users, Plus, ArrowUpRight, ArrowDownRight, CreditCard, ChevronRight, DollarSign, Pencil, Trash2, Smartphone, Search } from 'lucide-react';

export default function CuentasCorrientes({ config, onDataChange }) {
  const [entidades, setEntidades] = useState([]);
  const [selectedEntidad, setSelectedEntidad] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEntidadModal, setShowEntidadModal] = useState(false);
  const [editandoEntidad, setEditandoEntidad] = useState(null);
  const [showMovModal, setShowMovModal] = useState(false);
  const [busquedaEntidad, setBusquedaEntidad] = useState('');
  const [busquedaMov, setBusquedaMov] = useState('');
  const [ordenMov, setOrdenMov] = useState('carga'); // 'carga' | 'reciente'

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

  const openNuevaEntidad = () => {
    setEditandoEntidad(null);
    setEntidadForm({ nombre: '', tipo: 'PROVEEDOR', contacto: '', moneda_principal: 'USD', saldo_inicial: '0', notas: '' });
    setShowEntidadModal(true);
  };

  const openEditEntidad = (ent) => {
    setEditandoEntidad(ent);
    setEntidadForm({
      nombre: ent.nombre,
      tipo: ent.tipo || 'PROVEEDOR',
      contacto: ent.contacto || '',
      moneda_principal: ent.moneda_principal || 'USD',
      saldo_inicial: String(ent.saldo_adeudado ?? 0),
      notas: ent.notas || ''
    });
    setShowEntidadModal(true);
  };

  const handleSaveEntidad = async (e) => {
    e.preventDefault();
    const isEdit = !!editandoEntidad;
    try {
      const payload = {
        ...entidadForm,
        ...(isEdit ? { saldo_adeudado: entidadForm.saldo_inicial } : {})
      };
      const res = await fetch(isEdit ? `/api/cuentas-corrientes/${editandoEntidad.id}` : '/api/cuentas-corrientes', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        setShowEntidadModal(false);
        setEditandoEntidad(null);
        if (saved && saved.entidad) {
          setSelectedEntidad(saved.entidad);
          selectEntidad(saved.entidad);
        } else {
          fetchEntidades();
        }
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error guardando entidad CC:", err);
    }
  };

  const handleDeleteEntidad = async () => {
    if (!editandoEntidad) return;
    const ok = window.confirm(`¿Eliminar la cuenta "${editandoEntidad.nombre}"?\n\nSe borran para siempre la cuenta y todos sus movimientos. Esta acción no se puede deshacer.`);
    if (!ok) return;
    const id = editandoEntidad.id;
    try {
      const res = await fetch(`/api/cuentas-corrientes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowEntidadModal(false);
        setEditandoEntidad(null);
        if (selectedEntidad?.id === id) setSelectedEntidad(null);
        fetchEntidades();
        if (onDataChange) onDataChange();
        alert('Cuenta eliminada.');
      } else {
        alert('No se pudo eliminar la cuenta.');
      }
    } catch (err) {
      console.error("Error eliminando entidad CC:", err);
      alert('No se pudo eliminar la cuenta.');
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

  // Filtros de búsqueda
  const qEnt = busquedaEntidad.trim().toLowerCase();
  const entidadesFiltradas = entidades.filter(e =>
    !qEnt ||
    (e.nombre || '').toLowerCase().includes(qEnt) ||
    (e.contacto || '').toLowerCase().includes(qEnt) ||
    (e.tipo || '').toLowerCase().includes(qEnt)
  );

  const qMov = busquedaMov.trim().toLowerCase();
  const filtradosMov = (movimientos || []).filter(m => !qMov || (m.concepto || '').toLowerCase().includes(qMov));
  const movsVisibles = ordenMov === 'reciente'
    ? [...filtradosMov].sort((a, b) => b.id - a.id)
    : [...filtradosMov].reverse();

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
          onClick={openNuevaEntidad}
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
            Cuentas Registradas ({entidadesFiltradas.length})
          </div>

          <div className="relative px-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={busquedaEntidad}
              onChange={e => setBusquedaEntidad(e.target.value)}
              placeholder="Buscar cuenta, contacto o tipo..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            {entidadesFiltradas.map(ent => {
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
                    onClick={() => openEditEntidad(selectedEntidad)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2 text-sm"
                    title="Editar cuenta"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar cuenta
                  </button>

                  <button
                    onClick={() => setShowMovModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Pago / Ingresar Equipo
                  </button>
                </div>
              </div>

              {/* Movimientos de la Cuenta */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-300">Detalle de Equipos / Operaciones</h3>
                  {movimientos.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      Total en esta cuenta: <span className="text-slate-300 font-semibold">${parseFloat(selectedEntidad.saldo_adeudado || 0).toLocaleString('es-AR')} {selectedEntidad.moneda_principal}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={busquedaMov}
                      onChange={e => setBusquedaMov(e.target.value)}
                      placeholder="Buscar equipo, fecha u operación..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={ordenMov}
                    onChange={e => setOrdenMov(e.target.value)}
                    title="Ordenar por"
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="carga">Orden de carga</option>
                    <option value="reciente">Añadido recientemente</option>
                  </select>
                </div>

                {movimientos.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm bg-slate-800/20 rounded-xl border border-slate-800">
                    No hay equipos ni operaciones registradas para esta cuenta aún.
                  </div>
                ) : movsVisibles.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm bg-slate-800/20 rounded-xl border border-slate-800">
                    No se encontraron resultados para "{busquedaMov.trim()}".
                  </div>
                ) : (
                  <div className="space-y-2">
                    {movsVisibles.map(m => {
                      const esCargo = m.tipo === 'ENTREGA_EQUIPO' || m.tipo === 'SERVICIO_TECNICO';
                      const esEquipo = m.tipo === 'ENTREGA_EQUIPO';
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition ${
                            esCargo
                              ? 'bg-slate-800/30 border-slate-800 hover:border-sky-600/40'
                              : 'bg-emerald-500/5 border-slate-800 hover:border-emerald-500/40'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${esCargo ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {esEquipo ? <Smartphone className="w-4 h-4" /> : (esCargo ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] text-slate-500">{m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR') : '—'}</span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${esCargo ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                  {esEquipo ? 'Entrega de Equipo' : esCargo ? 'Servicio / Cargo' : 'Pago Realizado'}
                                </span>
                              </div>
                              <div className={`font-semibold text-sm text-white truncate mt-0.5 ${esEquipo ? 'flex items-center gap-1.5' : ''}`}>
                                {esEquipo && <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                                <span>{m.concepto}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1">
                                Saldo resultante: <span className="font-mono text-slate-400">${m.saldo_resultante?.toLocaleString('es-AR')} {m.moneda}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`text-right shrink-0 font-bold font-mono ${esCargo ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {esCargo ? '+' : '-'}${m.monto?.toLocaleString('es-AR')}
                            <span className="block text-[10px] font-sans font-normal text-slate-500">{m.moneda}</span>
                          </div>
                        </div>
                      );
                    })}
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
                  <option value="PAGO_REALIZADO">🟢 PAGO (Resta de la deuda)</option>
                  <option value="ENTREGA_EQUIPO">🔴 INGRESA EQUIPO (Suma a la deuda)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Concepto / Detalle *</label>
                <input
                  type="text"
                  required
                  value={movForm.concepto}
                  onChange={e => setMovForm({ ...movForm, concepto: e.target.value })}
                  placeholder={movForm.tipo === 'ENTREGA_EQUIPO' ? 'ej. iPhone 15 Pro 256GB (IMEI: 123456)' : 'ej. Pago efectivo'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              {movForm.tipo === 'ENTREGA_EQUIPO' && (
                <div className="text-[11px] text-sky-400/90 bg-sky-500/5 border border-sky-600/20 rounded-lg px-3 py-2">
                  El monto de este equipo se <b>suma automáticamente</b> al total de la cuenta corriente.
                </div>
              )}

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
      {showEntidadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{editandoEntidad ? 'Editar Cuenta Corriente' : 'Nueva Cuenta Corriente'}</h3>
              <button onClick={() => setShowEntidadModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveEntidad} className="space-y-4">
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
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                {editandoEntidad ? 'Saldo Adeudado Actual' : 'Saldo Inicial Adeudado'}
              </label>
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

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                {editandoEntidad ? (
                  <button
                    type="button"
                    onClick={handleDeleteEntidad}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar cuenta
                  </button>
                ) : <span />}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowEntidadModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2 rounded-xl text-sm">
                    {editandoEntidad ? 'Guardar Cambios' : 'Crear Cuenta'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
