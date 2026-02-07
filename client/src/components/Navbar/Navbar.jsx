import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const { token } = useAuth();

    return (
        <nav className="navbar">
            <div className="nav-content">
                <h1 className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    🚚 Fleet Management
                </h1>
                <div className="nav-buttons">
                    <button onClick={() => navigate('/tracking')} className="nav-tracking-btn">
                        Live Tracking
                    </button>
                    <button onClick={() => navigate('/about')} className="nav-about-btn">
                        About Us
                    </button>
                    {token ? (
                        <button onClick={() => navigate('/dashboard')} className="nav-login-btn">
                            Dashboard
                        </button>
                    ) : (
                        <button onClick={() => navigate('/login')} className="nav-login-btn">
                            Admin Login
                        </button>
                    )}
                    <button onClick={() => navigate('/contact')} className="nav-contact-btn">
                        Contact Us
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
