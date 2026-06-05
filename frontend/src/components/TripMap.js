import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./TripMap.css";

const STOP_COLORS = {
  pickup: "#22c55e",
  dropoff: "#ef4444",
  fuel: "#f59e0b",
  rest: "#6366f1",
  restart: "#a855f7",
  break: "#06b6d4",
  pre_trip: "#94a3b8",
  drive_segment: "#4f6ef7",
};

const STOP_ICONS = {
  pickup: "🟢",
  dropoff: "🔴",
  fuel: "⛽",
  rest: "😴",
  restart: "34",
  break: "☕",
  pre_trip: "🔧",
  drive_segment: "🚛",
};

const LEG_COLORS = {
  leg1: { color: "#3b82f6", weight: 5, opacity: 0.9 },
  leg2: { color: "#8b5cf6", weight: 5, opacity: 0.9 },
};

export default function TripMap({ route, stops, locations }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const stopMarkersRef = useRef([]);
  const polyinesRef = useRef([]);
  const [visibleStops, setVisibleStops] = useState({});
  const [selectedStopId, setSelectedStopId] = useState(null);

  useEffect(() => {
    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mapInstanceRef.current && route && stops) {
      renderRoute();
    }
  }, [route, stops, visibleStops]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    window.requestAnimationFrame(() => {
      mapInstanceRef.current?.invalidateSize?.();
    });
  }, [route, stops]);

  const initMap = () => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }
    const map = L.map(mapRef.current, { 
      zoomControl: false,
      scrollWheelZoom: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);
    
    L.control.zoom({ position: "topright" }).addTo(map);
    
    mapInstanceRef.current = map;
    
    const stopTypes = ["pickup", "dropoff", "fuel", "rest", "restart", "break"];
    const initialVisibility = {};
    stopTypes.forEach(type => {
      initialVisibility[type] = true;
    });
    setVisibleStops(initialVisibility);
    
    renderRoute(map);
  }

  const renderRoute = (map = mapInstanceRef.current) => {
    if (!map) return;

    clearMapLayers(map);
    markersRef.current = [];
    stopMarkersRef.current = [];
    polyinesRef.current = [];
    const bounds = [];

    if (!route?.geometry) return;

    // Calculate split point for leg 1 (current to pickup) and leg 2 (pickup to dropoff)
    const pickupLat = locations?.pickup?.lat;
    const pickupLon = locations?.pickup?.lon;
    const pickupCoords = Number.isFinite(pickupLat) && Number.isFinite(pickupLon)
      ? [pickupLon, pickupLat]
      : null;
    
    let splitIndex = -1;
    if (route.geometry.length > 0 && pickupCoords) {
      const minDist = 0.05;
      for (let i = 0; i < route.geometry.length; i++) {
        const dist = Math.hypot(route.geometry[i][0] - pickupCoords[0], route.geometry[i][1] - pickupCoords[1]);
        if (dist < minDist) {
          splitIndex = i;
          break;
        }
      }
    }

    // Render Leg 1: Current → Pickup
    if (splitIndex > 0) {
      const leg1Coords = route.geometry.slice(0, splitIndex + 1).map(p => [p[1], p[0]]);
      const leg1Polyline = L.polyline(leg1Coords, LEG_COLORS.leg1);
      leg1Polyline.addTo(map);
      polyinesRef.current.push(leg1Polyline);
      leg1Coords.forEach(p => bounds.push(p));
    }

    // Render Leg 2: Pickup → Dropoff
    if (splitIndex >= 0 && splitIndex < route.geometry.length - 1) {
      const leg2Coords = route.geometry.slice(splitIndex).map(p => [p[1], p[0]]);
      const leg2Polyline = L.polyline(leg2Coords, LEG_COLORS.leg2);
      leg2Polyline.addTo(map);
      polyinesRef.current.push(leg2Polyline);
      leg2Coords.forEach(p => bounds.push(p));
    } else if (splitIndex < 0) {
      const fullCoords = route.geometry.map(p => [p[1], p[0]]);
      const mainPolyline = L.polyline(fullCoords, { color: "#3b82f6", weight: 5, opacity: 0.9 });
      mainPolyline.addTo(map);
      polyinesRef.current.push(mainPolyline);
      fullCoords.forEach(p => bounds.push(p));
    }

    // Add location markers
    renderLocationMarkers(map, bounds);

    // Add stop markers
    const relevantStops = stops.filter(s => s.type !== "drive_segment");
    relevantStops.forEach((stop, idx) => {
      if (!visibleStops[stop.type]) return;
      renderStopMarker(map, stop, idx);
      bounds.push([stop.lat, stop.lon]);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const clearMapLayers = (map) => {
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer) && !(layer instanceof L.Control.Zoom)) {
        map.removeLayer(layer);
      }
    });
  };

  const renderLocationMarkers = (map, bounds) => {
    const locationMarkers = [
      { 
        name: "Current Location", 
        coords: locations?.current, 
        icon: "📍",
        type: "current",
        color: "#ef4444"
      },
      { 
        name: "Pickup", 
        coords: locations?.pickup, 
        icon: "🟢",
        type: "pickup",
        color: "#22c55e"
      },
      { 
        name: "Dropoff", 
        coords: locations?.dropoff, 
        icon: "🔴",
        type: "dropoff",
        color: "#ef4444"
      },
    ];

    locationMarkers.forEach(({ name, coords, icon, type, color }) => {
      if (!coords?.lat || !coords?.lon) return;

      const markerHtml = `
        <div class="location-marker" style="background:${color};border:4px solid white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(0,0,0,0.6),inset 0 0 0 2px ${color};cursor:pointer;transition:transform 0.2s;">
          ${icon}
        </div>`;

      const leafletIcon = L.divIcon({
        html: markerHtml,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -25],
      });

      const marker = L.marker([coords.lat, coords.lon], { icon: leafletIcon });
      const popupContent = `
        <div class="map-popup" style="font-family:system-ui;min-width:180px;padding:2px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#111;">${name}</div>
          <div style="font-size:12px;color:#555;line-height:1.6;">
            <div>📍 ${coords.name || "Location"}</div>
            <div>📌 ${coords.lat.toFixed(4)}° N, ${coords.lon.toFixed(4)}° W</div>
          </div>
        </div>`;
      
      marker.bindPopup(popupContent, { maxWidth: 250, className: "custom-popup" });
      marker.addTo(map);
      bounds.push([coords.lat, coords.lon]);
      markersRef.current.push(marker);
    });
  };

  const renderStopMarker = (map, stop, idx) => {
    const color = STOP_COLORS[stop.type] || "#888";
    const icon = STOP_ICONS[stop.type] || "📍";
    const dayColor = getDayColor(stop.day);

    const markerHtml = `
      <div class="stop-marker" data-stop-id="${idx}" style="
        background:${color};
        border:3px solid white;
        border-radius:50%;
        width:36px;
        height:36px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:16px;
        box-shadow:0 3px 10px rgba(0,0,0,0.5);
        cursor:pointer;
        transition:all 0.2s;
        position:relative;
      ">
        <div style="position:absolute;top:0;right:0;width:10px;height:10px;background:${dayColor};border:2px solid white;border-radius:50%;"></div>
        ${icon}
      </div>`;

    const leafletIcon = L.divIcon({
      html: markerHtml,
      className: "stop-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -22],
    });

    const arrH = Math.floor(stop.arrival_time % 24);
    const arrM = Math.round((stop.arrival_time % 1) * 60);
    const depH = Math.floor(stop.departure_time % 24);
    const depM = Math.round((stop.departure_time % 1) * 60);

    const popupContent = `
      <div class="map-popup" style="font-family:system-ui;min-width:220px;padding:2px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#111;">${stop.label}</div>
        <div style="font-size:12px;color:#555;line-height:1.8;">
          <div><strong>📅 Day:</strong> ${stop.day}</div>
          <div><strong>⏰ Arrival:</strong> ${String(arrH).padStart(2,"0")}:${String(arrM).padStart(2,"0")}</div>
          <div><strong>🚪 Departure:</strong> ${String(depH).padStart(2,"0")}:${String(depM).padStart(2,"0")}</div>
          <div><strong>⏱️ Duration:</strong> ${(stop.duration_hours * 60).toFixed(0)} min</div>
          <div><strong>📍 Mile:</strong> ${Math.round(stop.miles_from_start)}</div>
          <div><strong>🚦 Status:</strong> ${stop.duty_status}</div>
        </div>
      </div>`;

    const marker = L.marker([stop.lat, stop.lon], { icon: leafletIcon });
    marker.bindPopup(popupContent, { maxWidth: 280, className: "custom-popup" });
    marker.on("click", () => setSelectedStopId(idx));
    marker.addTo(map);
    markersRef.current.push(marker);
    stopMarkersRef.current[idx] = marker;
  };

  const getDayColor = (day) => {
    const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981", "#06b6d4"];
    return colors[(day - 1) % colors.length];
  };

  const toggleStopVisibility = (stopType) => {
    setVisibleStops(prev => ({
      ...prev,
      [stopType]: !prev[stopType]
    }));
  };

  const stopSummary = stops.filter((s) => s.type !== "drive_segment");
  const stopCounts = {
    pickup: stopSummary.filter(s => s.type === "pickup").length,
    dropoff: stopSummary.filter(s => s.type === "dropoff").length,
    fuel: stopSummary.filter(s => s.type === "fuel").length,
    rest: stopSummary.filter(s => s.type === "rest").length,
    restart: stopSummary.filter(s => s.type === "restart").length,
    break: stopSummary.filter(s => s.type === "break").length,
  };

  return (
    <div className="trip-map-wrap">
      <div ref={mapRef} className="map-container" />
      
      <div className="map-info-bar">
        <div className="route-summary">
          <span className="route-stat">
            <strong>📏 Leg 1 (Current→Pickup):</strong> {route?.leg1_miles || "—"} mi
          </span>
          <span className="route-stat">
            <strong>📏 Leg 2 (Pickup→Dropoff):</strong> {route?.leg2_miles || "—"} mi
          </span>
          <span className="route-stat">
            <strong>📍 Total:</strong> {route?.total_miles || "—"} mi
          </span>
        </div>
      </div>

      <div className="map-legend">
        <div className="legend-title">Stop Filters</div>
        <div className="legend-items">
          {[
            { type: "pickup", label: "Pickups", count: stopCounts.pickup },
            { type: "dropoff", label: "Dropoffs", count: stopCounts.dropoff },
            { type: "fuel", label: "Fuel", count: stopCounts.fuel },
            { type: "rest", label: "Rest (10hr)", count: stopCounts.rest },
            { type: "restart", label: "Restart (34hr)", count: stopCounts.restart },
            { type: "break", label: "Break (30min)", count: stopCounts.break },
          ].map(({ type, label, count }) => (
            <button
              key={type}
              className={`legend-toggle ${visibleStops[type] ? "active" : "inactive"}`}
              onClick={() => toggleStopVisibility(type)}
              title={`Toggle ${label} visibility`}
            >
              <span 
                className="legend-color" 
                style={{ background: STOP_COLORS[type] }}
              />
              <span className="legend-icon">{STOP_ICONS[type]}</span>
              <span className="legend-text">{label}</span>
              {count > 0 && <span className="legend-count">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="stops-timeline">
        <div className="timeline-title">Route Timeline</div>
        <div className="timeline-list">
          {stopSummary.map((stop, i) => {
            const arrH = Math.floor(stop.arrival_time % 24);
            const arrM = Math.round((stop.arrival_time % 1) * 60);
            const dayColor = getDayColor(stop.day);
            const isSelected = selectedStopId === i;
            
            return (
              <div 
                key={i} 
                className={`timeline-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setSelectedStopId(isSelected ? null : i);
                  if (stopMarkersRef.current[i]) {
                    stopMarkersRef.current[i].openPopup();
                  }
                }}
              >
                <div className="timeline-day-badge" style={{ background: dayColor }}>
                  Day {stop.day}
                </div>
                <div
                  className="timeline-dot"
                  style={{ background: STOP_COLORS[stop.type] || "#888" }}
                />
                <div className="timeline-info">
                  <div className="timeline-label">{stop.label}</div>
                  <div className="timeline-meta">
                    {String(arrH).padStart(2,"0")}:{String(arrM).padStart(2,"0")} • {(stop.duration_hours * 60).toFixed(0)}min • Mile {Math.round(stop.miles_from_start)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
