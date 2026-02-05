import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  const handleContactClick = () => {
    navigate('/contact');
  };

  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <h1 className="logo">🚚 Fleet Management</h1>
          <button onClick={handleContactClick} className="nav-contact-btn">
            Contact Us
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Optimize Your Fleet Operations</h1>
          <p className="hero-subtitle">
            Centralized Vehicle Allocation and Logistics Optimization System for Multi-Plant Organizations
          </p>
          <button onClick={handleContactClick} className="cta-button">
            Get Started
          </button>
        </div>
        <div className="hero-image">
          <div className="hero-icon">📍</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose Our System?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚗</div>
            <h3>Vehicle Management</h3>
            <p>Centralized master data for all fleet and personnel with real-time status tracking.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Trip Optimization</h3>
            <p>Intelligent allocation of cost-effective and compliant vehicles to trips automatically.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Real-Time Tracking</h3>
            <p>GPS integration for live status updates and complete path history visualization.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚠️</div>
            <h3>Compliance Alerts</h3>
            <p>Automated proactive notifications for document expiry and service schedules.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Dashboard Analytics</h3>
            <p>Comprehensive KPI tracking and optimization decision visualization.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h3>Multi-Plant Support</h3>
            <p>Seamless vehicle sharing and coordination across multiple plant locations.</p>
          </div>
        </div>
      </section>

      {/* System Architecture */}
      <section className="architecture">
        <h2>System Architecture</h2>
        <div className="architecture-grid">
          <div className="arch-component">
            <h4>🖥️ Frontend</h4>
            <p>React.js user interface for all stakeholders</p>
            <small>Dashboard, Maps, Forms</small>
          </div>

          <div className="arch-component">
            <h4>⚙️ API Gateway</h4>
            <p>FastAPI backend with security & routing</p>
            <small>Authentication, Request Handling</small>
          </div>

          <div className="arch-component">
            <h4>💾 Database</h4>
            <p>PostgreSQL with PostGIS extensions</p>
            <small>Relational Data, Geospatial Queries</small>
          </div>

          <div className="arch-component">
            <h4>🔧 Optimization</h4>
            <p>Google OR-Tools powered engine</p>
            <small>Route Planning, Resource Allocation</small>
          </div>
        </div>
      </section>

      {/* Data Structures */}
      <section className="data-models">
        <h2>Supported Data Models</h2>
        <div className="data-grid">
          <div className="data-item">
            <span className="data-icon">📋</span>
            <h4>Vehicle Master Data</h4>
            <p>Track vehicle types, capacity, fuel efficiency, and status</p>
          </div>
          <div className="data-item">
            <span className="data-icon">👨‍💼</span>
            <h4>Driver Management</h4>
            <p>License info, ratings, availability, and compliance status</p>
          </div>
          <div className="data-item">
            <span className="data-icon">📍</span>
            <h4>Locations & Plants</h4>
            <p>Multi-depot support with geographic coordinates</p>
          </div>
          <div className="data-item">
            <span className="data-icon">🛣️</span>
            <h4>Trip Planning</h4>
            <p>Automated route optimization with time windows</p>
          </div>
          <div className="data-item">
            <span className="data-icon">🔧</span>
            <h4>Maintenance Records</h4>
            <p>Service history, preventive maintenance, and breakdowns</p>
          </div>
          <div className="data-item">
            <span className="data-icon">📊</span>
            <h4>KPI Analytics</h4>
            <p>Performance metrics and optimization reports</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h2>Ready to Transform Your Logistics?</h2>
        <p>Contact us today to learn how our system can optimize your fleet operations</p>
        <button onClick={handleContactClick} className="cta-button-large">
          Contact Us Now
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 Fleet Management System. All rights reserved.</p>
        <p>Centralized Vehicle Allocation and Logistics Optimization Platform</p>
      </footer>
    </div>
  );
}

export default LandingPage;
