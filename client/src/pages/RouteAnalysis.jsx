import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import './RouteAnalysis.css';

const plantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30], iconAnchor: [9, 30], popupAnchor: [1, -24], shadowSize: [30, 30]
});

const RouteAnalysis = () => {
    const [plants, setPlants] = useState([]);
    const [trips, setTrips] = useState([]);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [routeData, setRouteData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Ad-hoc route analysis state
    const [fromLoc, setFromLoc] = useState('');
    const [toLoc, setToLoc] = useState('');
    const [adHocRouteData, setAdHocRouteData] = useState(null);
    const [adHocLoading, setAdHocLoading] = useState(false);

    useEffect(() => {
        fetchPlants();
        fetchTrips();
    }, []);

    const fetchPlants = async () => {
        try {
            const res = await api.get('/locations');
            setPlants(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchTrips = async () => {
        try {
            const res = await api.get('/trips');
            setTrips(res.data);
        } catch (err) { console.error(err); }
    };

    const loadTripRoute = async (trip) => {
        setSelectedTrip(trip);
        setAdHocRouteData(null);
        setAiAnalysis(null);
        setLoading(true);
        try {
            const res = await api.get(`/routes/trip/${trip.trip_id}`);
            setRouteData(res.data?.route_data || null);
        } catch (err) {
            console.error(err);
            setRouteData(null);
        } finally {
            setLoading(false);
        }
    };

    const runAdHocAnalysis = async () => {
        if (!fromLoc || !toLoc) return;
        setAdHocLoading(true);
        setSelectedTrip(null);
        setRouteData(null);
        setAiAnalysis(null);
        try {
            const res = await api.post('/routes/optimize', {
                from_loc: fromLoc,
                to_loc: toLoc,
                cargo_weight: 1000,
                max_alternatives: 4,
            });
            setAdHocRouteData(res.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || 'Route analysis failed');
        } finally {
            setAdHocLoading(false);
        }
    };

    const requestAiAnalysis = async () => {
        setAiLoading(true);
        const summary = selectedTrip?.summary || 'No optimization summary available.';
        try {
            const res = await api.post('/analysis/route-comparison', {
                optimization_summary: summary,
                route_data: routeData ? JSON.stringify(routeData) : null,
            });
            setAiAnalysis(res.data?.ai_analysis || 'No analysis returned.');
        } catch (err) {
            setAiAnalysis('AI analysis unavailable.');
        } finally {
            setAiLoading(false);
        }
    };

    // Decide which route data to display
    const displayRoutes = routeData?.routes || adHocRouteData?.routes || [];

    // Compute map bounds from routes
    const allCoords = displayRoutes.flatMap(r =>
        (r.geometry_coords || []).map(c => [c[1], c[0]])
    );

    // Get locations for markers
    const getLocCoords = (locId) => {
        const p = plants.find(pl => pl.location_id === locId);
        return p ? [p.latitude, p.longitude] : null;
    };

    const fromCoords = selectedTrip ? getLocCoords(selectedTrip.from_loc) : getLocCoords(fromLoc);
    const toCoords = selectedTrip ? getLocCoords(selectedTrip.to_loc) : getLocCoords(toLoc);

    return (
        <div className="route-analysis">
            <div className="ra-sidebar">
                <div className="ra-section">
                    <h3>Ad-Hoc Route Analysis</h3>
                    <p className="ra-hint">Analyze routes between any two locations</p>
                    <div className="ra-form">
                        <select value={fromLoc} onChange={e => setFromLoc(e.target.value)}>
                            <option value="">From...</option>
                            {plants.map(p => (
                                <option key={p.location_id} value={p.location_id}>{p.name}</option>
                            ))}
                        </select>
                        <select value={toLoc} onChange={e => setToLoc(e.target.value)}>
                            <option value="">To...</option>
                            {plants.map(p => (
                                <option key={p.location_id} value={p.location_id}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={runAdHocAnalysis}
                            disabled={adHocLoading || !fromLoc || !toLoc}
                            className="ra-analyze-btn"
                        >
                            {adHocLoading ? 'Analyzing...' : 'Analyze Routes'}
                        </button>
                    </div>
                </div>

                <div className="ra-section">
                    <h3>Trip Route History</h3>
                    <div className="ra-trip-list">
                        {trips.map(trip => (
                            <div
                                key={trip.trip_id}
                                className={`ra-trip-item ${selectedTrip?.trip_id === trip.trip_id ? 'active' : ''}`}
                                onClick={() => loadTripRoute(trip)}
                            >
                                <div className="ra-trip-header">
                                    <strong>{trip.trip_id}</strong>
                                    <span className={`ra-status ${trip.status.toLowerCase().replace(/[^a-z]/g, '-')}`}>{trip.status}</span>
                                </div>
                                <div className="ra-trip-route">
                                    {trip.from_loc} → {trip.to_loc}
                                </div>
                                <div className="ra-trip-meta">
                                    {trip.distance_km} km • {trip.cargo_weight} kg
                                    {trip.cargo_type && trip.cargo_type !== 'General' && ` • ${trip.cargo_type}`}
                                </div>
                            </div>
                        ))}
                        {trips.length === 0 && <p className="no-data">No trips yet.</p>}
                    </div>
                </div>
            </div>

            <div className="ra-main">
                <div className="ra-map-container">
                    <div className="ra-map-header">
                        <h3>
                            {selectedTrip
                                ? `Route: ${selectedTrip.from_loc} → ${selectedTrip.to_loc}`
                                : adHocRouteData
                                    ? `Route Analysis: ${fromLoc} → ${toLoc}`
                                    : 'Select a trip or run an analysis'}
                        </h3>
                        <div className="ra-legend">
                            <span className="ra-legend-item"><span className="ra-legend-line green"></span> Selected Route</span>
                            <span className="ra-legend-item"><span className="ra-legend-line red"></span> Alternative Routes</span>
                        </div>
                    </div>

                    <MapContainer
                        center={[20.5937, 78.9629]}
                        zoom={5}
                        style={{ height: '500px', width: '100%' }}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {plants.map(p => (
                            <Marker key={p.location_id} position={[p.latitude, p.longitude]} icon={plantIcon}>
                                <Popup>{p.name}</Popup>
                            </Marker>
                        ))}

                        {displayRoutes.map((route, idx) => {
                            const coords = (route.geometry_coords || []).map(c => [c[1], c[0]]);
                            if (coords.length < 2) return null;
                            return (
                                <Polyline
                                    key={`route-${idx}`}
                                    positions={coords}
                                    pathOptions={{
                                        color: route.is_selected ? '#22c55e' : '#ef4444',
                                        weight: route.is_selected ? 6 : 3,
                                        opacity: route.is_selected ? 0.9 : 0.5,
                                        dashArray: route.is_selected ? null : '10 6',
                                    }}
                                >
                                    <Popup>
                                        <strong>{route.is_selected ? 'Optimal' : `Alt ${route.index + 1}`}</strong><br />
                                        {route.distance_km} km • {route.duration_minutes?.toFixed(0)} min<br />
                                        Score: {route.score}
                                    </Popup>
                                </Polyline>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Route details panel */}
                {displayRoutes.length > 0 && (
                    <div className="ra-details-panel">
                        <h3>Route Comparison</h3>
                        <div className="ra-routes-grid">
                            {displayRoutes.map((r, idx) => (
                                <div key={idx} className={`ra-route-card ${r.is_selected ? 'selected' : ''}`}>
                                    <div className="ra-route-card-header">
                                        <span className="ra-route-tag">{r.is_selected ? 'OPTIMAL' : `Alternative ${r.index + 1}`}</span>
                                        <span className="ra-route-score">Score: {r.score}</span>
                                    </div>
                                    <div className="ra-route-stats">
                                        <div className="ra-stat">
                                            <span className="ra-stat-label">Distance</span>
                                            <span className="ra-stat-value">{r.distance_km} km</span>
                                        </div>
                                        <div className="ra-stat">
                                            <span className="ra-stat-label">Duration</span>
                                            <span className="ra-stat-value">{r.duration_minutes?.toFixed(0)} min</span>
                                        </div>
                                        <div className="ra-stat">
                                            <span className="ra-stat-label">Ascent</span>
                                            <span className="ra-stat-value">{r.ascent_m?.toFixed(0)} m</span>
                                        </div>
                                        <div className="ra-stat">
                                            <span className="ra-stat-label">Descent</span>
                                            <span className="ra-stat-value">{r.descent_m?.toFixed(0)} m</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI analysis section */}
                        {selectedTrip && (
                            <div className="ra-ai-section">
                                <button
                                    className="ra-ai-btn"
                                    onClick={requestAiAnalysis}
                                    disabled={aiLoading}
                                >
                                    {aiLoading ? 'Generating Analysis...' : 'Generate AI Analysis'}
                                </button>
                                {aiAnalysis && (
                                    <div className="ra-ai-result">
                                        <h4>AI Route Analysis</h4>
                                        <pre className="ra-ai-text">{aiAnalysis}</pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Trip optimization summary */}
                {selectedTrip?.summary && (
                    <div className="ra-summary-panel">
                        <h3>Optimization Summary</h3>
                        <pre className="ra-summary-text">{selectedTrip.summary}</pre>
                    </div>
                )}

                {loading && <div className="ra-loading">Loading route data...</div>}
            </div>
        </div>
    );
};

export default RouteAnalysis;
