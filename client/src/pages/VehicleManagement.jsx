import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './VehicleManagement.css';

const VEHICLE_TYPES = ['Truck', 'Mini Truck', 'Trailer', 'Tanker', 'Pickup', 'Container', 'Flatbed'];
const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric'];
const DEFAULT_CARGO = ['General', 'Iron/Steel', 'Cotton/Textile', 'Electronics', 'Chemicals',
    'Food/Perishable', 'Construction Material', 'Machinery/Equipment', 'Automotive Parts', 'Pharmaceuticals'];

const VehicleManagement = () => {
    const [vehicles, setVehicles] = useState([]);
    const [plants, setPlants] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [formData, setFormData] = useState({
        vehicle_id: '', type: 'Truck', plant_loc_id: '', capacity_kg: '',
        volume_cbm: '', fuel_type: 'Diesel', cost_per_km: '', license_plate: '',
        mileage_kmpl: '8', odometer_km: '0', max_density_kg_cbm: '',
        suitable_cargo_types: 'General',
    });

    useEffect(() => {
        fetchVehicles();
        fetchPlants();
    }, []);

    const fetchVehicles = async () => {
        try { const r = await api.get('/vehicles/'); setVehicles(r.data); }
        catch { console.error("Error fetching vehicles"); }
    };
    const fetchPlants = async () => {
        try { const r = await api.get('/locations/'); setPlants(r.data); }
        catch { console.error("Error fetching plants"); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            capacity_kg: parseFloat(formData.capacity_kg),
            volume_cbm: parseFloat(formData.volume_cbm),
            cost_per_km: parseFloat(formData.cost_per_km),
            mileage_kmpl: parseFloat(formData.mileage_kmpl) || 8,
            odometer_km: parseInt(formData.odometer_km) || 0,
            max_density_kg_cbm: formData.max_density_kg_cbm ? parseFloat(formData.max_density_kg_cbm) : null,
        };
        try {
            if (editingVehicle) {
                await api.put(`/vehicles/${editingVehicle.vehicle_id}`, payload);
            } else {
                await api.post('/vehicles/', payload);
            }
            setShowModal(false); setEditingVehicle(null); resetForm(); fetchVehicles();
        } catch (err) { alert(err.response?.data?.detail || "Operation failed"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this vehicle?")) return;
        try { await api.delete(`/vehicles/${id}`); fetchVehicles(); }
        catch (err) { alert(err.response?.data?.detail || "Cannot delete vehicle"); }
    };

    const openEdit = (v) => {
        setEditingVehicle(v);
        setFormData({
            vehicle_id: v.vehicle_id, type: v.type, plant_loc_id: v.plant_loc_id,
            capacity_kg: String(v.capacity_kg), volume_cbm: String(v.volume_cbm),
            fuel_type: v.fuel_type, cost_per_km: String(v.cost_per_km),
            license_plate: v.license_plate, mileage_kmpl: String(v.mileage_kmpl || 8),
            odometer_km: String(v.odometer_km || 0),
            max_density_kg_cbm: v.max_density_kg_cbm ? String(v.max_density_kg_cbm) : '',
            suitable_cargo_types: v.suitable_cargo_types || 'General',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            vehicle_id: '', type: 'Truck', plant_loc_id: plants[0]?.location_id || '',
            capacity_kg: '', volume_cbm: '', fuel_type: 'Diesel', cost_per_km: '',
            license_plate: '', mileage_kmpl: '8', odometer_km: '0', max_density_kg_cbm: '',
            suitable_cargo_types: 'General',
        });
    };

    const getStatusIndicator = (status) => {
        const colors = { Available: '#22c55e', Assigned: '#f59e0b', 'On-Trip': '#3b82f6', Maintenance: '#ef4444' };
        return <span className="vm-status-dot" style={{ background: colors[status] || '#94a3b8' }}></span>;
    };

    const getPlantName = (id) => plants.find(p => p.location_id === id)?.name || id;

    const handleCargoToggle = (cargo) => {
        const current = formData.suitable_cargo_types.split(',').map(s => s.trim()).filter(Boolean);
        if (current.includes(cargo)) {
            setFormData({ ...formData, suitable_cargo_types: current.filter(c => c !== cargo).join(',') || 'General' });
        } else {
            setFormData({ ...formData, suitable_cargo_types: [...current, cargo].join(',') });
        }
    };

    return (
        <div className="vehicle-management">
            <div className="management-header">
                <h3>Vehicle Fleet</h3>
                <button className="primary" onClick={() => { resetForm(); setEditingVehicle(null); setShowModal(true); }}>
                    + Add Vehicle
                </button>
            </div>

            <div className="vm-stats-row">
                <div className="vm-stat-card">
                    <span className="vm-stat-num">{vehicles.length}</span>
                    <span className="vm-stat-label">Total</span>
                </div>
                <div className="vm-stat-card">
                    <span className="vm-stat-num available">{vehicles.filter(v => v.current_status === 'Available').length}</span>
                    <span className="vm-stat-label">Available</span>
                </div>
                <div className="vm-stat-card">
                    <span className="vm-stat-num assigned">{vehicles.filter(v => v.current_status === 'Assigned').length}</span>
                    <span className="vm-stat-label">Assigned</span>
                </div>
                <div className="vm-stat-card">
                    <span className="vm-stat-num on-trip">{vehicles.filter(v => v.current_status === 'On-Trip').length}</span>
                    <span className="vm-stat-label">On Trip</span>
                </div>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Vehicle</th>
                        <th>Type</th>
                        <th>Plant</th>
                        <th>Capacity</th>
                        <th>Fuel</th>
                        <th>Mileage</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {vehicles.map(v => (
                        <tr key={v.vehicle_id}>
                            <td>
                                <div className="vm-id-cell">
                                    <strong>{v.vehicle_id}</strong>
                                    <span className="vm-plate">{v.license_plate}</span>
                                </div>
                            </td>
                            <td><span className="vm-type-badge">{v.type}</span></td>
                            <td>{getPlantName(v.plant_loc_id)}</td>
                            <td>{v.capacity_kg} kg</td>
                            <td><span className={`vm-fuel-badge ${v.fuel_type.toLowerCase()}`}>{v.fuel_type}</span></td>
                            <td>{v.mileage_kmpl || '-'} km/l</td>
                            <td>{getStatusIndicator(v.current_status)} {v.current_status}</td>
                            <td className="actions">
                                <button className="btn-small" onClick={() => openEdit(v)}>Edit</button>
                                <button className="btn-small accent" onClick={() => handleDelete(v.vehicle_id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    {vehicles.length === 0 && (
                        <tr><td colSpan="8" className="no-data">No vehicles registered yet.</td></tr>
                    )}
                </tbody>
            </table>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '650px' }}>
                        <h4>{editingVehicle ? 'Edit Vehicle' : 'Register New Vehicle'}</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Vehicle ID</label>
                                    <input disabled={!!editingVehicle} value={formData.vehicle_id}
                                        onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                        required placeholder="VH-001" />
                                </div>
                                <div className="form-group">
                                    <label>License Plate</label>
                                    <input value={formData.license_plate}
                                        onChange={e => setFormData({ ...formData, license_plate: e.target.value })}
                                        required placeholder="MH12AB1234" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Home Plant</label>
                                    <select value={formData.plant_loc_id} onChange={e => setFormData({ ...formData, plant_loc_id: e.target.value })} required>
                                        <option value="">Select Plant</option>
                                        {plants.map(p => <option key={p.location_id} value={p.location_id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Capacity (kg)</label>
                                    <input type="number" value={formData.capacity_kg}
                                        onChange={e => setFormData({ ...formData, capacity_kg: e.target.value })}
                                        required placeholder="10000" />
                                </div>
                                <div className="form-group">
                                    <label>Volume (m³)</label>
                                    <input type="number" step="0.1" value={formData.volume_cbm}
                                        onChange={e => setFormData({ ...formData, volume_cbm: e.target.value })}
                                        required placeholder="40" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fuel Type</label>
                                    <select value={formData.fuel_type} onChange={e => setFormData({ ...formData, fuel_type: e.target.value })}>
                                        {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Cost per km (₹)</label>
                                    <input type="number" step="0.5" value={formData.cost_per_km}
                                        onChange={e => setFormData({ ...formData, cost_per_km: e.target.value })}
                                        required placeholder="45" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mileage (km/l)</label>
                                    <input type="number" step="0.1" value={formData.mileage_kmpl}
                                        onChange={e => setFormData({ ...formData, mileage_kmpl: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Odometer (km)</label>
                                    <input type="number" value={formData.odometer_km}
                                        onChange={e => setFormData({ ...formData, odometer_km: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Max Density (kg/m³) <small style={{ color: '#94a3b8' }}>— optional</small></label>
                                <input type="number" step="0.1" value={formData.max_density_kg_cbm}
                                    onChange={e => setFormData({ ...formData, max_density_kg_cbm: e.target.value })}
                                    placeholder="e.g. 500" />
                            </div>
                            <div className="form-group">
                                <label>Suitable Cargo Types</label>
                                <div className="vm-cargo-chips">
                                    {DEFAULT_CARGO.map(c => {
                                        const selected = formData.suitable_cargo_types.split(',').map(s => s.trim()).includes(c);
                                        return (
                                            <button key={c} type="button" className={`vm-chip ${selected ? 'active' : ''}`}
                                                onClick={() => handleCargoToggle(c)}>
                                                {c}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="primary">Save Vehicle</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleManagement;
