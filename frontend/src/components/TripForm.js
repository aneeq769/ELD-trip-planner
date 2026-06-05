import React, { useState } from "react";
import "./TripForm.css";

const EXAMPLES = [
  {
    label: "Chicago → NYC",
    current_location: "Chicago, IL",
    pickup_location: "Chicago, IL",
    dropoff_location: "New York, NY",
    current_cycle_used: 0,
  },
  {
    label: "LA → Dallas",
    current_location: "Los Angeles, CA",
    pickup_location: "Los Angeles, CA",
    dropoff_location: "Dallas, TX",
    current_cycle_used: 20,
  },
  {
    label: "Atlanta → Boston",
    current_location: "Atlanta, GA",
    pickup_location: "Atlanta, GA",
    dropoff_location: "Boston, MA",
    current_cycle_used: 35,
  },
];

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleExample = (ex) => {
    setForm({
      current_location: ex.current_location,
      pickup_location: ex.pickup_location,
      dropoff_location: ex.dropoff_location,
      current_cycle_used: String(ex.current_cycle_used),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.current_location || !form.pickup_location || !form.dropoff_location) return;
    onSubmit({
      ...form,
      current_cycle_used: parseFloat(form.current_cycle_used) || 0,
    });
  };

  const cycleVal = parseFloat(form.current_cycle_used) || 0;
  const cyclePercent = Math.min((cycleVal / 70) * 100, 100);
  const cycleColor = cyclePercent > 80 ? "#ef4444" : cyclePercent > 60 ? "#f59e0b" : "#22c55e";

  return (
    <div className="trip-form-card">
      <div className="form-header">
        <h2>Trip Details</h2>
        <p>Enter your route and cycle information</p>
      </div>

      {/* Quick examples */}
      <div className="quick-examples">
        <span className="examples-label">Quick fill:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex.label} className="example-btn" onClick={() => handleExample(ex)} type="button">
            {ex.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="form-body">
        <div className="form-group">
          <label>
            <span className="label-icon">📍</span>
            Current Location
          </label>
          <input
            name="current_location"
            value={form.current_location}
            onChange={handleChange}
            placeholder="e.g., Chicago, IL"
            required
          />
        </div>

        <div className="route-connector">
          <div className="form-group">
            <label>
              <span className="label-icon">🟢</span>
              Pickup Location
            </label>
            <input
              name="pickup_location"
              value={form.pickup_location}
              onChange={handleChange}
              placeholder="e.g., Gary, IN"
              required
            />
          </div>
          <div className="connector-line">
            <div className="connector-dot"></div>
            <div className="connector-track"></div>
            <div className="connector-dot"></div>
          </div>
          <div className="form-group">
            <label>
              <span className="label-icon">🔴</span>
              Dropoff Location
            </label>
            <input
              name="dropoff_location"
              value={form.dropoff_location}
              onChange={handleChange}
              placeholder="e.g., New York, NY"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>
            <span className="label-icon">⏱️</span>
            Current Cycle Used (Hours)
            <span className="label-hint">70hr/8-day limit</span>
          </label>
          <input
            name="current_cycle_used"
            type="number"
            min="0"
            max="70"
            step="0.5"
            value={form.current_cycle_used}
            onChange={handleChange}
            placeholder="0"
          />
          {cycleVal > 0 && (
            <div className="cycle-bar-wrap">
              <div className="cycle-bar">
                <div
                  className="cycle-bar-fill"
                  style={{ width: `${cyclePercent}%`, background: cycleColor }}
                />
              </div>
              <span className="cycle-label" style={{ color: cycleColor }}>
                {cycleVal}h / 70h used
              </span>
            </div>
          )}
        </div>

        <div className="hos-rules">
          <div className="rules-title">HOS Rules Applied</div>
          <div className="rules-grid">
            <div className="rule-item"><span>🚗</span> 11hr driving/shift</div>
            <div className="rule-item"><span>⏰</span> 14hr on-duty window</div>
            <div className="rule-item"><span>😴</span> 10hr mandatory rest</div>
            <div className="rule-item"><span>☕</span> 30min break after 8hrs</div>
            <div className="rule-item"><span>⛽</span> Fuel every 1,000mi</div>
            <div className="rule-item"><span>📦</span> 1hr pickup & dropoff</div>
          </div>
        </div>

        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="btn-spinner"></span>
              Planning Route...
            </>
          ) : (
            <>
              <span>🗺️</span>
              Plan Trip
            </>
          )}
        </button>
      </form>
    </div>
  );
}
