import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';

const smallIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [14, 22], iconAnchor: [7, 22], popupAnchor: [1, -18], shadowSize: [22, 22]
});

const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30], iconAnchor: [9, 30], popupAnchor: [1, -24], shadowSize: [30, 30]
});

const LocationPicker = ({ onLocationSelect, position }) => {
    useMapEvents({
        click(e) { onLocationSelect(e.latlng); },
    });
    return position ? <Marker position={position} icon={selectedIcon} /> : null;
};

const FlyToLocation = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) map.flyTo([lat, lng], 15, { duration: 1.2 });
    }, [lat, lng, map]);
    return null;
};

const PlantManagement = () => {
    const [plants, setPlants] = useState([]);
    const [plantStats, setPlantStats] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingPlant, setEditingPlant] = useState(null);
    const [formData, setFormData] = useState({
        location_id: '', name: '', type: 'Plant', latitude: '', longitude: '', city: ''
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchTimeout = useRef(null);

    const fetchPlants = async () => {
        try { const r = await api.get('/locations/'); setPlants(r.data); }
        catch { console.error("Error fetching plants"); }
    };
    const fetchStats = async () => {
        try { const r = await api.get('/locations/stats'); setPlantStats(r.data); }
        catch { console.error("Error fetching stats"); }
    };

    useEffect(() => { fetchPlants(); fetchStats(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPlant) await api.put(`/locations/${editingPlant.location_id}`, formData);
            else await api.post('/locations/', formData);
            setShowModal(false); setEditingPlant(null); resetForm(); fetchPlants(); fetchStats();
        } catch (err) { alert(err.response?.data?.detail || "Operation failed"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this plant?")) return;
        try { await api.delete(`/locations/${id}`); fetchPlants(); fetchStats(); }
        catch { alert("Cannot delete plant. It might be linked to drivers or users."); }
    };

    const openEdit = (plant) => { setEditingPlant(plant); setFormData(plant); setShowModal(true); };

    const resetForm = () => {
        setFormData({ location_id: '', name: '', type: 'Plant', latitude: '', longitude: '', city: '' });
        setSearchQuery(''); setSearchResults([]);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (query.length < 3) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            try {
                const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`);
                const data = await r.json();
                setSearchResults(data.map(d => ({
                    name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon)
                })));
            } catch { setSearchResults([]); }
        }, 400);
    };

    const selectSearchResult = (result) => {
        setFormData({
            ...formData,
            latitude: result.lat.toFixed(6),
            longitude: result.lng.toFixed(6),
        });
        setSearchResults([]); setSearchQuery('');
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Plant': return '#8b5cf6';
            case 'Warehouse': return '#2563eb';
            case 'Dock': return '#0891b2';
            default: return '#64748b';
        }
    };

    const displayData = plantStats.length > 0 ? plantStats : plants.map(p => ({ ...p, vehicles: '-', drivers: '-' }));

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
                        <th>ID</th><th>Name</th><th>Type</th><th>City</th>
                        <th>Vehicles</th><th>Drivers</th><th>Coordinates</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {displayData.map(p => (
                        <tr key={p.location_id}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.location_id}</span></td>
                            <td><strong>{p.name}</strong></td>
                            <td>
                                <span style={{
                                    background: getTypeColor(p.type) + '18', color: getTypeColor(p.type),
                                    padding: '3px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600,
                                }}>{p.type}</span>
                            </td>
                            <td>{p.city}</td>
                            <td>
                                <span style={{
                                    background: '#eff6ff', color: '#2563eb',
                                    padding: '3px 10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
                                }}>{p.vehicles}</span>
                            </td>
                            <td>
                                <span style={{
                                    background: '#f0fdf4', color: '#166534',
                                    padding: '3px 10px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600,
                                }}>{p.drivers}</span>
                            </td>
                            <td style={{ fontSize: '0.82rem', color: '#64748b', fontFamily: 'monospace' }}>
                                {p.latitude}, {p.longitude}
                            </td>
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
                    <div className="modal-content" style={{ maxWidth: '620px' }}>
                        <h4>{editingPlant ? 'Edit Plant' : 'Add New Plant'}</h4>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Location ID</label>
                                <input disabled={!!editingPlant} value={formData.location_id}
                                    onChange={e => setFormData({...formData, location_id: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Name</label>
                                <input value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})} required />
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
                                    <input value={formData.city}
                                        onChange={e => setFormData({...formData, city: e.target.value})} required />
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label>Search Location</label>
                                <input type="text" placeholder="Search... e.g. 'ABC Plant Chakan Pune'"
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    style={{ background: '#fafbfc' }} />
                                {searchResults.length > 0 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                                        border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 1000,
                                        boxShadow: '0 8px 20px rgba(0,0,0,0.1)', maxHeight: '180px', overflowY: 'auto',
                                    }}>
                                        {searchResults.map((r, i) => (
                                            <div key={i} onClick={() => selectSearchResult(r)} style={{
                                                padding: '8px 12px', cursor: 'pointer', fontSize: '0.82rem',
                                                borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '6px',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>●</span> {r.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <small style={{ color: '#64748b' }}>Type to search or click on the map below</small>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label>Select Location on Map</label>
                                <div style={{ height: '250px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                    <MapContainer
                                        center={formData.latitude && formData.longitude
                                            ? [parseFloat(formData.latitude), parseFloat(formData.longitude)]
                                            : [18.5204, 73.8567]}
                                        zoom={13} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <LocationPicker
                                            position={formData.latitude && formData.longitude
                                                ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : null}
                                            onLocationSelect={(latlng) => {
                                                setFormData({ ...formData, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6) });
                                            }} />
                                        {formData.latitude && formData.longitude && (
                                            <FlyToLocation lat={parseFloat(formData.latitude)} lng={parseFloat(formData.longitude)} />
                                        )}
                                        {/* Show search results as small markers */}
                                        {searchResults.map((r, i) => (
                                            <Marker key={`sr-${i}`} position={[r.lat, r.lng]} icon={smallIcon}
                                                eventHandlers={{ click: () => selectSearchResult(r) }}>
                                                <Popup><small>{r.name}</small></Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Latitude</label>
                                    <input type="number" step="any" value={formData.latitude}
                                        onChange={e => setFormData({...formData, latitude: e.target.value})} required />
                                </div>
                                <div className="form-group">
                                    <label>Longitude</label>
                                    <input type="number" step="any" value={formData.longitude}
                                        onChange={e => setFormData({...formData, longitude: e.target.value})} required />
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
