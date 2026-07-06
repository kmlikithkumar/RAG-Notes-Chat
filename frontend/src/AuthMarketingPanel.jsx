import { useState, useEffect } from "react";

const socialStats = [
  { icon: "📄", value: "25K+", label: "Documents" },
  { icon: "🤖", value: "100K+", label: "Questions" },
  { icon: "🎓", value: "5K+", label: "Students" },
  { icon: "⭐", value: "4.9", label: "Rating" }
];

const testimonials = [
  { quote: "This AI completely changed how I study. I just upload my lecture slides and it explains everything I didn't understand in class.", author: "— Computer Science Sophomore" },
  { quote: "The smart summaries save me hours of reading before exams. The citations mean I always know exactly where the info came from.", author: "— Pre-Med Student" },
  { quote: "It's like having a 24/7 tutor who actually knows my specific course material. My grades have never been better.", author: "— Economics Senior" },
  { quote: "The most useful tool I've found for exam prep. Being able to ask questions directly to my own notes is a game changer.", author: "— Law Student" }
];

export function AuthMarketingPanel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="login-panel-left">
      <div className="login-illustration">
        <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="robotBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="robotHead" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="book1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="book2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" floodColor="#4c1d95" />
            </filter>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodOpacity="0.25" floodColor="#8b5cf6" />
            </filter>
          </defs>

          <ellipse cx="200" cy="250" rx="130" ry="18" fill="#e0e7ff" opacity="0.6" filter="url(#glow)" />

          <g filter="url(#softShadow)">
            <rect x="70" y="216" width="110" height="22" rx="4" fill="url(#book1)" />
            <rect x="75" y="218" width="100" height="18" rx="2" fill="#e0e7ff" />
            <rect x="70" y="216" width="110" height="5" rx="2" fill="url(#book1)" />
            <rect x="80" y="222" width="90" height="2" fill="#c7d2fe" />

            <rect x="85" y="196" width="100" height="20" rx="4" fill="url(#book2)" />
            <rect x="90" y="198" width="90" height="16" rx="2" fill="#e0e7ff" />
            <rect x="85" y="196" width="100" height="4" rx="2" fill="url(#book2)" />
            <rect x="95" y="202" width="80" height="2" fill="#c7d2fe" />

            <rect x="100" y="178" width="90" height="18" rx="4" fill="#c4b5fd" />
            <rect x="105" y="180" width="80" height="14" rx="2" fill="#ffffff" />
            <rect x="100" y="178" width="90" height="4" rx="2" fill="#c4b5fd" />
            <rect x="110" y="184" width="70" height="2" fill="#e2e8f0" />
          </g>

          <g filter="url(#softShadow)">
            <rect x="200" y="170" width="70" height="65" rx="30" fill="url(#robotBody)" />
            
            <rect x="180" y="95" width="110" height="80" rx="35" fill="url(#robotHead)" />
            
            <rect x="195" y="115" width="80" height="45" rx="14" fill="#1e1b4b" />
            
            <circle cx="220" cy="135" r="7" fill="#a78bfa" />
            <circle cx="250" cy="135" r="7" fill="#a78bfa" />
            
            <circle cx="222" cy="133" r="2.5" fill="#ffffff" />
            <circle cx="252" cy="133" r="2.5" fill="#ffffff" />
            
            <rect x="232" y="70" width="6" height="25" rx="3" fill="#8b5cf6" />
            <circle cx="235" cy="65" r="8" fill="#facc15" filter="url(#glow)" />
            
            <path d="M 205 190 Q 185 200 195 230" fill="none" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" />
            <path d="M 265 190 Q 285 200 275 230" fill="none" stroke="#7c3aed" strokeWidth="12" strokeLinecap="round" />
          </g>

          <g filter="url(#softShadow)">
            <g transform="translate(60, 70) rotate(-12)">
              <rect x="0" y="0" width="55" height="70" rx="6" fill="#ffffff" />
              <rect x="10" y="15" width="35" height="4" rx="2" fill="#c4b5fd" />
              <rect x="10" y="25" width="25" height="4" rx="2" fill="#e0e7ff" />
              <rect x="10" y="35" width="30" height="4" rx="2" fill="#e0e7ff" />
              <rect x="10" y="45" width="20" height="4" rx="2" fill="#e0e7ff" />
            </g>
            
            <g transform="translate(290, 80) rotate(15)">
              <rect x="0" y="0" width="50" height="65" rx="6" fill="#ffffff" />
              <rect x="8" y="12" width="22" height="18" rx="4" fill="#a78bfa" />
              <rect x="8" y="38" width="28" height="4" rx="2" fill="#e0e7ff" />
              <rect x="8" y="48" width="18" height="4" rx="2" fill="#e0e7ff" />
            </g>
          </g>

          <g transform="translate(130, 30)" filter="url(#softShadow)">
            <path d="M 12 0 H 48 C 54.6 0 60 5.4 60 12 V 36 C 60 42.6 54.6 48 48 48 H 30 L 12 60 V 48 H 12 C 5.4 48 0 42.6 0 36 V 12 C 0 5.4 5.4 0 12 0 Z" fill="#facc15" />
            <circle cx="18" cy="24" r="4" fill="#ffffff" />
            <circle cx="30" cy="24" r="4" fill="#ffffff" />
            <circle cx="42" cy="24" r="4" fill="#ffffff" />
          </g>

          <path d="M 60 30 L 65 20 L 70 30 L 80 35 L 70 40 L 65 50 L 60 40 L 50 35 Z" fill="#fbcfe8" opacity="0.8" />
          <circle cx="310" cy="180" r="5" fill="#818cf8" opacity="0.6" />
          <circle cx="110" cy="150" r="3.5" fill="#34d399" opacity="0.6" />
        </svg>
      </div>

      <div className="login-hero-text">
        <span className="login-pill-badge">✨ AI Study Assistant</span>
        <h1 className="login-hero-title">
          Learn Smarter with <span className="login-gradient-text">AI</span>
        </h1>
        <p className="login-hero-copy">
          Upload your notes, ask questions, generate summaries, and
          master any subject with AI-powered document understanding.
        </p>
      </div>

      <div className="login-feature-list">
        <div className="feature-item feature-purple">
          <span className="feature-icon">📄</span>
          <div>
            <strong>Upload PDFs &amp; Notes</strong>
          </div>
        </div>
        <div className="feature-item feature-blue">
          <span className="feature-icon">🤖</span>
          <div>
            <strong>AI Tutor</strong>
          </div>
        </div>
        <div className="feature-item feature-green">
          <span className="feature-icon">🧠</span>
          <div>
            <strong>Smart Summaries</strong>
          </div>
        </div>
        <div className="feature-item feature-orange">
          <span className="feature-icon">🎯</span>
          <div>
            <strong>Exam Preparation</strong>
          </div>
        </div>
        <div className="feature-item feature-teal">
          <span className="feature-icon">📚</span>
          <div>
            <strong>Source Citations</strong>
          </div>
        </div>
        <div className="feature-item feature-pink">
          <span className="feature-icon">🔒</span>
          <div>
            <strong>Secure Workspace</strong>
          </div>
        </div>
      </div>

      <div className="login-stats-row">
        {socialStats.map((stat, index) => (
          <div key={index} className="stat-item">
            <span className="stat-icon">{stat.icon}</span>
            <div className="stat-content">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="login-testimonials">
        <div className="testimonial-slider">
          {testimonials.map((t, index) => (
            <div
              key={index}
              className={`testimonial-card ${index === activeIndex ? "active" : ""}`}
            >
              <div className="testimonial-stars">★★★★★</div>
              <p>"{t.quote}"</p>
              <span>{t.author}</span>
            </div>
          ))}
        </div>
        <div className="testimonial-dots">
          {testimonials.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === activeIndex ? "active" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
