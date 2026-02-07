import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PlantManagement = () => {
    const [plants, setPlants] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingPlant, setEditingPlant] = useState(null);
    const [formData, setFormData] = useState({
        location_id: '',
        name: '',
        type: 'Plant',
        latitude: '',
        longitude: '',
        city: ''
    });

    useEffect(() => {
        fetchPlants();
    }, []);

    const fetchPlants = async () => {
        try {
            const response = await api.get('/locations/');
            setPlants(response.data);
        } catch (err) {
            console.error("Error fetching plants", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPlant) {
                await api.put(`/locations/${editingPlant.location_id}`, formData);
            } else {
                await api.post('/locations/', formData);
            }
            setShowModal(false);
            setEditingPlant(null);
            resetForm();
            fetchPlants();
        } catch (err) {
            alert(err.response?.data?.detail || "Operation failed");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this plant?")) {
            try {
                await api.delete(`/locations/${id}`);
                fetchPlants();
            } catch (err) {
                alert("Cannot delete plant. It might be linked to drivers or users.");
            }
        }
    };

    const openEdit = (plant) => {
        setEditingPlant(plant);
        setFormData(plant);
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            location_id: '',
            name: '',
            type: 'Plant',
            latitude: '',
            longitude: '',
            city: ''
        });
    };

    return (
        <div className="management-container">
            <div className="management-header">
                <h3>Plant Inventory</h3>
                <button className="primary" onClick={() => { resetForm(); setEditingPlant(null); setShowModal(true); }}>
                    + Add New Plant
                </button>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>City</th>
                        <th>Coordinates</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {plants.map(p => (
                        <tr key={p.location_id}>
                            <td>{p.location_id}</td>
                            <td>{p.name}</td>
                            <td>{p.type}</td>
                            <td>{p.city}</td>
                            <td>{p.latitude}, {p.longitude}</td>
                            <td className="actions">
                                <button className="btn-small" onClick={() => openEdit(p)}>Edit</button>
                                <button className="btn-small accent" onClick={() => handleDelete(p.location_id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4>{editingPlant ? 'Edit Plant' : 'Add New Plant'}</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Location ID</label>
                                <input 
                                    disabled={!!editingPlant} 
                                    value={formData.location_id} 
                                    onChange={e => setFormData({...formData, location_id: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                        <option value="Plant">Plant</option>
                                        <option value="Warehouse">Warehouse</option>
                                        <option value="Dock">Dock</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>City</label>
                                    <input 
                                        value={formData.city} 
                                        onChange={e => setFormData({...formData, city: e.target.value})} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Latitude</label>
                                    <input 
                                        type="number" step="any" 
                                        value={formData.latitude} 
                                        onChange={e => setFormData({...formData, latitude: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Longitude</label>
                                    <input 
                                        type="number" step="any" 
                                        value={formData.longitude} 
                                        onChange={e => setFormData({...formData, longitude: e.target.value})} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="actions" style={{marginTop: '1.5rem', justifyContent: 'flex-end'}}>
                                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="primary">Save Plant</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlantManagement;
