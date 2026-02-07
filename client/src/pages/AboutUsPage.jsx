import React from 'react';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import './AboutUsPage.css';

const AboutUsPage = () => {
    return (
        <div className="about-container">
            <Navbar />
            <main className="about-main">
                <section className="about-hero">
                    <h1>About Us</h1>
                    <p>Revolutionizing logistics through intelligent automation and real-time insights.</p>
                </section>

                <section className="about-section">
                    <div className="section-content">
                        <h2>Our Mission</h2>
                        <p>To provide a seamless, cost-effective, and transparent vehicle allocation system <br /> optimizes fleet operations for multi-plant organizations, reducing manual efforts and increasing efficiency.</p>
                    </div>
                    <div className="section-image">
                        <img src="https://di-uploads-pod10.dealerinspire.com/mercedesbenzofcharleston/uploads/2017/02/our-dealership.jpg" alt="Fleet Logistics" />
                    </div>
                </section>

                <section className="about-section reverse">
                    <div className="section-content">
                        <h2>What We Do</h2>
                        <p>Our platform handles everything from vehicle and driver master data management to real-time GPS tracking and intelligent trip optimization using advanced algorithms.</p>
                    </div>
                    <div className="section-image">
                        <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=1000" alt="Technology Dashboard" />
                    </div>
                </section>

                <section className="about-section">
                    <div className="section-content">
                        <h2>Why Choose Us?</h2>
                        <ul>
                            <li><strong>Efficiency:</strong> Automated vehicle allocation processes that save time and reduce costs.</li>
                            <li><strong>Transparency:</strong> Real-time tracking and comprehensive logs for full visibility.</li>
                            <li><strong>Compliance:</strong> Proactive alerts for document expiry and maintenance schedules.</li>
                            <li><strong>Scalability:</strong> Modular architecture built to handle complex multi-plant logistics.</li>
                        </ul>
                    </div>
                    <div className="section-image">
                        <img src="https://img.freepik.com/premium-photo/transport-logistic-manager-checking-control-logistic-network-distribution-customer_1101054-33326.jpg" alt="Business Collaboration" />
                    </div>
                </section>
                
            </main>
            <Footer />
        </div>
    );
};

export default AboutUsPage;
