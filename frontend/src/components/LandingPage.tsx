import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [isLight, setIsLight] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const typeElRef = useRef<HTMLSpanElement>(null);
  const sqlElRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject fonts and icons if not present
    if (!document.getElementById('tabler-icons')) {
      const link = document.createElement('link');
      link.id = 'tabler-icons';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('google-fonts-lp')) {
      const fontLink = document.createElement('link');
      fontLink.id = 'google-fonts-lp';
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(fontLink);
    }
    
    // Check theme
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
      setIsLight(true);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isLight;
    setIsLight(newMode);
    localStorage.setItem('theme', newMode ? 'light' : 'dark');
  };

  useEffect(() => {
    const targetText = "Show me the top 10 products by revenue last quarter,\ngrouped by category";
    const sqlResult = `
<span class="sql-kw">SELECT</span>
  p.category,
  p.name,
  <span class="sql-fn">SUM</span>(oi.quantity * oi.unit_price) <span class="sql-kw">AS</span> revenue
<span class="sql-kw">FROM</span> order_items oi
<span class="sql-kw">JOIN</span> products p <span class="sql-kw">ON</span> p.id = oi.product_id
<span class="sql-kw">JOIN</span> orders o <span class="sql-kw">ON</span> o.id = oi.order_id
<span class="sql-kw">WHERE</span> o.created_at >= <span class="sql-fn">DATE</span>(<span class="sql-str">'now'</span>, <span class="sql-str">'-3 months'</span>)
<span class="sql-kw">GROUP BY</span> p.category, p.name
<span class="sql-kw">ORDER BY</span> revenue <span class="sql-kw">DESC</span>
<span class="sql-kw">LIMIT</span> <span class="sql-num">10</span>;`.trim();

    let charIndex = 0;
    let typingTimer: any = null;

    const typeWriter = () => {
      if (charIndex < targetText.length) {
        if (typeElRef.current) {
          typeElRef.current.textContent += targetText.charAt(charIndex);
        }
        charIndex++;
        typingTimer = setTimeout(typeWriter, Math.random() * 50 + 30);
      } else {
        setTimeout(() => {
          if (sqlElRef.current) {
            sqlElRef.current.innerHTML = sqlResult;
          }
        }, 400);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(typeWriter, 500);
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });

    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }

    return () => {
      observer.disconnect();
      if (typingTimer) clearTimeout(typingTimer);
    };
  }, []);

  return (
    <div className={`landing-root ${isLight ? 'light' : ''}`}>
      <nav>
        <div className="nav-left">
            <div className="logo">&gt;_</div>
            <div className="wordmark">QueryMind</div>
        </div>
        <div className="nav-center">
            <a href="#features" className="nav-link">Features</a>
            <a href="#demo" className="nav-link">Demo</a>
            <a href="#how" className="nav-link">How it works</a>
        </div>
        <div className="nav-right">
            <button className="btn-primary" onClick={onGetStarted}>Get started free</button>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                <i className={`ti ${isLight ? 'ti-moon' : 'ti-sun'}`}></i>
            </button>
        </div>
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <i className={`ti ${menuOpen ? 'ti-x' : 'ti-menu-2'}`}></i>
        </button>
      </nav>
      
      <div className={`drawer ${menuOpen ? 'open' : ''}`}>
        <a href="#features" className="nav-link" onClick={() => setMenuOpen(false)}>Features</a>
        <a href="#demo" className="nav-link" onClick={() => setMenuOpen(false)}>Demo</a>
        <a href="#how" className="nav-link" onClick={() => setMenuOpen(false)}>How it works</a>
        <button className="btn-primary" style={{marginTop: '16px'}} onClick={() => { setMenuOpen(false); onGetStarted(); }}>Get started free</button>
        <button className="theme-toggle" onClick={toggleTheme} style={{marginTop: '16px'}}>
            <i className={`ti ${isLight ? 'ti-moon' : 'ti-sun'}`}></i> Toggle Theme
        </button>
      </div>

      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-glow"></div>
        
        <div className="hero-content">
          <div className="badge">
              <i className="ti ti-sparkles" style={{color: 'var(--accent)'}}></i>
              Powered by OpenRouter · 50+ AI models
          </div>
          
          <h1>Ask your database<br/>anything, <span className="accent-text">in plain English.</span></h1>
          
          <p className="subheadline">
              QueryMind converts natural language into precise SQL — instantly. Connect any database, pick your AI model, and start querying in seconds.
          </p>
          
          <div className="hero-ctas">
              <button className="btn-primary" onClick={onGetStarted}>Start querying free &rarr;</button>
          </div>
          
          <div className="social-proof">
              <div className="avatars">
                  <div className="avatar" style={{background:'#EF4444', zIndex:5}}>JD</div>
                  <div className="avatar" style={{background:'#3B82F6', zIndex:4}}>AL</div>
                  <div className="avatar" style={{background:'#10B981', zIndex:3}}>MK</div>
                  <div className="avatar" style={{background:'#F59E0B', zIndex:2}}>RS</div>
                  <div className="avatar" style={{background:'#8B5CF6', zIndex:1}}>TC</div>
              </div>
              Trusted by 2,400+ developers · Works with SQLite, PostgreSQL, MySQL
          </div>
        </div>
        
        <div className="terminal" ref={terminalRef}>
            <div className="terminal-header">
                <div className="traffic-lights">
                    <div className="dot" style={{background:'#F87171'}}></div>
                    <div className="dot" style={{background:'#FBBF24'}}></div>
                    <div className="dot" style={{background:'#34D399'}}></div>
                </div>
                <div className="terminal-title">QueryMind &mdash; sample.db</div>
                <div className="dialect-badge">sqlite</div>
            </div>
            <div className="terminal-body">
                <div className="pane pane-left">
                    <div className="pane-label">Ask your database</div>
                    <div className="nl-input">
                        <span className="nl-text" ref={typeElRef}></span><span className="cursor"></span>
                    </div>
                    <button className="btn-primary" style={{height:'28px', fontSize:'12px', padding:'0 12px'}}>Run Query</button>
                </div>
                <div className="pane">
                    <div className="pane-label">
                        Generated SQL
                        <i className="ti ti-copy" style={{cursor:'pointer'}}></i>
                    </div>
                    <div className="sql-output code-font" ref={sqlElRef}></div>
                </div>
            </div>
        </div>
      </section>

      <section className="trust-bar">
        <div className="trust-label">Works with your stack</div>
        <div className="marquee-wrapper">
            <div className="marquee-content">
                <div className="logo-item">SQLite</div>
                <div className="logo-item">PostgreSQL</div>
                <div className="logo-item">MySQL</div>
                <div className="logo-item">Supabase</div>
                <div className="logo-item">PlanetScale</div>
                <div className="logo-item">Turso</div>
            </div>
            <div className="marquee-content" aria-hidden="true">
                <div className="logo-item">SQLite</div>
                <div className="logo-item">PostgreSQL</div>
                <div className="logo-item">MySQL</div>
                <div className="logo-item">Supabase</div>
                <div className="logo-item">PlanetScale</div>
                <div className="logo-item">Turso</div>
            </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-header">
            <h2>Everything you need to query smarter</h2>
            <p>Built for developers who think in English but ship in SQL.</p>
        </div>
        
        <div className="grid">
            <div className="feature-card">
                <i className="ti ti-message-2 feature-icon"></i>
                <div className="feature-title">Ask in plain English</div>
                <div className="feature-desc">Type any question about your data &mdash; QueryMind turns it into precise SQL instantly, no syntax required.</div>
            </div>
            <div className="feature-card">
                <i className="ti ti-cpu feature-icon"></i>
                <div className="feature-title">50+ AI models via OpenRouter</div>
                <div className="feature-desc">Switch between Claude, GPT-4o, Gemini, and Llama with one click. Pick the model that fits your budget and task.</div>
            </div>
            <div className="feature-card">
                <i className="ti ti-sitemap feature-icon"></i>
                <div className="feature-title">Live schema explorer</div>
                <div className="feature-desc">Browse tables, columns, types, and foreign keys in a collapsible sidebar. Click any table to add context to your query.</div>
            </div>
            <div className="feature-card">
                <i className="ti ti-chart-dots-3 feature-icon"></i>
                <div className="feature-title">Instant data visualizations</div>
                <div className="feature-desc">Switch to the Analytics tab to see your results as bar, line, pie, scatter, heatmap, or cluster charts &mdash; auto-detected.</div>
            </div>
            <div className="feature-card">
                <i className="ti ti-history feature-icon"></i>
                <div className="feature-title">Full query history</div>
                <div className="feature-desc">Every NL prompt and generated SQL saved locally. Re-run or refine any past query in one click.</div>
            </div>
            <div className="feature-card">
                <i className="ti ti-database feature-icon"></i>
                <div className="feature-title">SQLite, PostgreSQL &amp; MySQL</div>
                <div className="feature-desc">Connect via file upload, connection string, or use the built-in sample database to start immediately.</div>
            </div>
        </div>
      </section>

      <section className="how-it-works" id="how">
        <div className="section-header">
            <h2>From question to result in 3 steps</h2>
        </div>
        
        <div className="steps">
            <div className="step-connector"></div>
            
            <div className="step">
                <div className="step-header">
                    <div className="step-num">01</div>
                    <i className="ti ti-plug-connected" style={{fontSize:'32px', color:'var(--accent)'}}></i>
                </div>
                <div className="step-title">Connect your database</div>
                <div className="step-desc">Upload a SQLite file, paste a PostgreSQL connection string, or use the sample database. Done in 10 seconds.</div>
                <div className="step-visual">
                    <span style={{color:'var(--green)'}}>●</span>&nbsp;Connected &middot; sample.db
                </div>
            </div>
            
            <div className="step">
                <div className="step-header">
                    <div className="step-num">02</div>
                    <i className="ti ti-keyboard" style={{fontSize:'32px', color:'var(--accent)'}}></i>
                </div>
                <div className="step-title">Type your question</div>
                <div className="step-desc">Write what you want in plain English. Be as specific or vague as you like &mdash; QueryMind handles the translation.</div>
                <div className="step-visual" style={{justifyContent:'flex-start', textAlign:'left'}}>
                    <span style={{opacity:0.5}}>Show me top users...</span><span className="cursor" style={{height:'12px',width:'6px',marginLeft:'2px'}}></span>
                </div>
            </div>
            
            <div className="step">
                <div className="step-header">
                    <div className="step-num">03</div>
                    <i className="ti ti-table" style={{fontSize:'32px', color:'var(--accent)'}}></i>
                </div>
                <div className="step-title">Get SQL + results instantly</div>
                <div className="step-desc">See the generated SQL with a plain-English explanation, then explore results in a table or as visualizations.</div>
                <div className="step-visual" style={{flexDirection:'column', gap:'4px', alignItems:'flex-start'}}>
                    <div style={{display:'flex',gap:'4px',width:'100%'}}><div style={{flex:1,height:'4px',background:'var(--border-hi)'}}></div><div style={{flex:1,height:'4px',background:'var(--border-hi)'}}></div><div style={{flex:1,height:'4px',background:'var(--border-hi)'}}></div></div>
                    <div style={{display:'flex',gap:'4px',width:'100%'}}><div style={{flex:1,height:'4px',background:'var(--border)'}}></div><div style={{flex:1,height:'4px',background:'var(--border)'}}></div><div style={{flex:1,height:'4px',background:'var(--border)'}}></div></div>
                    <div style={{display:'flex',gap:'4px',width:'100%'}}><div style={{flex:1,height:'4px',background:'var(--border)'}}></div><div style={{flex:1,height:'4px',background:'var(--border)'}}></div><div style={{flex:1,height:'4px',background:'var(--border)'}}></div></div>
                </div>
            </div>
        </div>
      </section>

      <section className="live-demo" id="demo">
        <div className="section-header">
            <h2>Try it right now &mdash; no signup</h2>
            <p>The sample database is already connected. Just type a question.</p>
        </div>
        
        <div className="demo-embed">
           <div style={{padding: '40px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px'}}>
              <h3 style={{marginBottom: '12px'}}>Interactive Console</h3>
              <p style={{color: 'var(--text-2)', marginBottom: '24px'}}>Click the button below to enter the full app experience.</p>
              <button className="btn-primary" onClick={onGetStarted}>Launch App</button>
           </div>
        </div>
      </section>

      <footer>
        <div style={{marginBottom: '16px'}}>
            <div className="logo" style={{margin: '0 auto'}}>&gt;_</div>
        </div>
        <p>QueryMind &copy; 2026. Built for developers.</p>
      </footer>
    </div>
  );
}
