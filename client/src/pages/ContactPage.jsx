import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ContactPage.css';

function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitStatus(null);

    try {
      const response = await axios.post(`${API_URL}/api/contact`, formData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Contact submission successful:', response.data);

      setSubmitStatus({
        type: 'success',
        message: 'Thank you! Your message has been received. We will get back to you soon.'
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });

      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus({
        type: 'error',
        message: error.response?.data?.detail || 'Error submitting form. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-content">
          <h1 className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            🚚 Fleet Management
          </h1>
          <button onClick={() => navigate('/')} className="nav-back-btn">
            ← Back Home
          </button>
        </div>
      </nav>

      {/* Contact Form Section */}
      <section className="contact-section">
        <div className="contact-wrapper">
          <div className="contact-info">
            <h1>Get In Touch</h1>
            <p>Have questions about our Fleet Management System? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>

            <div className="info-items">
              <div className="info-item">
                <span className="info-icon">📧</span>
                <div>
                  <h4>Email</h4>
                  <p>siddhskore@gmail.com</p>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon">📞</span>
                <div>
                  <h4>Phone</h4>
                  <p>+91 9876789876</p>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon">📍</span>
                <div>
                  <h4>Address</h4>
                  <p>Logistics Hub, Mumbai, India</p>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon">⏰</span>
                <div>
                  <h4>Response Time</h4>
                  <p>24-48 hours</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            <form onSubmit={handleSubmit} className="contact-form">
              <h2>Contact Us</h2>

              {submitStatus && (
                <div className={`alert alert-${submitStatus.type}`}>
                  {submitStatus.message}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Your name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (800) XXX-XXXX"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  placeholder="What is this about?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows="6"
                  placeholder="Tell us more about your inquiry..."
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 Fleet Management System. All rights reserved.</p>
        <p>Centralized Vehicle Allocation and Logistics Optimization Platform</p>
      </footer>
    </div>
  );
}

export default ContactPage;
