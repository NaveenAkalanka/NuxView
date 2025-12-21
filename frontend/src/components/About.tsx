import React, { useEffect, useState } from 'react';
import { Coffee, Github, Linkedin, MessageSquare, Send, X, Loader2 } from 'lucide-react';

const About: React.FC = () => {
    const [loaded, setLoaded] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        setLoaded(true);
    }, []);

    const handleFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSending(true);
        const formData = new FormData(e.currentTarget); // Use currentTarget for Form element

        /* 
           Using Web3Forms for simple feedback collection. 
           Key provided by user: d1425489-0971-4911-af81-f23957d3df42
        */
        formData.append("access_key", "d1425489-0971-4911-af81-f23957d3df42");

        try {
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                alert("Thank you! Your feedback has been sent.");
                setShowFeedback(false);
            } else {
                throw new Error("Submission failed");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to send feedback. Please try again later.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="about-container custom-scrollbar">
            {/* Feedback Modal */}
            {showFeedback && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowFeedback(false)}>
                    <div className="frame" style={{
                        width: '90%',
                        maxWidth: '500px',
                        padding: '2rem',
                        position: 'relative',
                        background: 'rgba(10, 10, 15, 0.95)', // Slightly darker for modal
                        borderColor: 'var(--accent-color)', // Highlight border
                        boxShadow: '0 0 40px rgba(0, 243, 255, 0.15)'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowFeedback(false)}
                            className="btn-icon"
                            style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none' }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '4rem', height: '4rem',
                                background: 'rgba(0, 243, 255, 0.1)',
                                color: 'var(--accent-color)',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem auto',
                                border: '1px solid rgba(0, 243, 255, 0.2)'
                            }}>
                                <MessageSquare size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', color: 'white', margin: 0, fontFamily: 'var(--font-main)' }}>Send Feedback</h3>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                Help us improve <span style={{ color: 'var(--accent-color)' }}>NuxView</span>
                            </p>
                        </div>

                        <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <input type="checkbox" name="botcheck" style={{ display: 'none' }} />

                            <div>
                                <label style={{ display: 'block', color: 'var(--accent-color)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name (Optional)</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="input-modern"
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid var(--frame-border)', padding: '10px 12px', color: 'white' }}
                                    placeholder="Your name"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'var(--accent-color)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</label>
                                <textarea
                                    name="message"
                                    required
                                    className="input-modern"
                                    rows={5}
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', border: '1px solid var(--frame-border)', padding: '10px 12px', color: 'white', resize: 'vertical', fontFamily: 'var(--font-main)' }}
                                    placeholder="Bug report, feature request, or just saying hi..."
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={sending}
                                className="btn-modern"
                                style={{
                                    justifyContent: 'center',
                                    marginTop: '1rem',
                                    width: '100%',
                                    padding: '12px',
                                    fontSize: '1rem'
                                }}
                            >
                                {sending ? <Loader2 size={20} className="spinning" /> : <Send size={20} />}
                                {sending ? 'TRANSMITTING...' : 'SEND FEEDBACK'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Unified Fixed Background handled by CSS classes */}

            <div className="about-content">

                {/* Section 1: The Story */}
                <div style={{
                    opacity: loaded ? 1 : 0,
                    transform: loaded ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'opacity 1s ease-out, transform 1s ease-out'
                }}>
                    <div className="about-hero">
                        <img src="/NuxView.svg" alt="NuxView" style={{ width: '80px', height: '80px', marginBottom: '1.5rem', filter: 'brightness(0) invert(1)' }} />
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

                        <button
                            onClick={() => setShowFeedback(true)}
                            className="social-btn"
                            style={{ background: 'rgba(56, 189, 248, 0.8)', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                            <MessageSquare size={24} />
                            <span>Feedback</span>
                        </button>
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
