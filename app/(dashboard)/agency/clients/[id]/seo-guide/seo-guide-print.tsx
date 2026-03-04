'use client';

interface Props {
  clientName: string;
  setup: Record<string, unknown>;
  agencyName: string;
  agencyEmail?: string;
}

export function SEOGuidePrint({ clientName, setup, agencyName, agencyEmail }: Props) {
  const clinicName = (setup?.clinicName as string) || clientName;
  const city = (setup?.city as string) || '';
  const address = (setup?.address as string) || '';
  const services = (setup?.services as string[]) || [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Inter', system-ui, sans-serif;
          background: #f8f9fa;
          color: #1a1a2e;
        }

        .page {
          width: 794px;
          min-height: 1123px;
          margin: 32px auto;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 36px 48px 32px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .header h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .header h1 span { color: #c4b5fd; }
        .header-sub {
          margin-top: 8px;
          font-size: 14px;
          opacity: 0.85;
        }
        .header-meta {
          margin-top: 16px;
          display: flex;
          gap: 20px;
          font-size: 12px;
          opacity: 0.8;
        }
        .header-meta span { display: flex; align-items: center; gap: 4px; }

        /* ── Body ── */
        .body { padding: 36px 48px; flex: 1; display: flex; flex-direction: column; gap: 28px; }

        /* ── Section title ── */
        .section-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6366f1;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e0e7ff;
        }

        /* ── What we do ── */
        .what-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .what-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .what-emoji { font-size: 20px; line-height: 1; margin-top: 2px; }
        .what-title { font-size: 13px; font-weight: 600; color: #111827; }
        .what-desc { font-size: 11.5px; color: #6b7280; margin-top: 2px; line-height: 1.5; }

        /* ── Schedule ── */
        .schedule {
          display: flex;
          flex-direction: column;
          gap: 0;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        .schedule-row {
          display: grid;
          grid-template-columns: 140px 1fr;
          border-bottom: 1px solid #f3f4f6;
        }
        .schedule-row:last-child { border-bottom: none; }
        .schedule-day {
          background: #f9fafb;
          padding: 10px 14px;
          font-size: 11.5px;
          font-weight: 600;
          color: #4f46e5;
          border-right: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
        }
        .schedule-task {
          padding: 10px 14px;
          font-size: 11.5px;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .schedule-task strong { color: #111827; }

        /* ── Your role ── */
        .role-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 8px;
          padding: 16px 20px;
        }
        .role-box ul { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .role-box li { font-size: 12.5px; color: #78350f; display: flex; gap: 8px; align-items: flex-start; }
        .role-box li::before { content: '→'; color: #d97706; font-weight: 700; flex-shrink: 0; }

        /* ── What you'll receive ── */
        .receive-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .receive-item {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .receive-emoji { font-size: 22px; display: block; margin-bottom: 6px; }
        .receive-title { font-size: 12px; font-weight: 600; color: #111827; }
        .receive-desc { font-size: 11px; color: #9ca3af; margin-top: 2px; line-height: 1.4; }

        /* ── Timeline ── */
        .timeline { display: flex; gap: 0; }
        .tl-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
        .tl-item:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 14px;
          left: calc(50% + 14px);
          right: calc(-50% + 14px);
          height: 2px;
          background: #e0e7ff;
          z-index: 0;
        }
        .tl-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: #4f46e5;
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          margin-bottom: 6px;
        }
        .tl-label { font-size: 10.5px; font-weight: 600; color: #4f46e5; text-align: center; }
        .tl-desc { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 2px; line-height: 1.4; }

        /* ── Footer ── */
        .footer {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 14px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .footer-left { font-size: 11px; color: #9ca3af; }
        .footer-left strong { color: #6b7280; }
        .footer-right { font-size: 11px; color: #9ca3af; text-align: right; }
        .footer-right a { color: #4f46e5; text-decoration: none; }

        /* ── Print button (hidden on print) ── */
        .print-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          background: #4f46e5;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 10px;
          z-index: 100;
          font-size: 13px;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .print-bar button {
          background: white;
          color: #4f46e5;
          border: none;
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .print-bar a {
          color: rgba(255,255,255,0.75);
          text-decoration: underline;
          font-size: 12px;
        }

        @media print {
          body { background: white; }
          .page { margin: 0; border-radius: 0; box-shadow: none; min-height: 100vh; }
          .print-bar { display: none !important; }
          @page { margin: 0; size: A4; }
        }
      `}</style>

      {/* Print bar */}
      <div className="print-bar">
        <span>📄 Client Onboarding Guide — ready to save as PDF</span>
        <button onClick={() => window.print()}>🖨️ Save as PDF</button>
        <a href="javascript:history.back()">← Back to Dashboard</a>
      </div>

      <div style={{ paddingTop: 44 }}>
        <div className="page">

          {/* ── Header ── */}
          <div className="header">
            <div className="header-badge">🐾 Veterinary AI SEO Worker</div>
            <h1>Your practice is now being ranked<br />by <span>AI search assistants.</span></h1>
            <p className="header-sub">
              Welcome to the future of local veterinary marketing — fully automated, no guesswork.
            </p>
            <div className="header-meta">
              {clinicName && <span>🏥 {clinicName}</span>}
              {city && <span>📍 {city}</span>}
              {address && <span>🗺️ {address}</span>}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="body">

            {/* What we do */}
            <section>
              <div className="section-title">What your AI worker does automatically</div>
              <div className="what-grid">
                <div className="what-item">
                  <span className="what-emoji">🔍</span>
                  <div>
                    <div className="what-title">GEO Visibility Testing</div>
                    <div className="what-desc">Asks ChatGPT &amp; Perplexity "{city ? `best vet in ${city}` : 'best vet near me'}" and 24 similar queries every week. Tracks if you're being recommended.</div>
                  </div>
                </div>
                <div className="what-item">
                  <span className="what-emoji">📍</span>
                  <div>
                    <div className="what-title">NAP Consistency Audit</div>
                    <div className="what-desc">Checks 15 directories (Google, Yelp, Bing, Yellow Pages…) weekly. Flags any mismatch in your name, address, or phone number.</div>
                  </div>
                </div>
                <div className="what-item">
                  <span className="what-emoji">✍️</span>
                  <div>
                    <div className="what-title">Content Publishing</div>
                    <div className="what-desc">Publishes supporting articles on high-authority platforms (Google Docs, GitHub, Notion, WordPress) to strengthen your online presence.</div>
                  </div>
                </div>
                <div className="what-item">
                  <span className="what-emoji">💬</span>
                  <div>
                    <div className="what-title">Community Monitoring</div>
                    <div className="what-desc">Monitors Reddit and local communities for vet questions. Drafts helpful replies for your approval — never posts without you.</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Week 1 timeline */}
            <section>
              <div className="section-title">Your first week</div>
              <div className="timeline">
                {[
                  { label: 'Monday', desc: 'GEO baseline test — establishes your starting citation rate' },
                  { label: 'Tuesday', desc: 'First content batch published to 4 platforms' },
                  { label: 'Wednesday', desc: 'NAP audit — all 15 directories checked' },
                  { label: 'Thursday', desc: 'Second content batch published' },
                  { label: 'Friday', desc: 'First weekly report ready to review' },
                ].map((item, i) => (
                  <div className="tl-item" key={i}>
                    <div className="tl-dot">{i + 1}</div>
                    <div className="tl-label">{item.label}</div>
                    <div className="tl-desc">{item.desc}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Ongoing schedule */}
            <section>
              <div className="section-title">Ongoing weekly schedule</div>
              <div className="schedule">
                {[
                  { day: 'Every Monday', emoji: '🔍', task: '<strong>GEO Test</strong> — 25 AI queries across ChatGPT + Perplexity' },
                  { day: 'Tue + Thursday', emoji: '✍️', task: '<strong>Content Batch</strong> — Web 2.0 articles + semantic stack pages published' },
                  { day: 'Every Wednesday', emoji: '📍', task: '<strong>NAP Audit</strong> — All 15 directories checked for consistency' },
                  { day: 'Daily (8am + 6pm)', emoji: '💬', task: '<strong>Reddit Monitor</strong> — Community replies drafted for your review' },
                  { day: 'Every Friday', emoji: '📊', task: '<strong>Weekly Report</strong> — GEO trend, NAP health, content published this week' },
                ].map((item, i) => (
                  <div className="schedule-row" key={i}>
                    <div className="schedule-day">{item.day}</div>
                    <div className="schedule-task">
                      <span>{item.emoji}</span>
                      <span dangerouslySetInnerHTML={{ __html: item.task }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Two-column: What you'll receive + Your only job */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <section>
                <div className="section-title">What you receive</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { emoji: '📊', title: 'Weekly Report', desc: 'GEO citation rate, trend, NAP issues, content count — every Friday' },
                    { emoji: '🔔', title: 'Review Alerts', desc: 'Notified when a Reddit reply is ready for your approval' },
                    { emoji: '📈', title: 'Monthly Summary', desc: '30-day rollup with progress vs. baseline' },
                  ].map((item, i) => (
                    <div className="what-item" key={i} style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 16, lineHeight: 1, marginTop: 2 }}>{item.emoji}</span>
                      <div>
                        <div className="what-title" style={{ fontSize: 12 }}>{item.title}</div>
                        <div className="what-desc" style={{ fontSize: 11 }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="section-title">Your only job (3 things)</div>
                <div className="role-box" style={{ height: 'calc(100% - 26px)' }}>
                  <ul>
                    <li><strong>Check your review queue weekly</strong> — approve or edit Reddit replies before they go live. Takes 5 minutes.</li>
                    <li><strong>Read Friday reports</strong> — see your GEO citation rate trending up. Share with your front desk team.</li>
                    <li><strong>Fix flagged NAP mismatches</strong> — when the audit finds a wrong phone number on Yelp, log in and update it. We tell you exactly what to fix.</li>
                  </ul>
                  <p style={{ fontSize: 11, color: '#92400e', marginTop: 12, fontStyle: 'italic' }}>
                    Everything else runs automatically. No blog writing, no directory submissions, no social posting required from you.
                  </p>
                </div>
              </section>
            </div>

            {/* Services being targeted */}
            {services.length > 0 && (
              <section>
                <div className="section-title">Services being optimized for AI search</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {services.map((s, i) => (
                    <span key={i} style={{
                      background: '#ede9fe', color: '#5b21b6',
                      borderRadius: 20, padding: '4px 12px',
                      fontSize: 12, fontWeight: 500,
                      border: '1px solid #ddd6fe',
                    }}>🐾 {s}</span>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* ── Footer ── */}
          <div className="footer">
            <div className="footer-left">
              Managed by <strong>{agencyName}</strong> · Powered by Kyra AI Workforce Platform
            </div>
            <div className="footer-right">
              Questions? {agencyEmail
                ? <a href={`mailto:${agencyEmail}`}>{agencyEmail}</a>
                : 'Contact your agency manager'}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
