import React from "react";
import "./TripSummary.css";

export default function TripSummary({ summary, locations, route }) {
  const cards = [
    { icon: "📏", label: "Total Distance", value: `${summary.total_miles} mi` },
    { icon: "📅", label: "Total Days", value: `${summary.total_days} day${summary.total_days !== 1 ? "s" : ""}` },
    { icon: "🚗", label: "Driving Time", value: `${summary.total_driving_hours}h` },
    { icon: "⏱️", label: "Trip Duration", value: `${summary.total_trip_hours}h` },
    { icon: "😴", label: "Rest Stops", value: summary.num_rest_stops },
    { icon: "⛽", label: "Fuel Stops", value: summary.num_fuel_stops },
    { icon: "☕", label: "30-min Breaks", value: summary.num_breaks },
    { icon: "🔋", label: "Cycle After Trip", value: `${summary.cycle_hours_used}h / 70h` },
  ];

  return (
    <div className="trip-summary">
      <div className="summary-header">
        <span className="summary-check">✅</span>
        <div>
          <div className="summary-title">Trip Planned!</div>
          <div className="summary-route">
            <span>{locations.current.name.split(",")[0]}</span>
            <span className="arrow">→</span>
            <span>{locations.pickup.name.split(",")[0]}</span>
            <span className="arrow">→</span>
            <span>{locations.dropoff.name.split(",")[0]}</span>
          </div>
        </div>
      </div>
      <div className="summary-grid">
        {cards.map((c) => (
          <div key={c.label} className="summary-card">
            <div className="sc-icon">{c.icon}</div>
            <div className="sc-value">{c.value}</div>
            <div className="sc-label">{c.label}</div>
          </div>
        ))}
      </div>
      {Array.isArray(route?.instructions) && route.instructions.length > 0 && (
        <div className="summary-instructions">
          <div className="instructions-title">Route Instructions</div>
          <div className="instructions-list">
            {route.instructions.map((leg) => (
              <div key={leg.leg} className="instruction-leg">
                <div className="instruction-leg-header">
                  <span>{leg.label}</span>
                  <span>{leg.distance_miles} mi</span>
                </div>
                <ol className="instruction-steps">
                  {leg.steps.map((step) => (
                    <li key={`${leg.leg}-${step.step}`} className="instruction-step">
                      <span className="instruction-step-text">{step.text}</span>
                      <span className="instruction-step-meta">
                        {step.distance_miles} mi, {step.duration_hours}h
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
