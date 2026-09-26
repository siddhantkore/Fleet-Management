import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ResourceAnalysis.css';

const ResourceAnalysis = () => {
  const [data, setData] = useState({ drivers: [], vehicles: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('drivers');
  const [showModal, setShowModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [updateLat, setUpdateLat] = useState('');
  const [updateLng, setUpdateLng] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/tracking/resource-analysis');
      setData(res.data);
    } catch (error) {
      console.error('Error fetching resource analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/tracking/resource/driver/${selectedDriver.driver_id}/location?lat=${updateLat}&lng=${updateLng}`);
      setShowModal(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const openUpdateModal = (driver) => {
    setSelectedDriver(driver);
    setUpdateLat(driver.current_location?.lat || driver.home_location?.lat || '');
    setUpdateLng(driver.current_location?.lng || driver.home_location?.lng || '');
    setShowModal(true);
  };

  if (loading) return <div className="resource-loading">Loading resource analysis...</div>;

  const { summary, drivers, vehicles } = data;

  return (
    <div className="resource-analysis-page">
      <h2>Resource Analysis</h2>
      
      <div className="summary-cards">
        <div className="card">
          <h3>Total Drivers</h3>
          <div className="value">{summary.total_drivers || 0}</div>
        </div>
        <div className="card">
          <h3>Available Drivers</h3>
          <div className="value green">{summary.available_drivers || 0}</div>
        </div>
        <div className="card">
          <h3>On-Trip Drivers</h3>
          <div className="value yellow">{summary.on_trip_drivers || 0}</div>
        </div>
        <div className="card">
          <h3>Total Vehicles</h3>
          <div className="value">{summary.total_vehicles || 0}</div>
        </div>
        <div className="card">
          <h3>Available Vehicles</h3>
          <div className="value green">{summary.available_vehicles || 0}</div>
        </div>
        <div className="card">
          <h3>On-Trip Vehicles</h3>
          <div className="value yellow">{summary.on_trip_vehicles || 0}</div>
        </div>
      </div>

      <div className="tabs">
        <button className={activeTab === 'drivers' ? 'active' : ''} onClick={() => setActiveTab('drivers')}>Drivers</button>
        <button className={activeTab === 'vehicles' ? 'active' : ''} onClick={() => setActiveTab('vehicles')}>Vehicles</button>
      </div>

      <div className="tab-content">
        {activeTab === 'drivers' && (
          <table className="resource-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Home Plant</th>
                <th>Current Location</th>
                <th>Distance (km)</th>
                <th>Active Trip</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.driver_id} className={`status-${d.current_status?.toLowerCase().replace(' ', '-')}`}>
                  <td>{d.driver_id}</td>
                  <td>{d.name}</td>
                  <td>{d.current_status} {d.is_on_leave ? '(On Leave)' : ''}</td>
                  <td>{d.home_plant_name || d.home_plant_id}</td>
                  <td>{d.current_location ? `${d.current_location.lat.toFixed(4)}, ${d.current_location.lng.toFixed(4)}` : 'Unknown'}</td>
                  <td>{d.distance_from_home_km !== null ? d.distance_from_home_km : 'N/A'}</td>
                  <td>{d.active_trip ? d.active_trip.trip_id : 'None'}</td>
                  <td>
                    <button className="btn-update" onClick={() => openUpdateModal(d)}>Update Location</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        {activeTab === 'vehicles' && (
          <table className="resource-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>License Plate</th>
                <th>Status</th>
                <th>Home Plant</th>
                <th>Odometer</th>
                <th>Active Trip</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.vehicle_id} className={`status-${v.current_status?.toLowerCase().replace(' ', '-')}`}>
                  <td>{v.vehicle_id}</td>
                  <td>{v.type}</td>
                  <td>{v.license_plate}</td>
                  <td>{v.current_status}</td>
                  <td>{v.plant_name || v.plant_loc_id}</td>
                  <td>{v.odometer_km} km</td>
                  <td>{v.active_trip ? v.active_trip.trip_id : 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Update Location for {selectedDriver?.name}</h3>
            <form onSubmit={handleUpdateLocation}>
              <div className="form-group">
                <label>Latitude:</label>
                <input type="number" step="any" value={updateLat} onChange={e => setUpdateLat(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Longitude:</label>
                <input type="number" step="any" value={updateLng} onChange={e => setUpdateLng(e.target.value)} required />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Cancel</button>
                <button type="submit" className="btn-save">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceAnalysis;
