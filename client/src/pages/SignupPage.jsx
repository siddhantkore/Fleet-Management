import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const SignupPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        designation: '',
        plant_id: ''
    });
    const [plants, setPlants] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlants = async () => {
            try {
                // Fetch plants for the dropdown, though initially there might be none
                const response = await api.get('/locations/');
                setPlants(response.data);
            } catch (err) {
                console.error("Failed to fetch plants", err);
            }
        };
        fetchPlants();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/users/signup', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.detail || 'Signup failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Admin Sign Up</h2>
                <p>Create your administrative account</p>
                {error && <div className="error-message">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input name="name" onChange={handleChange} required placeholder="John Doe" />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input name="email" type="email" onChange={handleChange} required placeholder="john@example.com" />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input name="password" type="password" onChange={handleChange} required placeholder="••••••••" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Designation</label>
                            <input name="designation" onChange={handleChange} placeholder="Plant Manager" />
                        </div>
                        <div className="form-group">
                            <label>Assigned Plant</label>
                            <select name="plant_id" onChange={handleChange}>
                                <option value="">Global Admin (All Plants)</option>
                                {plants.map(p => (
                                    <option key={p.location_id} value={p.location_id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="primary full-width">Create Account</button>
                </form>
                <div className="auth-footer">
                    Already have an account? <Link to="/login">Login here</Link>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
