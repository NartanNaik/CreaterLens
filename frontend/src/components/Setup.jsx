import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { APK_URL, APK_READY, EXTENSION_URL } from '../../config/links';

const PencilIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);

const PhoneIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
    <line x1="12" y1="18" x2="12.01" y2="18"></line>
  </svg>
);

const PuzzleIcon = () => (
  <svg className="svg-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"></path>
  </svg>
);

export default function Setup() {
  const navigate = useNavigate();
  const { finishSetup } = useOutletContext() || {};

  return (
    <div className="setup-page">
      <div className="setup-header">
        <h1 className="setup-title">Welcome to CreatorLens</h1>
        <p className="setup-subtitle">
          There are three ways to get creators into your dashboard. Use whichever you like, or all of them.
          You can reopen this page any time from the Guide menu.
        </p>
      </div>

      <div className="setup-grid">
        {/* 1. Manual */}
        <section className="setup-card glass-panel">
          <div className="setup-card-icon"><PencilIcon /></div>
          <h2 className="setup-card-title">Add by hand</h2>
          <p className="setup-card-text">Best for a few creators you already know.</p>
          <ol className="setup-steps">
            <li>Open the Dashboard.</li>
            <li>Type the username in the check box at the top. It tells you if you already have them.</li>
            <li>If the username is free, fill in the link and your columns, then add it.</li>
          </ol>
          <div className="setup-card-actions">
            <button type="button" className="action-btn btn-primary" onClick={() => navigate('/dashboard')}>
              Open Dashboard
            </button>
          </div>
        </section>

        {/* 2. Mobile app */}
        <section className="setup-card glass-panel">
          <div className="setup-card-icon"><PhoneIcon /></div>
          <h2 className="setup-card-title">Mobile app</h2>
          <p className="setup-card-text">Share a reel from Instagram and it lands in your Staging Queue.</p>
          <ol className="setup-steps">
            <li>Download and install the Android app. Allow "install unknown apps" if your phone asks.</li>
            <li>Sign in with the same Google account you use here.</li>
            <li>In Instagram open a reel, tap Share, then choose CreatorLens.</li>
          </ol>
          <div className="setup-card-actions">
            {APK_READY ? (
              <a className="action-btn btn-primary" href={APK_URL} target="_blank" rel="noopener noreferrer">
                Download the app
              </a>
            ) : (
              <button type="button" className="action-btn" disabled>Download link coming soon</button>
            )}
          </div>
        </section>

        {/* 3. Garbage Eater */}
        <section className="setup-card glass-panel">
          <div className="setup-card-icon"><PuzzleIcon /></div>
          <h2 className="setup-card-title">Import saved posts</h2>
          <p className="setup-card-text">Best for bringing in many creators at once from your Instagram saved posts.</p>
          <ol className="setup-steps">
            <li>Install the "Saved Posts Library Exporter" Chrome extension.</li>
            <li>Use it to export your saved posts as a JSON file, then copy the file's text.</li>
            <li>Paste it into the JSON Garbage Eater on the Staging Queue page.</li>
          </ol>
          <div className="setup-card-actions">
            <a className="action-btn" href={EXTENSION_URL} target="_blank" rel="noopener noreferrer">
              Get the extension
            </a>
            <button type="button" className="action-btn btn-primary" onClick={() => navigate('/staging')}>
              Open Staging Queue
            </button>
          </div>
        </section>
      </div>

      <div className="setup-footer">
        <button type="button" className="action-btn" onClick={() => finishSetup && finishSetup()}>
          Skip for now
        </button>
        <button type="button" className="action-btn btn-primary" onClick={() => finishSetup && finishSetup()}>
          Done, show me around
        </button>
      </div>
    </div>
  );
}