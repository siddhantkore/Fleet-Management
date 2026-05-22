import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import './TripManagement.css';

// Plant icon for map
const plantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Custom point icon
const customIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const DEFAULT_CARGO_CATEGORIES = [
    'General', 'Iron/Steel', 'Cotton/Textile', 'Electronics',
    'Chemicals', 'Food/Perishable', 'Construction Material',
    'Machinery/Equipment', 'Automotive Parts', 'Pharmaceuticals'
];

const SelectionMap = ({ plants, onPointSelect, selectedFrom, selectedTo, routes }) => {
    useMapEvents({
        click(e) {
            onPointSelect(e.latlng);
        },
    });

    return (
        <>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {plants.map(plant => (
                <Marker
                    key={plant.location_id}
                    position={[plant.latitude, plant.longitude]}
                    icon={plantIcon}
                    eventHandlers={{
                        click: (e) => {
                            L.DomEvent.stopPropagation(e);
                            onPointSelect({ lat: plant.latitude, lng: plant.longitude, id: plant.location_id });
                        },
                    }}
                >
                    <Popup>{plant.name}</Popup>
                </Marker>
            ))}
            {selectedFrom && typeof selectedFrom === 'object' && selectedFrom.lat && (
                <Marker position={[selectedFrom.lat, selectedFrom.lng]} icon={customIcon}>
                    <Popup>Start Point</Popup>
                </Marker>
            )}
            {selectedTo && typeof selectedTo === 'object' && selectedTo.lat && (
                <Marker position={[selectedTo.lat, selectedTo.lng]} icon={customIcon}>
                    <Popup>End Point</Popup>
                </Marker>
            )}
            {/* Route polylines: red for alternatives, green for selected */}
            {routes && routes.map((route, idx) => {
                const coords = route.geometry_coords?.map(c => [c[1], c[0]]) || [];
                if (coords.length < 2) return null;
                return (
                    <Polyline
                        key={`route-${idx}`}
                        positions={coords}
                        pathOptions={{
                            color: route.is_selected ? '#22c55e' : '#ef4444',
                            weight: route.is_selected ? 5 : 3,
                            opacity: route.is_selected ? 0.9 : 0.5,
                            dashArray: route.is_selected ? null : '10 6',
                        }}
                    >
                        <Popup>
                            <div>
                                <strong>{route.is_selected ? '✅ Selected Route' : `⬜ Alternative ${route.index + 1}`}</strong><br />
                                Distance: {route.distance_km} km<br />
                                Duration: {route.duration_minutes?.toFixed(0)} min<br />
                                Score: {route.score}
                            </div>
                        </Popup>
                    </Polyline>
                );
            })}
        </>
    );
};

const TripManagement = () => {
    const [trips, setTrips] = useState([]);
    const [plants, setPlants] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectionMode, setSelectionMode] = useState(null);
    const [cargoCategories, setCargoCategories] = useState(DEFAULT_CARGO_CATEGORIES);
    const [formData, setFormData] = useState({
        from_loc: '',
        to_loc: '',
        start_time: '',
        end_time: '',
        cargo_weight: 0,
        cargo_volume_cbm: 0,
        cargo_type: 'General',
        optimize: true
    });
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [routeData, setRouteData] = useState(null);

    useEffect(() => {
        fetchTrips();
        fetchPlants();
        fetchCargoCategories();
    }, []);

    const fetchTrips = async () => {
        try {
            const response = await api.get('/trips');
            const sortedTrips = response.data.sort((a, b) => {
                const statusOrder = { 'In-Transit': 0, 'Planned': 1, 'Completed': 2, 'Cancelled': 3 };
                return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
            });
            setTrips(sortedTrips);
        } catch (error) {
            console.error('Error fetching trips:', error);
        }
    };

    const fetchCargoCategories = async () => {
        try {
            const response = await api.get('/analysis/cargo-categories');
            if (response.data.categories) {
                setCargoCategories(response.data.categories);
            }
        } catch {
            // Use defaults
        }
    };

    const handleStartTrip = async (trip_id) => {
        try {
            await api.post(`/trips/${trip_id}/start`);
            fetchTrips();
        } catch {
            alert('Failed to start trip');
        }
    };

    const handleCompleteTrip = async (trip_id) => {
        try {
            await api.post(`/trips/${trip_id}/complete`);
            fetchTrips();
        } catch {
            alert('Failed to complete trip');
        }
    };

    const fetchPlants = async () => {
        try {
            const response = await api.get('/locations');
            setPlants(response.data);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handlePointSelect = (point) => {
        const value = point.id || `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
        if (selectionMode === 'from') {
            setFormData({ ...formData, from_loc: value });
        } else if (selectionMode === 'to') {
            setFormData({ ...formData, to_loc: value });
        }
        setSelectionMode(null);
    };

    const handleScheduleTrip = async (e) => {
        e.preventDefault();
        setLoading(true);
        setOptimizationResult(null);
        setRouteData(null);
        try {
            const payload = {
                ...formData,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
                cargo_weight: parseFloat(formData.cargo_weight),
                cargo_volume_cbm: parseFloat(formData.cargo_volume_cbm) || 0,
            };
            const response = await api.post('/trips/schedule', payload);
            setOptimizationResult(response.data);

            // Parse route data for map display
            if (response.data.route_data) {
                try {
                    const parsed = JSON.parse(response.data.route_data);
                    setRouteData(parsed);
                } catch { /* ignore parse errors */ }
            }
            fetchTrips();
        } catch (error) {
            console.error('Error scheduling trip:', error);
            alert(error.response?.data?.detail || 'Failed to schedule trip');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Planned': return '#3498db';
            case 'In-Transit': return '#f1c40f';
            case 'Completed': return '#2ecc71';
            case 'Cancelled': return '#e74c3c';
            default: return '#7f8c8d';
        }
    };

    const parseCoords = (val) => {
        if (!val) return null;
        const p = plants.find(pl => pl.location_id === val);
        if (p) return { lat: p.latitude, lng: p.longitude };
        if (val.includes(',')) {
            const [lat, lng] = val.split(',').map(Number);
            return { lat, lng };
        }
        return null;
    };

    return (
        <div className="trip-management">
            <div className="header-actions">
                <button
                    className="add-btn"
                    onClick={() => { setShowForm(!showForm); setOptimizationResult(null); setRouteData(null); }}
                >
                    {showForm ? 'Cancel' : 'Schedule New Trip'}
                </button>
            </div>

            {showForm && (
                <div className="trip-form-container card">
                    <h3>Schedule Trip</h3>
                    <div className="scheduling-grid">
                        <form onSubmit={handleScheduleTrip} className="trip-form">
                            <div className="form-group">
                                <label>From Location</label>
                                <div className="input-with-action">
                                    <select
                                        name="from_loc"
                                        value={formData.from_loc}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Plant</option>
                                        {plants.map(p => (
                                            <option key={p.location_id} value={p.location_id}>{p.name}</option>
                                        ))}
                                        {formData.from_loc && !plants.find(p => p.location_id === formData.from_loc) && (
                                            <option value={formData.from_loc}>{formData.from_loc}</option>
                                        )}
                                    </select>
                                    <button
                                        type="button"
                                        className={`map-picker-btn ${selectionMode === 'from' ? 'active' : ''}`}
                                        onClick={() => setSelectionMode(selectionMode === 'from' ? null : 'from')}
                                    >
                                        📍
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>To Location</label>
                                <div className="input-with-action">
                                    <select
                                        name="to_loc"
                                        value={formData.to_loc}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select Plant</option>
                                        {plants.map(p => (
                                            <option key={p.location_id} value={p.location_id}>{p.name}</option>
                                        ))}
                                        {formData.to_loc && !plants.find(p => p.location_id === formData.to_loc) && (
                                            <option value={formData.to_loc}>{formData.to_loc}</option>
                                        )}
                                    </select>
                                    <button
                                        type="button"
                                        className={`map-picker-btn ${selectionMode === 'to' ? 'active' : ''}`}
                                        onClick={() => setSelectionMode(selectionMode === 'to' ? null : 'to')}
                                    >
                                        📍
                                    </button>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Start Time</label>
                                    <input
                                        type="datetime-local"
                                        name="start_time"
                                        value={formData.start_time}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>End Time</label>
                                    <input
                                        type="datetime-local"
                                        name="end_time"
                                        value={formData.end_time}
                                        onChange={handleInputChange}
                                        min={formData.start_time || undefined}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cargo Type</label>
                                    <select
                                        name="cargo_type"
                                        value={formData.cargo_type}
                                        onChange={handleInputChange}
                                    >
                                        {cargoCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Weight (kg)</label>
                                    <input
                                        type="number"
                                        name="cargo_weight"
                                        value={formData.cargo_weight}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Volume (m³)</label>
                                    <input
                                        type="number"
                                        name="cargo_volume_cbm"
                                        value={formData.cargo_volume_cbm}
                                        onChange={handleInputChange}
                                        step="0.1"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? 'Optimizing...' : 'Optimize and Schedule'}
                            </button>
                        </form>

                        <div className="form-map-container">
                            <p className="map-hint">
                                {selectionMode ? `Select ${selectionMode} location on map` : 'Click icon 📍 to select from map'}
                            </p>
                            <div className="map-legend">
                                <span className="legend-item"><span className="legend-line green"></span> Selected Route</span>
                                <span className="legend-item"><span className="legend-line red"></span> Alternative Routes</span>
                            </div>
                            <MapContainer center={[19.0760, 72.8777]} zoom={5} style={{ height: '350px', width: '100%' }}>
                                <SelectionMap
                                    plants={plants}
                                    onPointSelect={handlePointSelect}
                                    selectedFrom={parseCoords(formData.from_loc)}
                                    selectedTo={parseCoords(formData.to_loc)}
                                    routes={routeData?.routes || []}
                                />
                            </MapContainer>
                        </div>
                    </div>

                    {optimizationResult && (
                        <div className="optimization-result">
                            <div className="success-banner">Trip Scheduled Successfully!</div>
                            <div className="result-details-grid">
                                <div className="result-card">
                                    <h4>Trip Details</h4>
                                    <p><strong>Trip ID:</strong> {optimizationResult.trip_id}</p>
                                    <p><strong>Vehicle:</strong> {optimizationResult.vehicle_id}</p>
                                    <p><strong>Driver:</strong> {optimizationResult.driver_id}</p>
                                    <p><strong>Distance:</strong> {optimizationResult.distance_km} km</p>
                                    {optimizationResult.cargo_type && (
                                        <p><strong>Cargo:</strong> {optimizationResult.cargo_type}</p>
                                    )}
                                </div>

                                {routeData && routeData.routes && routeData.routes.length > 1 && (
                                    <div className="result-card routes-card">
                                        <h4>Route Comparison ({routeData.routes.length} routes analyzed)</h4>
                                        {routeData.routes.map((r, idx) => (
                                            <div key={idx} className={`route-compare-item ${r.is_selected ? 'selected' : ''}`}>
                                                <span className="route-marker">{r.is_selected ? '✅' : '⬜'}</span>
                                                <span>Route {r.index + 1}</span>
                                                <span>{r.distance_km} km</span>
                                                <span>{r.duration_minutes?.toFixed(0)} min</span>
                                                <span className="route-score">Score: {r.score}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <h4>Optimization Summary</h4>
                            <pre className="summary-text">{optimizationResult.summary}</pre>
                        </div>
                    )}
                </div>
            )}

            <div className="trips-table-container card">
                <h3>Active & Planned Trips</h3>
                <table className="trips-table">
                    <thead>
                        <tr>
                            <th>Trip ID</th>
                            <th>Vehicle</th>
                            <th>Driver</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Cargo</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.length > 0 ? trips.map(trip => (
                            <tr key={trip.trip_id}>
                                <td>
                                    <div className="trip-id-cell">
                                        <strong>{trip.trip_id}</strong>
                                        <span className="time-sub">{new Date(trip.start_time).toLocaleString()}</span>
                                    </div>
                                </td>
                                <td>{trip.vehicle_id}</td>
                                <td>{trip.driver_id}</td>
                                <td>{trip.from_loc}</td>
                                <td>{trip.to_loc}</td>
                                <td>
                                    <div className="cargo-cell">
                                        <span>{trip.cargo_weight} kg</span>
                                        {trip.cargo_type && trip.cargo_type !== 'General' && (
                                            <span className="cargo-type-badge">{trip.cargo_type}</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span
                                        className="status-badge"
                                        style={{ backgroundColor: getStatusColor(trip.status) }}
                                    >
                                        {trip.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {trip.status === 'Planned' && (
                                            <button
                                                className="action-btn start-btn"
                                                onClick={() => handleStartTrip(trip.trip_id)}
                                            >
                                                Start
                                            </button>
                                        )}
                                        {trip.status === 'In-Transit' && (
                                            <button
                                                className="action-btn complete-btn"
                                                onClick={() => handleCompleteTrip(trip.trip_id)}
                                            >
                                                Complete
                                            </button>
                                        )}
                                        {trip.status === 'Completed' && (
                                            <span className="done-icon">✓</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" className="no-data">No trips found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TripManagement;
