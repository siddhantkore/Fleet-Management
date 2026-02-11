import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DriverManagement = () => {
    const [drivers, setDrivers] = useState([]);
    const [plants, setPlants] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingDriver, setEditingDriver] = useState(null);
    const [formData, setFormData] = useState({
        driver_id: '',
        name: '',
        license_no: '',
        license_expiry: '',
        phone: '',
        home_plant_id: '',
        status: 'Active'
    });

    const fetchDrivers = async () => {
        try {
            const response = await api.get('/drivers/');
            setDrivers(response.data);
        } catch {
            console.error("Error fetching drivers");
        }
    };

    const fetchPlants = async () => {
        try {
            const response = await api.get('/locations/');
            setPlants(response.data);
        } catch {
            console.error("Error fetching plants");
        }
    };

     
    useEffect(() => {
        const loadData = async () => {
            await fetchDrivers();
            await fetchPlants();
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingDriver) {
                await api.put(`/drivers/${editingDriver.driver_id}`, formData);
            } else {
                await api.post('/drivers/', formData);
            }
            setShowModal(false);
            setEditingDriver(null);
            resetForm();
            fetchDrivers();
        } catch (err) {
            alert(err.response?.data?.detail || "Operation failed");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this driver?")) {
            try {
                await api.delete(`/drivers/${id}`);
                fetchDrivers();
            } catch {
                alert("Cannot delete driver.");
            }
        }
    };

    const openEdit = (driver) => {
        setEditingDriver(driver);
        setFormData(driver);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            driver_id: '',
            name: '',
            license_no: '',
            license_expiry: '',
            phone: '',
            home_plant_id: plants[0]?.location_id || '',
            status: 'Active'
        });
    };

    return (
        <div className="management-container">
            <div className="management-header">
                <h3>Driver Personnel</h3>
                <button className="primary" onClick={() => { resetForm(); setEditingDriver(null); setShowModal(true); }}>
                    + Register Driver
                </button>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Driver ID</th>
                        <th>Name</th>
                        <th>Plant</th>
                        <th>Phone</th>
                        <th>License Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {drivers.map(d => (
                        <tr key={d.driver_id}>
                            <td>{d.driver_id}</td>
                            <td>{d.name}</td>
                            <td>{d.home_plant_id}</td>
                            <td>{d.phone}</td>
                            <td>{d.license_expiry} ({d.status})</td>
                            <td className="actions">
                                <button className="btn-small" onClick={() => openEdit(d)}>Edit</button>
                                <button className="btn-small accent" onClick={() => handleDelete(d.driver_id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>{editingDriver ? 'Edit Driver Info' : 'Register New Driver'}</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Driver ID</label>
                                <input 
                                    disabled={!!editingDriver} 
                                    value={formData.driver_id} 
                                    onChange={e => setFormData({...formData, driver_id: e.target.value})} 
                                    required 
                                    placeholder="D001"
                                />
                            </div>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>License No</label>
                                    <input 
                                        value={formData.license_no} 
                                        onChange={e => setFormData({...formData, license_no: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>License Expiry</label>
                                    <input 
                                        type="date"
                                        value={formData.license_expiry} 
                                        onChange={e => setFormData({...formData, license_expiry: e.target.value})} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input 
                                        value={formData.phone} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Home Plant</label>
                                    <select 
                                        value={formData.home_plant_id} 
                                        onChange={e => setFormData({...formData, home_plant_id: e.target.value})}
                                        required
                                    >
                                        <option value="">Select Plant</option>
                                        {plants.map(p => (
                                            <option key={p.location_id} value={p.location_id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Status</label>
                                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="On Leave">On Leave</option>
                                </select>
                            </div>
                            <div className="actions" style={{marginTop: '1.5rem', justifyContent: 'flex-end'}}>
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="primary">Save Driver</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverManagement;
