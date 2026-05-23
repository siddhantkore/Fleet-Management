import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import api from '../services/api';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './LiveTrackingPage.css';

// Custom red icon for plants
const plantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30],
    iconAnchor: [9, 30],
    popupAnchor: [1, -24],
    shadowSize: [30, 30]
});

// Green icon for active/driving drivers
const driverActiveIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30],
    iconAnchor: [9, 30],
    popupAnchor: [1, -24],
    shadowSize: [30, 30]
});

// Default blue icon for idle drivers
const driverIdleIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [18, 30],
    iconAnchor: [9, 30],
    popupAnchor: [1, -24],
    shadowSize: [30, 30]
});

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ─── Helper formatters ──────────────────────────────────────────
const formatSpeed = (ms) => {
    if (ms == null) return '—';
    const kmh = ms * 3.6;
    return `${kmh.toFixed(1)} km/h`;
};

const formatBattery = (level) => {
    if (level == null) return '—';
    return `${(level * 100).toFixed(0)}%`;
};

const formatHeading = (deg) => {
    if (deg == null) return '—';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8] + ` (${deg.toFixed(0)}°)`;
};

const ratingStars = (r) => {
    if (r == null) return '—';
    const full = Math.floor(r);
    const half = r - full >= 0.5;
    return '*'.repeat(full) + (half ? '.5' : '') + ` ${r.toFixed(1)}/5`;
};

// ─── Component ──────────────────────────────────────────────────
const MapBoundsAdjuster = ({ locations, plants }) => {
    const map = useMap();
    useEffect(() => {
        const bounds = [];
        plants.forEach(p => {
            if (p.latitude != null && p.longitude != null) {
                bounds.push([parseFloat(p.latitude), parseFloat(p.longitude)]);
            }
        });
        Object.values(locations).forEach(l => {
            if (l.latitude != null && l.longitude != null) {
                bounds.push([parseFloat(l.latitude), parseFloat(l.longitude)]);
            }
        });
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
    }, [locations, plants, map]);
    return null;
};
const LiveTrackingPage = () => {
    const navigate = useNavigate();
    const [locations, setLocations] = useState({});
    const [plants, setPlants] = useState([]);
    const [trips, setTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Detail panel state
    const [detailPanelOpen, setDetailPanelOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [driverDetail, setDriverDetail] = useState(null);

    const ws = useRef(null);

    // Dynamic extraction of host
    const host = window.location.hostname;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    let backendHost = `${host}:8000`;
    if (host.includes('.app.github.dev') || host.includes('.gitpod.io')) {
        backendHost = host.replace('-5173', '-8000');
    }
    const WS_URL = `${wsProtocol}://${backendHost}/api/v1/tracking/ws`;

    // ─── Fetch driver detail ────────────────────────────────────
    const openDriverDetail = async (driverId) => {
        setDetailPanelOpen(true);
        setDetailLoading(true);
        try {
            const res = await api.get(`/tracking/driver-detail/${driverId}`);
            setDriverDetail(res.data);
        } catch (err) {
            console.error('Error fetching driver detail:', err);
            setDriverDetail(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetailPanel = () => {
        setDetailPanelOpen(false);
        setDriverDetail(null);
    };

    useEffect(() => {
        const fetchPlants = async () => {
            try {
                const response = await api.get('locations');
                setPlants(response.data);
            } catch (err) {
                console.error("Error fetching plants:", err);
            }
        };

        const fetchTrips = async () => {
            try {
                const response = await api.get('trips');
                setTrips(response.data.filter(t => t.status === 'In-Transit'));
            } catch (err) {
                console.error("Error fetching trips:", err);
            }
        };

        const fetchLocations = async () => {
            try {
                const response = await api.get('tracking/locations');
                const locMap = {};
                response.data.forEach(loc => {
                    locMap[String(loc.driver_id)] = loc;
                });
                setLocations(locMap);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching initial locations:", err);
                setLoading(false);
            }
        };

        fetchPlants();
        fetchTrips();
        fetchLocations();

        // WebSocket
        ws.current = new WebSocket(WS_URL);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLocations(prev => ({
                ...prev,
                [String(data.driver_id)]: data
            }));
            if (data.trip_id) {
                setTrips(prev => {
                    if (!prev.find(t => t.trip_id === data.trip_id)) {
                        fetchTrips();
                    }
                    return prev;
                });
            }
        };

        ws.current.onclose = () => {
            console.log("WebSocket disconnected. Retrying in 5s...");
            setTimeout(() => { }, 5000);
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [WS_URL]);

    if (loading) {
        return (
            <div className="live-tracking-page">
                <Navbar />
                <div className="loading-container">Loading Live Map...</div>
                <Footer />
            </div>
        );
    }

    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const filteredForMap = Object.values(locations)
        .filter(loc => {
            const lastUpdate = new Date(loc.updated_at).getTime();
            const isFresh = (now - lastUpdate) < STALE_THRESHOLD_MS;
            if (!isFresh) return false;
            if (selectedTripId) return loc.trip_id === selectedTripId;
            return true;
        });

    const filteredForList = Object.values(locations)
        .filter(loc => {
            const isFresh = (now - new Date(loc.updated_at).getTime()) < STALE_THRESHOLD_MS;
            if (!isFresh) return false;
            if (selectedTripId) return loc.trip_id === selectedTripId;
            return true;
        });

    const dd = driverDetail; // shorthand

    return (
        <div className="live-tracking-page">
            <Navbar />
            <div className="live-tracking-container">
                <div className="tracking-header">
                    <button className="back-to-dashboard" onClick={() => navigate('/dashboard')}>
                        ← Back to Dashboard
                    </button>
                    <h1>Live Fleet Tracking</h1>
                </div>
                <div className="map-wrapper">
                    <MapContainer center={[18.5204, 73.8567]} zoom={10} style={{ height: '70vh', width: '100%' }}>
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="OpenStreetMap">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Satellite View">
                                <TileLayer
                                    attribution='Tiles &copy; Esri'
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Dark Mode">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                />
                            </LayersControl.BaseLayer>
                        </LayersControl>
                        
                        <MapBoundsAdjuster locations={filteredForMap} plants={plants} />

                        {/* Plants */}
                        {plants.map((p) => (
                            <Marker key={`plant-${p.location_id}`} position={[p.latitude, p.longitude]} icon={plantIcon}>
                                <Popup>
                                    <strong>Location ({p.type}):</strong> {p.name}<br />
                                    <strong>City:</strong> {p.city}
                                </Popup>
                            </Marker>
                        ))}

                        {/* Drivers */}
                        {filteredForMap.map((loc) => {
                            const isDriving = loc.activity_type === 'driving' || (loc.speed != null && loc.speed > 2);
                            return (
                                <Marker
                                    key={`driver-${loc.driver_id}`}
                                    position={[loc.latitude, loc.longitude]}
                                    icon={isDriving ? driverActiveIcon : driverIdleIcon}
                                >
                                    <Popup>
                                        <div className="marker-popup">
                                            <strong>{loc.driver_name || loc.driver_id}</strong>
                                            <span className="popup-id">ID: {loc.driver_id}</span>
                                            {loc.speed != null && <span className="popup-speed">Speed: {formatSpeed(loc.speed)}</span>}
                                            {loc.battery_level != null && <span className="popup-battery">Bat: {formatBattery(loc.battery_level)}</span>}
                                            {loc.activity_type && <span className={`popup-activity ${loc.activity_type}`}>● {loc.activity_type}</span>}
                                            {loc.trip_id && <span className="popup-trip">Trip: {loc.trip_id}</span>}
                                            <span className="popup-time">Updated: {new Date(loc.updated_at).toLocaleString()}</span>
                                            <button className="popup-detail-btn" onClick={() => openDriverDetail(loc.driver_id)}>
                                                View Full Details →
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                <div className="tracking-info-grid">
                    <div className="info-card trip-list">
                        <h3>Active Trips ({trips.length})</h3>
                        <div className="filter-hint">Select a trip to track specifically</div>
                        <ul className="trip-items">
                            <li className={!selectedTripId ? 'active' : ''} onClick={() => setSelectedTripId(null)}>
                                All Active Drivers
                            </li>
                            {trips.map(trip => (
                                <li
                                    key={trip.trip_id}
                                    className={selectedTripId === trip.trip_id ? 'active' : ''}
                                    onClick={() => setSelectedTripId(trip.trip_id)}
                                >
                                    <span className="trip-id">{trip.trip_id}</span>
                                    <span className="trip-route">{trip.from_loc} &rarr; {trip.to_loc}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="info-card driver-list">
                        <h3>Drivers on Map ({filteredForList.length})</h3>
                        <ul>
                            {filteredForList.map(loc => (
                                <li
                                    key={loc.driver_id}
                                    className="driver-list-item"
                                    onClick={() => openDriverDetail(loc.driver_id)}
                                    title="Click to view details"
                                >
                                    <div className="driver-list-header">
                                        <strong>{loc.driver_name || loc.driver_id}</strong>
                                        <span className={`activity-dot ${loc.activity_type || 'unknown'}`}>
                                            {loc.activity_type || 'unknown'}
                                        </span>
                                    </div>
                                    <div className="driver-list-meta">
                                        <span className="coords-text">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                                        {loc.speed != null && <span className="speed-tag">{formatSpeed(loc.speed)}</span>}
                                        {loc.battery_level != null && <span className="battery-tag">Bat: {formatBattery(loc.battery_level)}</span>}
                                    </div>
                                    {loc.trip_id && <div className="trip-tag">Trip: {loc.trip_id}</div>}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* ─── Driver Detail Side Panel ─────────────────────────── */}
            <div className={`detail-panel-overlay ${detailPanelOpen ? 'open' : ''}`} onClick={closeDetailPanel} />
            <div className={`detail-panel ${detailPanelOpen ? 'open' : ''}`}>
                <button className="detail-panel-close" onClick={closeDetailPanel}>X</button>
                {detailLoading && <div className="detail-loading">Loading driver details…</div>}
                {!detailLoading && dd && (
                    <>
                        {/* Driver Info */}
                        <div className="detail-section driver-hero">
                            <div className="driver-avatar">{dd.driver?.name?.charAt(0) || '?'}</div>
                            <h2>{dd.driver?.name}</h2>
                            <span className={`status-pill ${dd.driver?.current_status?.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                                {dd.driver?.current_status}
                            </span>
                        </div>

                        <div className="detail-section">
                            <h4>Driver Information</h4>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>ID</label>
                                    <span>{dd.driver?.driver_id}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Phone</label>
                                    <span>{dd.driver?.phone || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>License</label>
                                    <span>{dd.driver?.license_no || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>License Expiry</label>
                                    <span>{dd.driver?.license_expiry || '—'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Rating</label>
                                    <span className="rating">{ratingStars(dd.driver?.rating)}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Home Plant</label>
                                    <span>{dd.driver?.home_plant_id || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Live Telemetry */}
                        {dd.live_location && (
                            <div className="detail-section">
                                <h4>Live Telemetry</h4>
                                <div className="telemetry-grid">
                                    <div className="telemetry-card speed">
                                        <span className="telemetry-icon">SPD</span>
                                        <span className="telemetry-value">{formatSpeed(dd.live_location.speed)}</span>
                                        <span className="telemetry-label">Speed</span>
                                    </div>
                                    <div className="telemetry-card heading-card">
                                        <span className="telemetry-icon">DIR</span>
                                        <span className="telemetry-value">{formatHeading(dd.live_location.heading)}</span>
                                        <span className="telemetry-label">Heading</span>
                                    </div>
                                    <div className="telemetry-card altitude">
                                        <span className="telemetry-icon">ALT</span>
                                        <span className="telemetry-value">{dd.live_location.altitude != null ? `${dd.live_location.altitude.toFixed(0)} m` : '—'}</span>
                                        <span className="telemetry-label">Altitude</span>
                                    </div>
                                    <div className="telemetry-card battery-card">
                                        <span className="telemetry-icon">{dd.live_location.is_charging ? 'CHG' : 'BAT'}</span>
                                        <span className="telemetry-value">{formatBattery(dd.live_location.battery_level)}</span>
                                        <span className="telemetry-label">{dd.live_location.is_charging ? 'Charging' : 'Battery'}</span>
                                    </div>
                                    <div className="telemetry-card accuracy-card">
                                        <span className="telemetry-icon">GPS</span>
                                        <span className="telemetry-value">{dd.live_location.accuracy_h != null ? `±${dd.live_location.accuracy_h.toFixed(0)}m` : '—'}</span>
                                        <span className="telemetry-label">GPS Accuracy</span>
                                    </div>
                                    <div className="telemetry-card network-card">
                                        <span className="telemetry-icon">{dd.live_location.network_type === 'wifi' ? 'WiFi' : 'NET'}</span>
                                        <span className="telemetry-value">{dd.live_location.network_type || '—'}</span>
                                        <span className="telemetry-label">Network</span>
                                    </div>
                                </div>
                                <div className="detail-meta-row">
                                    <span className={`activity-badge ${dd.live_location.activity_type || ''}`}>
                                        Activity: {dd.live_location.activity_type || '—'}
                                    </span>
                                    <span className="updated-badge">
                                        Updated: {dd.live_location.updated_at ? new Date(dd.live_location.updated_at).toLocaleString() : '—'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Active Trip */}
                        {dd.active_trip && (
                            <div className="detail-section">
                                <h4>Active Trip</h4>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Trip ID</label>
                                        <span>{dd.active_trip.trip_id}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Route</label>
                                        <span>{dd.active_trip.from_loc} &rarr; {dd.active_trip.to_loc}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Distance</label>
                                        <span>{dd.active_trip.distance_km} km</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Cargo</label>
                                        <span>{dd.active_trip.cargo_weight} kg</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Started</label>
                                        <span>{dd.active_trip.start_time ? new Date(dd.active_trip.start_time).toLocaleString() : '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Status</label>
                                        <span className="trip-status-badge">{dd.active_trip.status}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Vehicle */}
                        {dd.vehicle && (
                            <div className="detail-section">
                                <h4>Assigned Vehicle</h4>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <label>Vehicle ID</label>
                                        <span>{dd.vehicle.vehicle_id}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Type</label>
                                        <span>{dd.vehicle.type}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>License Plate</label>
                                        <span>{dd.vehicle.license_plate}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Capacity</label>
                                        <span>{dd.vehicle.capacity_kg} kg / {dd.vehicle.volume_cbm} m³</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Fuel</label>
                                        <span>{dd.vehicle.fuel_type}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Status</label>
                                        <span>{dd.vehicle.current_status}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!dd.active_trip && !dd.vehicle && (
                            <div className="detail-section no-trip-notice">
                                No active trip or vehicle assigned to this driver.
                            </div>
                        )}
                    </>
                )}
                {!detailLoading && !dd && detailPanelOpen && (
                    <div className="detail-error">Could not load driver details.</div>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default LiveTrackingPage;
