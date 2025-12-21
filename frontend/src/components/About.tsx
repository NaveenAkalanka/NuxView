import React, { useEffect, useState } from 'react';
import { Coffee, Github, Linkedin } from 'lucide-react';

const About: React.FC = () => {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setLoaded(true);
    }, []);

    return (
        <div className="about-container custom-scrollbar">
            {/* Unified Fixed Background handled by CSS classes */}

            <div className="about-content">

                {/* Section 1: The Story */}
                <div style={{
                    opacity: loaded ? 1 : 0,
                    transform: loaded ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'opacity 1s ease-out, transform 1s ease-out'
                }}>
                    <div className="about-hero">
                        <h1 className="about-title-gradient">
                            Visualize Your System
                        </h1>
                        <p className="about-text-lead">
                            "I built NuxView because navigating CLI file structures can be intimidating and opaque.
                            Standard tools list files; NuxView reveals their relationships."
                        </p>
                        <p style={{ fontSize: '1.2rem', color: 'white', fontWeight: 500 }}>
                            My goal was simple: <span style={{ color: 'var(--accent-color)' }}>Crystal Clear Visibility.</span>
                        </p>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                            Explore your directory tree, understand permissions, and analyze structure instantly. No configuration required.
                        </p>
                    </div>
                </div>

                {/* Section 2: How It Works */}
                <div className="about-grid">
                    {/* Step 1 */}
                    <div className="about-card">
                        <div className="about-card-icon">🔍</div>
                        <h3 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '1rem' }}>Explore</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Traverse your file system with a responsive visual tree. See nested structures at a glance.
                        </p>
                    </div>

                    {/* Step 2 */}
                    <div className="about-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', zIndex: 10 }}>
                            <div className="about-card-icon">📊</div>
                            <h3 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '1rem' }}>Analyze</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                The core feature. <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Visual metadata</span> helps you spot large files and permission issues instantly.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="about-card">
                        <div className="about-card-icon">💡</div>
                        <h3 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '1rem' }}>Understand</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Get explanations for cryptic directory names and permissions. Demystify the Linux filesystem.
                        </p>
                    </div>
                </div>

                {/* Section 3: Connect */}
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '3rem', fontWeight: 300 }}>Meet the Developer</h2>
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <a
                            href="https://github.com/NaveenAkalanka"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-btn github"
                        >
                            <Github size={24} />
                            <span>GitHub</span>
                        </a>

                        <a
                            href="https://www.linkedin.com/in/naveen-akalanka/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="social-btn linkedin"
                        >
                            <Linkedin size={24} />
                            <span>LinkedIn</span>
                        </a>
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '4rem', fontSize: '0.85rem' }}>
                        Designed & Developed by Naveen Akalanka • © 2025
                    </p>
                </div>

                {/* Section 4: Support */}
                <div className="support-section">
                    <div style={{ width: '4rem', height: '4rem', background: 'rgba(255, 221, 0, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: '#FFDD00' }}>
                        <Coffee size={32} />
                    </div>
                    <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '1rem' }}>Support the Project</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                        NuxView is a free open-source tool. If it helps you manage your systems, consider buying me a coffee to support further development.
                    </p>
                    <a
                        href="https://buymeacoffee.com/naveenakalanka"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coffee-btn"
                    >
                        <Coffee size={24} fill="black" />
                        Buy me a coffee
                    </a>
                </div>
            </div>
        </div>
    );
};

export default About;
