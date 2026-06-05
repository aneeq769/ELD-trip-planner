import React, { useState } from "react";
import TripForm from "./components/TripForm";
import TripMap from "./components/TripMap";
import ELDLogs from "./components/ELDLogs";
import TripSummary from "./components/TripSummary";
import axios from "axios";
import "./index.css";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tripData, setTripData] = useState(null);
  const [activeTab, setActiveTab] = useState("map");

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setTripData(null);
    try {
      const res = await axios.post(`${API_BASE}/api/trip/plan/`, formData);
      setTripData(res.data);
      setActiveTab("map");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🚛</span>
            <div>
              <div className="logo-title">ELD Trip Planner</div>
              <div className="logo-sub">FMCSA HOS Compliant • Property Carrier</div>
            </div>
          </div>
          <div className="header-badges">
            <span className="badge">70hr/8-Day Rule</span>
            <span className="badge">11-Hr Driving Limit</span>
            <span className="badge">14-Hr Window</span>
          </div>
        </div>
      </header>

      <div className="main-content">
        <aside className="left-panel">
          <TripForm onSubmit={handleSubmit} loading={loading} />
          {error && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {tripData && <TripSummary summary={tripData.summary} locations={tripData.locations} route={tripData.route} />}
        </aside>

        <main className="right-panel">
          {!tripData && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🗺️</div>
              <h2>Plan Your Trip</h2>
              <p>Enter your trip details on the left to generate an FMCSA-compliant route with ELD daily logs.</p>
              <div className="feature-list">
                <div className="feature-item"><span>📍</span> Interactive route map</div>
                <div className="feature-item"><span>⏰</span> HOS-compliant stop planning</div>
                <div className="feature-item"><span>📋</span> Auto-generated ELD log sheets</div>
                <div className="feature-item"><span>⛽</span> Fuel stops every 1,000 miles</div>
              </div>
            </div>
          )}
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <h2>Planning your route...</h2>
              <p>Calculating HOS-compliant stops and generating ELD logs</p>
            </div>
          )}
          {tripData && (
            <>
              <div className="tabs">
                {[
                  { key: "map", label: "🗺️ Route Map" },
                  { key: "logs", label: "📋 ELD Logs" },
                ].map((t) => (
                  <button
                    key={t.key}
                    className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                    {t.key === "logs" && (
                      <span className="tab-badge">{tripData.day_logs.length}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="tab-content">
                {activeTab === "map" && (
                  <TripMap
                    route={tripData.route}
                    stops={tripData.stops}
                    locations={tripData.locations}
                  />
                )}
                {activeTab === "logs" && (
                  <ELDLogs dayLogs={tripData.day_logs} summary={tripData.summary} />
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
