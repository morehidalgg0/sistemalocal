import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Plus, CheckCircle2, AlertCircle, TrendingUp, Building2 } from 'lucide-react';

export default function GastosFinanzas({ config, onDataChange }) {
  const [gastosFijos, setGastosFijos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [inversiones, setInversiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('FIJOS'); // 'FIJOS', 'DEUDAS', 'INVERSIONES'
  const [showModal, setShowModal] = useState(false);

  const dolarCotiz = parseFloat(config?.dolar_blue || 1480);

  // Form Gastos Fijos
  const [gastoForm, setGastoForm] = useState({
    concepto: '',
    persona_responsable: '',
    monto: '',
    moneda: 'PESOS',
    dia_vencimiento: 10
  });

  // Form Deudas / Deudores
  const [deudaForm, setDeudaForm] = useState({
    tipo: 'DEUDOR', // 'DEUDOR' o 'DEUDA'
    persona: '',
    concepto: '',
    monto_original: '',
    moneda: 'USD'
  });

  // Form Inversiones
  const [invForm, setInvForm] = useState({
    item: '',
    valor_usd: '',
    contacto_proveedor: '',
    categoria: 'Equipamiento'
  });

  useEffect(() => {
    fetchFinanzas();
  }, []);

  const fetchFinanzas = async () => {
    try {
      setLoading(true);
      const [resFijos, resDeudas, resInv] = await Promise.all([
        fetch('/api/gastos-fijos').then(r => r.json()),
        fetch('/api/deudas-deudores').then(r => r.json()),
        fetch('/api/inversiones').then(r => r.json())
      ]);
      setGastosFijos(resFijos || []);
      setDeudas(resDeudas || []);
      setInversiones(resInv || []);
    } catch (err) {
      console.error("Error fetching finanzas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      let endpoint = '/api/gastos-fijos';
      let payload = gastoForm;

      if (activeTab === 'DEUDAS') {
        endpoint = '/api/deudas-deudores';
        payload = deudaForm;
      } else if (activeTab === 'INVERSIONES') {
        endpoint = '/api/inversiones';
        payload = invForm;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        fetchFinanzas();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      console.error("Error guardando registro financiero:", err);
    }
  };

  const toggleGastoPago = (id) => {
    setGastosFijos(prev => prev.map(g => g.id === id ? { ...g, pagado: !g.pagado } : g));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/90 p-6 rounded-2xl border border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-rose-400" />
            Gastos Fijos, Deudas & Inversiones
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Administración de costos operativos del local (alquileres, sueldos, servicios), deudas y capital invertido.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-2 text-sm justify-center"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'FIJOS' ? 'Nuevo Gasto Fijo' : activeTab === 'DEUDAS' ? 'Nuevo Registro Deuda' : 'Nueva Inversión'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('FIJOS')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'FIJOS' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Gastos Fijos Mensuales ({gastosFijos.length})
        </button>
        <button
          onClick={() => setActiveTab('DEUDAS')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'DEUDAS' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Deudores & Deudas ({deudas.length})
        </button>
        <button
          onClick={() => setActiveTab('INVERSIONES')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            activeTab === 'INVERSIONES' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Inversiones de Capital ({inversiones.length})
        </button>
      </div>

      {/* Contenido de la Solapa */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando información financiera...</div>
      ) : activeTab === 'FIJOS' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Presupuesto de Gastos Mensuales</h3>
            <div className="text-xs text-slate-400">
              Total Estimado: <strong className="text-rose-400 font-mono">${gastosFijos.reduce((acc, g) => acc + (g.moneda === 'USD' ? g.monto * dolarCotiz : g.monto), 0).toLocaleString('es-AR')} ARS</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4">Destinatario / Resp.</th>
                  <th className="py-3 px-4 text-center">Vencimiento</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Estado de Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {gastosFijos.map(g => (
                  <tr key={g.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{g.concepto}</td>
                    <td className="py-3 px-4 text-slate-300">{g.persona_responsable || '-'}</td>
                    <td className="py-3 px-4 text-center text-xs text-slate-400">Día {g.dia_vencimiento} de cada mes</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      ${g.monto?.toLocaleString('es-AR')} {g.moneda}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleGastoPago(g.id)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                          g.pagado 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                      >
                        {g.pagado ? '✓ Pagado' : 'Pendiente'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'DEUDAS' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Persona</th>
                  <th className="py-3 px-4">Concepto</th>
                  <th className="py-3 px-4 text-right">Monto Pendiente</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {deudas.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${d.tipo === 'DEUDOR' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {d.tipo === 'DEUDOR' ? 'A Cobrar (Nos deben)' : 'A Pagar (Debemos)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{d.persona}</td>
                    <td className="py-3 px-4 text-slate-300 text-xs">{d.concepto}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      ${d.monto_pendiente?.toLocaleString('es-AR')} {d.moneda}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-400">{d.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Inventario de Bienes de Uso e Inversiones</h3>
            <div className="text-xs text-slate-400">
              Total Invertido: <strong className="text-emerald-400 font-mono">${inversiones.reduce((acc, i) => acc + (parseFloat(i.valor_usd) || 0), 0).toLocaleString('es-AR')} USD</strong>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Bien / Activo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Contacto / Proveedor</th>
                  <th className="py-3 px-4 text-right">Valor USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {inversiones.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{inv.item}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{inv.categoria}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{inv.contacto_proveedor || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ${inv.valor_usd?.toLocaleString('es-AR')} USD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal General */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {activeTab === 'FIJOS' ? 'Nuevo Gasto Fijo' : activeTab === 'DEUDAS' ? 'Nuevo Registro de Deuda' : 'Nueva Inversión'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {activeTab === 'FIJOS' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Concepto *</label>
                    <input
                      type="text"
                      required
                      value={gastoForm.concepto}
                      onChange={e => setGastoForm({ ...gastoForm, concepto: e.target.value })}
                      placeholder="ej. Alquiler / Luz / Contador"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={gastoForm.monto}
                        onChange={e => setGastoForm({ ...gastoForm, monto: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Moneda</label>
                      <select
                        value={gastoForm.moneda}
                        onChange={e => setGastoForm({ ...gastoForm, moneda: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="PESOS">PESOS ($ ARS)</option>
                        <option value="USD">USD ($ Dólar)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'DEUDAS' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo</label>
                    <select
                      value={deudaForm.tipo}
                      onChange={e => setDeudaForm({ ...deudaForm, tipo: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      <option value="DEUDOR">DEUDOR (Persona que nos debe)</option>
                      <option value="DEUDA">DEUDA (Dinero que debemos nosotros)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Persona / Empresa *</label>
                    <input
                      type="text"
                      required
                      value={deudaForm.persona}
                      onChange={e => setDeudaForm({ ...deudaForm, persona: e.target.value })}
                      placeholder="ej. German Falcone / Préstamo Richard"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Monto *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={deudaForm.monto_original}
                        onChange={e => setDeudaForm({ ...deudaForm, monto_original: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Moneda</label>
                      <select
                        value={deudaForm.moneda}
                        onChange={e => setDeudaForm({ ...deudaForm, moneda: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      >
                        <option value="USD">USD ($ Dólar)</option>
                        <option value="PESOS">PESOS ($ ARS)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'INVERSIONES' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nombre del Activo *</label>
                    <input
                      type="text"
                      required
                      value={invForm.item}
                      onChange={e => setInvForm({ ...invForm, item: e.target.value })}
                      placeholder="ej. Contadora de billetes / Starlink"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Valor (USD) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={invForm.valor_usd}
                      onChange={e => setInvForm({ ...invForm, valor_usd: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-400 text-sm">Cancelar</button>
                <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white font-semibold px-5 py-2 rounded-xl text-sm">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
