import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import './RouteAnalysis.css';

const plantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30], iconAnchor: [9, 30], popupAnchor: [1, -24], shadowSize: [30, 30]
});

const renderBoldText = (text) => {
    const parts = text.split('**');
    return parts.map((part, i) => {
        if (i % 2 === 1) {
            return <strong key={i} style={{ color: '#0f172a' }}>{part}</strong>;
        }
        return part;
    });
};

const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return (
        <div className="markdown-body">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('###')) {
                    return <h4 key={idx} className="md-h4">{trimmed.replace(/^###\s*/, '')}</h4>;
                }
                if (trimmed.startsWith('##')) {
                    return <h3 key={idx} className="md-h3">{trimmed.replace(/^##\s*/, '')}</h3>;
                }
                if (trimmed.startsWith('#')) {
                    return <h2 key={idx} className="md-h2">{trimmed.replace(/^#\s*/, '')}</h2>;
                }
                if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    const content = trimmed.replace(/^[\-\*]\s*/, '');
                    return <li key={idx} className="md-li">{renderBoldText(content)}</li>;
                }
                if (trimmed) {
                    return <p key={idx} className="md-p">{renderBoldText(trimmed)}</p>;
                }
                return <div key={idx} className="md-br"></div>;
            })}
        </div>
    );
};

const renderFormattedSummary = (summary) => {
    if (!summary) return <p className="no-summary-text">No optimization summary details available.</p>;
    const lines = summary.split('\n');
    const sections = {
        title: '',
        vehicle: [],
        driver: [],
        route: [],
        continuation: []
    };
    
    let currentSection = '';
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        if (trimmed.startsWith('**Trip Optimization Report') || trimmed.startsWith('#')) {
            sections.title = trimmed.replace(/\*\*|#/g, '').trim();
        } else if (trimmed.toLowerCase().startsWith('selected vehicle:')) {
            currentSection = 'vehicle';
            sections.vehicle.push({ type: 'header', text: trimmed });
        } else if (trimmed.toLowerCase().startsWith('selected driver:')) {
            currentSection = 'driver';
            sections.driver.push({ type: 'header', text: trimmed });
        } else if (trimmed.toLowerCase().startsWith('route plan:')) {
            currentSection = 'route';
        } else if (trimmed.toLowerCase().startsWith('continuation recommendation') || trimmed.toLowerCase().startsWith('continuation recommendation after delivery:')) {
            currentSection = 'continuation';
        } else if (trimmed.startsWith('- ')) {
            const bulletText = trimmed.substring(2);
            if (currentSection === 'vehicle') sections.vehicle.push({ type: 'bullet', text: bulletText });
            else if (currentSection === 'driver') sections.driver.push({ type: 'bullet', text: bulletText });
            else if (currentSection === 'route') sections.route.push({ type: 'bullet', text: bulletText });
            else if (currentSection === 'continuation') sections.continuation.push({ type: 'bullet', text: bulletText });
        } else {
            if (currentSection === 'vehicle') sections.vehicle.push({ type: 'text', text: trimmed });
            else if (currentSection === 'driver') sections.driver.push({ type: 'text', text: trimmed });
            else if (currentSection === 'route') sections.route.push({ type: 'text', text: trimmed });
            else if (currentSection === 'continuation') sections.continuation.push({ type: 'text', text: trimmed });
        }
    });

    return (
        <div className="formatted-summary-grid">
            {sections.vehicle.length > 0 && (
                <div className="summary-section-card vehicle-card">
                    <h5>Vehicle Allocation</h5>
                    {sections.vehicle.map((item, idx) => (
                        <p key={idx} className={item.type === 'header' ? 'section-hdr' : 'section-item'}>
                            {item.type === 'bullet' ? '• ' : ''}{item.text}
                        </p>
                    ))}
                </div>
            )}
            {sections.driver.length > 0 && (
                <div className="summary-section-card driver-card">
                    <h5>Driver Allocation</h5>
                    {sections.driver.map((item, idx) => (
                        <p key={idx} className={item.type === 'header' ? 'section-hdr' : 'section-item'}>
                            {item.type === 'bullet' ? '• ' : ''}{item.text}
                        </p>
                    ))}
                </div>
            )}
            {sections.route.length > 0 && (
                <div className="summary-section-card route-card">
                    <h5>Route Plan</h5>
                    {sections.route.map((item, idx) => (
                        <p key={idx} className="section-item">• {item.text}</p>
                    ))}
                </div>
            )}
            {sections.continuation.length > 0 && (
                <div className="summary-section-card continuation-card">
                    <h5>Post-Delivery Recommendation</h5>
                    {sections.continuation.map((item, idx) => (
                        <p key={idx} className="section-item">• {item.text}</p>
                    ))}
                </div>
            )}
        </div>
    );
};

const buildRouteAnalysisPayload = (routeData, displayRoutes) => {
    const routes = (displayRoutes || []).map((route) => ({
        index: route.index,
        distance_km: Number(route.distance_km ?? 0),
        duration_minutes: Number(route.duration_minutes ?? 0),
        ascent_m: Number(route.ascent_m ?? 0),
        descent_m: Number(route.descent_m ?? 0),
        score: Number(route.score ?? 0),
        is_selected: Boolean(route.is_selected),
    }));

    const selectedIndexFromRoutes = routes.findIndex((route) => route.is_selected);

    return {
        mode: routeData?.mode || null,
        selected_index: routeData?.selected_index ?? (selectedIndexFromRoutes >= 0 ? selectedIndexFromRoutes : null),
        routes,
    };
};

const MapBoundsUpdater = ({ routes }) => {
    const map = useMap();
    useEffect(() => {
        const allCoords = routes.flatMap(r =>
            (r.geometry_coords || []).map(c => [c[1], c[0]])
        );
        if (allCoords.length > 1) {
            map.fitBounds(allCoords, { padding: [50, 50], maxZoom: 14 });
        }
    }, [routes, map]);
    return null;
};

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
            const compactRouteData = buildRouteAnalysisPayload(routeData, displayRoutes);
            const res = await api.post('/analysis/route-comparison', {
                optimization_summary: summary,
                route_data: compactRouteData.routes.length > 0 ? compactRouteData : null,
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
                        <MapBoundsUpdater routes={displayRoutes} />

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
                        {displayRoutes.length === 1 && (
                            <div className="ra-no-alt-notice">
                                <p>ℹ️ No alternate routes available for this route segment. The routing service returned a single optimal path.</p>
                            </div>
                        )}

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
                                        <div className="ra-ai-formatted">{renderMarkdown(aiAnalysis)}</div>
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
                        {renderFormattedSummary(selectedTrip.summary)}
                    </div>
                )}

                {loading && <div className="ra-loading">Loading route data...</div>}
            </div>
        </div>
    );
};

export default RouteAnalysis;
