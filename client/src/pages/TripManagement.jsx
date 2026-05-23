import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import './TripManagement.css';

// Smaller icons for cleaner map
const plantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30], iconAnchor: [9, 30], popupAnchor: [1, -24], shadowSize: [30, 30]
});
const customIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30], iconAnchor: [9, 30], popupAnchor: [1, -24], shadowSize: [30, 30]
});

const DEFAULT_CARGO_CATEGORIES = [
    'General', 'Iron/Steel', 'Cotton/Textile', 'Electronics',
    'Chemicals', 'Food/Perishable', 'Construction Material',
    'Machinery/Equipment', 'Automotive Parts', 'Pharmaceuticals'
];

// Typical density ranges by cargo type (kg/m³)
const CARGO_DENSITY = {
    'General': 300, 'Iron/Steel': 2500, 'Cotton/Textile': 80, 'Electronics': 200,
    'Chemicals': 900, 'Food/Perishable': 400, 'Construction Material': 1500,
    'Machinery/Equipment': 600, 'Automotive Parts': 350, 'Pharmaceuticals': 150,
};

const SelectionMap = ({ plants, onPointSelect, selectedFrom, selectedTo, routes }) => {
    useMapEvents({ click(e) { onPointSelect(e.latlng); } });
    return (
        <>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {plants.map(plant => (
                <Marker key={plant.location_id} position={[plant.latitude, plant.longitude]} icon={plantIcon}
                    eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e); onPointSelect({ lat: plant.latitude, lng: plant.longitude, id: plant.location_id }); } }}>
                    <Popup>{plant.name}</Popup>
                </Marker>
            ))}
            {selectedFrom && selectedFrom.lat && <Marker position={[selectedFrom.lat, selectedFrom.lng]} icon={customIcon}><Popup>Start</Popup></Marker>}
            {selectedTo && selectedTo.lat && <Marker position={[selectedTo.lat, selectedTo.lng]} icon={customIcon}><Popup>End</Popup></Marker>}
            {routes && routes.map((route, idx) => {
                const coords = route.geometry_coords?.map(c => [c[1], c[0]]) || [];
                if (coords.length < 2) return null;
                return (
                    <Polyline key={`route-${idx}`} positions={coords}
                        pathOptions={{
                            color: route.is_selected ? '#22c55e' : '#ef4444',
                            weight: route.is_selected ? 5 : 3,
                            opacity: route.is_selected ? 0.9 : 0.5,
                            dashArray: route.is_selected ? null : '10 6',
                        }}>
                        <Popup>
                            <strong>{route.is_selected ? 'Optimal Route' : `Alternative ${route.index + 1}`}</strong><br />
                            Distance: {route.distance_km} km<br />Duration: {route.duration_minutes?.toFixed(0)} min<br />Score: {route.score}
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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchTarget, setSearchTarget] = useState(null); // 'from' or 'to'
    const searchTimeout = useRef(null);

    const [formData, setFormData] = useState({
        from_loc: '', to_loc: '', start_time: '', cargo_weight: 0,
        cargo_type: 'General', optimize: true
    });
    const [estimatedArrival, setEstimatedArrival] = useState(null);
    const [optimizationResult, setOptimizationResult] = useState(null);
    const [routeData, setRouteData] = useState(null);

    useEffect(() => { fetchTrips(); fetchPlants(); fetchCargoCategories(); }, []);

    const fetchTrips = async () => {
        try {
            const response = await api.get('/trips');
            const sorted = response.data.sort((a, b) => {
                const order = { 'In-Transit': 0, 'Planned': 1, 'Completed': 2, 'Cancelled': 3 };
                return (order[a.status] ?? 99) - (order[b.status] ?? 99);
            });
            setTrips(sorted);
        } catch (error) { console.error('Error fetching trips:', error); }
    };

    const fetchCargoCategories = async () => {
        try {
            const r = await api.get('/analysis/cargo-categories');
            if (r.data.categories) setCargoCategories(r.data.categories);
        } catch { }
    };

    const fetchPlants = async () => {
        try { const r = await api.get('/locations'); setPlants(r.data); }
        catch (error) { console.error('Error fetching locations:', error); }
    };

    // Auto-compute volume from weight using cargo type density
    const computeVolume = (weight, cargoType) => {
        const density = CARGO_DENSITY[cargoType] || 300;
        return parseFloat((weight / density).toFixed(2));
    };

    // Estimate arrival time based on route distance
    const computeEstimatedArrival = (startTime, distanceKm) => {
        if (!startTime || !distanceKm) return null;
        const avgSpeedKmh = 50; // average for heavy vehicles
        const hours = distanceKm / avgSpeedKmh;
        const bufferHours = Math.max(0.5, hours * 0.15); // 15% buffer, min 30min
        const start = new Date(startTime);
        const arrival = new Date(start.getTime() + (hours + bufferHours) * 3600000);
        return { arrival, hours: hours.toFixed(1), buffer: bufferHours.toFixed(1), total: (hours + bufferHours).toFixed(1) };
    };

    // Location search via Nominatim
    const handleSearch = (query, target) => {
        setSearchQuery(query);
        setSearchTarget(target);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (query.length < 3) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            try {
                const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`);
                const data = await r.json();
                setSearchResults(data.map(d => ({ name: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })));
            } catch { setSearchResults([]); }
        }, 400);
    };

    const selectSearchResult = (result) => {
        const value = `${result.lat.toFixed(6)},${result.lng.toFixed(6)}`;
        if (searchTarget === 'from') {
            setFormData({ ...formData, from_loc: value });
        } else {
            setFormData({ ...formData, to_loc: value });
        }
        setSearchResults([]); setSearchQuery(''); setSearchTarget(null);
    };

    const handleStartTrip = async (trip_id) => {
        try { await api.post(`/trips/${trip_id}/start`); fetchTrips(); }
        catch { alert('Failed to start trip'); }
    };
    const handleCompleteTrip = async (trip_id) => {
        try { await api.post(`/trips/${trip_id}/complete`); fetchTrips(); }
        catch { alert('Failed to complete trip'); }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handlePointSelect = (point) => {
        const value = point.id || `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
        if (selectionMode === 'from') setFormData({ ...formData, from_loc: value });
        else if (selectionMode === 'to') setFormData({ ...formData, to_loc: value });
        setSelectionMode(null);
    };

    const handleScheduleTrip = async (e) => {
        e.preventDefault();
        setLoading(true); setOptimizationResult(null); setRouteData(null); setEstimatedArrival(null);
        try {
            const volume = computeVolume(parseFloat(formData.cargo_weight), formData.cargo_type);
            const payload = {
                ...formData,
                start_time: new Date(formData.start_time).toISOString(),
                end_time: null,
                cargo_weight: parseFloat(formData.cargo_weight),
                cargo_volume_cbm: volume,
            };
            const response = await api.post('/trips/schedule', payload);
            setOptimizationResult(response.data);

            // Compute estimated arrival
            if (formData.start_time && response.data.distance_km) {
                setEstimatedArrival(computeEstimatedArrival(formData.start_time, response.data.distance_km));
            }

            if (response.data.route_data) {
                try { setRouteData(JSON.parse(response.data.route_data)); } catch { }
            }
            fetchTrips();
        } catch (error) {
            console.error('Error scheduling trip:', error);
            alert(error.response?.data?.detail || 'Failed to schedule trip');
        } finally { setLoading(false); }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Planned': return '#3b82f6';
            case 'In-Transit': return '#f59e0b';
            case 'Completed': return '#22c55e';
            case 'Cancelled': return '#ef4444';
            default: return '#94a3b8';
        }
    };

    const parseCoords = (val) => {
        if (!val) return null;
        const p = plants.find(pl => pl.location_id === val);
        if (p) return { lat: p.latitude, lng: p.longitude };
        if (val.includes(',')) { const [lat, lng] = val.split(',').map(Number); return { lat, lng }; }
        return null;
    };

    const getPlantName = (id) => plants.find(p => p.location_id === id)?.name || id;

    return (
        <div className="trip-management">
            <div className="header-actions">
                <button className="add-btn" onClick={() => { setShowForm(!showForm); setOptimizationResult(null); setRouteData(null); setEstimatedArrival(null); }}>
                    {showForm ? 'Cancel' : 'Schedule New Trip'}
                </button>
            </div>

            {showForm && (
                <div className="trip-form-container card">
                    <h3>Schedule Trip</h3>
                    <div className="scheduling-grid">
                        <form onSubmit={handleScheduleTrip} className="trip-form">
                            {/* From Location */}
                            <div className="form-group">
                                <label>From Location</label>
                                <div className="input-with-action">
                                    <select name="from_loc" value={formData.from_loc} onChange={handleInputChange} required>
                                        <option value="">Select Plant</option>
                                        {plants.map(p => <option key={p.location_id} value={p.location_id}>{p.name}</option>)}
                                        {formData.from_loc && !plants.find(p => p.location_id === formData.from_loc) && (
                                            <option value={formData.from_loc}>{formData.from_loc}</option>
                                        )}
                                    </select>
                                    <button type="button" className={`map-picker-btn ${selectionMode === 'from' ? 'active' : ''}`}
                                        onClick={() => setSelectionMode(selectionMode === 'from' ? null : 'from')}>Pick</button>
                                </div>
                                <div className="search-bar-wrapper">
                                    <input type="text" placeholder="Search place... e.g. 'Chakan Plant Pune'"
                                        value={searchTarget === 'from' ? searchQuery : ''}
                                        onFocus={() => setSearchTarget('from')}
                                        onChange={e => handleSearch(e.target.value, 'from')} />
                                    {searchTarget === 'from' && searchResults.length > 0 && (
                                        <div className="search-dropdown">
                                            {searchResults.map((r, i) => (
                                                <div key={i} className="search-item" onClick={() => selectSearchResult(r)}>
                                                    <span className="search-dot"></span> {r.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* To Location */}
                            <div className="form-group">
                                <label>To Location</label>
                                <div className="input-with-action">
                                    <select name="to_loc" value={formData.to_loc} onChange={handleInputChange} required>
                                        <option value="">Select Plant</option>
                                        {plants.map(p => <option key={p.location_id} value={p.location_id}>{p.name}</option>)}
                                        {formData.to_loc && !plants.find(p => p.location_id === formData.to_loc) && (
                                            <option value={formData.to_loc}>{formData.to_loc}</option>
                                        )}
                                    </select>
                                    <button type="button" className={`map-picker-btn ${selectionMode === 'to' ? 'active' : ''}`}
                                        onClick={() => setSelectionMode(selectionMode === 'to' ? null : 'to')}>Pick</button>
                                </div>
                                <div className="search-bar-wrapper">
                                    <input type="text" placeholder="Search place... e.g. 'Bhiwandi Warehouse'"
                                        value={searchTarget === 'to' ? searchQuery : ''}
                                        onFocus={() => setSearchTarget('to')}
                                        onChange={e => handleSearch(e.target.value, 'to')} />
                                    {searchTarget === 'to' && searchResults.length > 0 && (
                                        <div className="search-dropdown">
                                            {searchResults.map((r, i) => (
                                                <div key={i} className="search-item" onClick={() => selectSearchResult(r)}>
                                                    <span className="search-dot"></span> {r.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Start Time only */}
                            <div className="form-group">
                                <label>Departure Time</label>
                                <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleInputChange} required />
                                <small style={{ color: '#64748b', marginTop: 2 }}>System will estimate arrival time after optimization</small>
                            </div>

                            {/* Cargo Type and Weight */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cargo Type</label>
                                    <select name="cargo_type" value={formData.cargo_type} onChange={handleInputChange}>
                                        {cargoCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Weight (kg)</label>
                                    <input type="number" name="cargo_weight" value={formData.cargo_weight} onChange={handleInputChange} required />
                                </div>
                            </div>

                            {/* Auto-computed volume indicator */}
                            {formData.cargo_weight > 0 && (
                                <div className="auto-volume-info">
                                    <span>Auto-estimated volume: <strong>{computeVolume(formData.cargo_weight, formData.cargo_type)} m³</strong></span>
                                    <span className="density-hint">Based on {formData.cargo_type} density (~{CARGO_DENSITY[formData.cargo_type] || 300} kg/m³)</span>
                                </div>
                            )}

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? 'Optimizing...' : 'Optimize & Schedule'}
                            </button>
                        </form>

                        <div className="form-map-container">
                            <p className="map-hint">
                                {selectionMode ? `Click map to select ${selectionMode} location` : 'Use Pick or search to select locations'}
                            </p>
                            <div className="map-legend">
                                <span className="legend-item"><span className="legend-line green"></span> Selected Route</span>
                                <span className="legend-item"><span className="legend-line red"></span> Alternatives</span>
                            </div>
                            <MapContainer center={[19.0760, 72.8777]} zoom={5} style={{ height: '380px', width: '100%' }}>
                                <SelectionMap plants={plants} onPointSelect={handlePointSelect}
                                    selectedFrom={parseCoords(formData.from_loc)} selectedTo={parseCoords(formData.to_loc)}
                                    routes={routeData?.routes || []} />
                            </MapContainer>
                        </div>
                    </div>

                    {optimizationResult && (
                        <div className="optimization-result">
                            <div className="success-banner">Trip Scheduled Successfully</div>
                            <div className="result-details-grid">
                                <div className="result-card">
                                    <h4>Trip Details</h4>
                                    <p><strong>Trip ID:</strong> {optimizationResult.trip_id}</p>
                                    <p><strong>Vehicle:</strong> {optimizationResult.vehicle_id}</p>
                                    <p><strong>Driver:</strong> {optimizationResult.driver_id}</p>
                                    <p><strong>Distance:</strong> {optimizationResult.distance_km} km</p>
                                    {optimizationResult.cargo_type && <p><strong>Cargo:</strong> {optimizationResult.cargo_type}</p>}
                                </div>

                                {estimatedArrival && (
                                    <div className="result-card eta-card">
                                        <h4>Estimated Arrival</h4>
                                        <p className="eta-time">{estimatedArrival.arrival.toLocaleString()}</p>
                                        <p><strong>Travel Time:</strong> {estimatedArrival.hours} hrs</p>
                                        <p><strong>Buffer:</strong> +{estimatedArrival.buffer} hrs</p>
                                        <p><strong>Total:</strong> {estimatedArrival.total} hrs</p>
                                    </div>
                                )}

                                {routeData && routeData.routes && routeData.routes.length > 1 && (
                                    <div className="result-card routes-card">
                                        <h4>Route Comparison ({routeData.routes.length} analyzed)</h4>
                                        {routeData.routes.map((r, idx) => (
                                            <div key={idx} className={`route-compare-item ${r.is_selected ? 'selected' : ''}`}>
                                                <span className="route-marker">{r.is_selected ? 'Best' : ''}</span>
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
                        <tr><th>Trip ID</th><th>Vehicle</th><th>Driver</th><th>From</th><th>To</th><th>Cargo</th><th>Status</th><th>Actions</th></tr>
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
                                <td>{getPlantName(trip.from_loc)}</td>
                                <td>{getPlantName(trip.to_loc)}</td>
                                <td>
                                    <div className="cargo-cell">
                                        <span>{trip.cargo_weight} kg</span>
                                        {trip.cargo_type && trip.cargo_type !== 'General' && (
                                            <span className="cargo-type-badge">{trip.cargo_type}</span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className="status-badge" style={{ backgroundColor: getStatusColor(trip.status) }}>
                                        {trip.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {trip.status === 'Planned' && <button className="action-btn start-btn" onClick={() => handleStartTrip(trip.trip_id)}>Start</button>}
                                        {trip.status === 'In-Transit' && <button className="action-btn complete-btn" onClick={() => handleCompleteTrip(trip.trip_id)}>Complete</button>}
                                        {trip.status === 'Completed' && <span className="done-icon">Done</span>}
                                    </div>
                                </td>
                            </tr>
                        )) : <tr><td colSpan="8" className="no-data">No trips found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TripManagement;
