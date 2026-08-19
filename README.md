# Sistema Integral de Gestión para Local Comercial (Dispositivos, Taller y Finanzas)

Sistema desarrollado a medida para reemplazar y optimizar las planillas de cálculo del local (New Point), integrando:
- **Base de Datos**: PostgreSQL (con esquema SQL estructurado en `server/src/db/schema.sql` y soporte integrado con fallback persistente).
- **Backend**: Node.js / Express API REST.
- **Frontend**: React + Vite + Tailwind CSS + Lucide Icons.

---

## 🚀 Cómo Iniciar el Sistema en Desarrollo

### 1. Iniciar el Servidor Backend:
```bash
cd server
npm start
```
El servidor correrá en `http://localhost:5005`

### 2. Iniciar el Frontend (App Web):
```bash
cd client
npm run dev
```
La aplicación abrirá en `http://localhost:3000`

---

## 📱 Módulos Incluidos

1. **Panel General (Dashboard)**:
   - Capital Total Activo (Stock Celulares + Accesorios + Cajas Líquidas en USD/ARS).
   - Ganancia Neta Real del mes y promedio por equipo.
   - Cotización del Dólar Blue en tiempo real.
   - Deudores pendientes de cobro y Deuda con proveedores.

2. **Facturación & Ventas**:
   - Venta ágil de celulares y accesorios.
   - Descuento automático de stock de equipos.
   - Cálculo en vivo de: Costo Base + Reparaciones + Descuentos/Regalos = Ganancia Neta ($ y USD).
   - Comisiones por vendedor (NP, Eze, Mardel, Fran, etc.).
   - Impacto directo en Caja seleccionada (USD, Pesos, Lemon, Banco).

3. **Stock de Celulares**:
   - Inventario detallado por IMEI / Serie, Condición (Nuevo/Usado), Batería %, Color y Capacidad.
   - Vinculación directa con Proveedor y Cuenta Corriente.
   - Estados: *En Stock*, *Señado*, *En Taller*, *Vendido*.

4. **Accesorios & Repuestos**:
   - Control de cables, cargadores 20W, fundas MagSafe, vidrios templados, baterías de repuesto y tapas láser.
   - Alertas de stock mínimo.

5. **Servicio Técnico & Taller**:
   - Órdenes de reparación con seguimiento de falla, repuesto utilizado y mano de obra.
   - Asignación de técnicos (Rosario Técnica, Apple Becker, Huevo y Alegre, Taller propio).
   - Estados de orden: *En Taller*, *Listo para Retirar*, *Entregado y Cobrado*.

6. **Cajas & Bancos Multidivisa**:
   - Arqueo de Caja Fuerte USD, Caja Fuerte Pesos, Lemon Cash, Banco y Cara Chica.
   - Operaciones de cambio de divisas (Compra/Venta de USD contra Pesos con cotización).

7. **Cuentas Corrientes (CC)**:
   - Fichas individuales con balance en tiempo real para Proveedores (Garden, Lucas Moroni, Víctor Díaz), Técnicos y Socios (Eze, Fran, Ema).
   - Registro de entregas y pagos parciales con descuento automático de saldo.

8. **Gastos Fijos & Finanzas**:
   - Control mensual de alquileres, sueldos, servicios, internet Starlink y contador.
   - Registro de Deudores (cobros pendientes) y Deudas.
   - Registro de Inversiones de capital del local.
