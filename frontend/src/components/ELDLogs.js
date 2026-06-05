import React, { useRef, useEffect, useState } from "react";
import "./ELDLogs.css";

const STATUS_COLORS = {
  off_duty: "#6366f1",
  sleeper: "#8b5cf6",
  driving: "#22c55e",
  on_duty: "#f59e0b",
};

const STATUS_ROW = {
  off_duty: 0,
  sleeper: 1,
  driving: 2,
  on_duty: 3,
};

const STATUS_LABELS = [
  { label: "1. Off Duty", marker: "REST", abbr: "OD" },
  { label: "2. Sleeper Berth", marker: "SLEEPER", abbr: "SB" },
  { label: "3. Driving", marker: "DRIVE", abbr: "D" },
  { label: "4. On Duty (not driving)", marker: "WORK", abbr: "OOD" },
];

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 24;

export default function ELDLogs({ dayLogs = [], summary = {} }) {
  const [currentDay, setCurrentDay] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const currentLog = dayLogs[currentDay];
  const totalMiles = summary?.total_miles || dayLogs.reduce((sum, log) => sum + Number(log.total_miles || 0), 0);

  const handleDownloadDayPNG = (index) => {
    const log = dayLogs[index];
    const canvas = document.getElementById(`eld-canvas-${index}`);
    if (!log || !canvas) return;

    downloadDataUrl(canvas.toDataURL("image/png"), `ELD_Log_Day_${log.day_number}.png`);
  };

  const handleDownloadAllPDF = () => {
    if (!dayLogs.length || isExporting) return;

    setIsExporting(true);
    window.setTimeout(() => {
      try {
        const canvases = dayLogs.map((log) => {
          const canvas = document.createElement("canvas");
          drawFMCSALogSheet(canvas, log, summary);
          return canvas;
        });

        const pdfBlob = createPdfFromCanvases(canvases);
        downloadBlob(pdfBlob, `ELD_Logs_${dayLogs.length}_Days.pdf`);
      } finally {
        setIsExporting(false);
      }
    }, 0);
  };

  if (!dayLogs.length) {
    return (
      <div className="eld-logs-wrap">
        <div className="eld-empty-panel">
          <h2>Generated ELD Logs</h2>
          <p>Run a trip plan to preview and download completed daily logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="eld-logs-wrap">
      <div className="eld-preview-header">
        <div>
          <p className="eld-eyebrow">Output preview</p>
          <h2>Generated ELD Logs</h2>
          <p>Review each completed daily log before downloading the full PDF package.</p>
        </div>
        <div className="eld-preview-meta" aria-label="ELD log package summary">
          <span>{dayLogs.length} day{dayLogs.length === 1 ? "" : "s"}</span>
          <span>{Math.round(totalMiles)} miles</span>
        </div>
      </div>

      <div className="eld-controls-bar">
        <div className="eld-control-group">
          <span className="control-label">Daily PNG</span>
          {dayLogs.map((log, i) => (
            <button
              key={log.day_number || i}
              className="download-btn secondary"
              onClick={() => handleDownloadDayPNG(i)}
              title={`Download Day ${log.day_number} as PNG`}
            >
              Day {log.day_number}
            </button>
          ))}
        </div>
        <div className="eld-control-group">
          <button
            className="download-btn download-all"
            onClick={handleDownloadAllPDF}
            disabled={isExporting}
            title="Download all completed ELD logs as a PDF"
          >
            {isExporting ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div className="day-tabs" role="tablist" aria-label="ELD log days">
        {dayLogs.map((log, i) => (
          <button
            key={log.day_number || i}
            className={`day-tab ${currentDay === i ? "active" : ""}`}
            onClick={() => setCurrentDay(i)}
            role="tab"
            aria-selected={currentDay === i}
          >
            <span className="day-tab-day">Day {log.day_number}</span>
            <span className="day-tab-stats">
              {formatHours(log.total_driving)}h / {Math.round(log.total_miles || 0)} mi
            </span>
          </button>
        ))}
      </div>

      {currentLog && (
        <ELDLogSheet
          log={currentLog}
          summary={summary}
          index={currentDay}
          onDownload={() => handleDownloadDayPNG(currentDay)}
        />
      )}

      <div className="eld-download-note">
        <span>PDF export includes every completed daily log in the current trip plan.</span>
      </div>
    </div>
  );
}

function ELDLogSheet({ log, summary, index, onDownload }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawFMCSALogSheet(canvasRef.current, log, summary);
    }
  }, [log, summary]);

  const dailyOnDuty = Number(log.total_driving || 0) + Number(log.total_on_duty || 0);
  const cycleHours = Number(summary?.cycle_hours_used || 0);
  const isCompliant = dailyOnDuty <= 11 && cycleHours <= 70;

  return (
    <div className="eld-canvas-wrap">
      <div className="eld-sheet-toolbar">
        <div>
          <p className="eld-eyebrow">Clean preview</p>
          <h3>Day {log.day_number} - Driver's Daily Log</h3>
        </div>
        <button className="download-btn secondary" onClick={onDownload}>
          Download PNG
        </button>
      </div>

      <div className="eld-stats-bar">
        <Metric dot={STATUS_COLORS.driving} label="Driving" value={`${formatHours(log.total_driving)}h`} />
        <Metric dot={STATUS_COLORS.on_duty} label="On Duty" value={`${formatHours(log.total_on_duty)}h`} />
        <Metric dot={STATUS_COLORS.off_duty} label="Off Duty" value={`${formatHours(log.total_off_duty)}h`} />
        <Metric dot={STATUS_COLORS.sleeper} label="Sleeper" value={`${formatHours(log.total_sleeper)}h`} />
        <div className="eld-stat separator" />
        <Metric label="Total Miles" value={Math.round(log.total_miles || 0)} />
        <div className={`eld-compliance-pill ${isCompliant ? "ok" : "alert"}`}>
          {isCompliant ? "HOS compliant" : "Review HOS"}
        </div>
      </div>

      <div className="eld-canvas-stage">
        <canvas ref={canvasRef} id={`eld-canvas-${index}`} className="eld-canvas" />
      </div>
    </div>
  );
}

function Metric({ dot, label, value }) {
  return (
    <div className="eld-stat">
      {dot && <span className="eld-stat-dot" style={{ background: dot }} />}
      <span className="eld-stat-label">{label}</span>
      <span className="eld-stat-value">{value}</span>
    </div>
  );
}

function drawFMCSALogSheet(canvas, log, summary = {}) {
  const W = 900;
  const H = 1100;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  const headerH = 54;
  ctx.fillStyle = "#111827";
  ctx.fillRect(8, 8, W - 16, headerH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 19px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("DRIVER'S DAILY LOG", 20, 34);
  ctx.font = "10px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("FMCSA Compliant - Property Carrier", W - 20, 34);
  ctx.textAlign = "left";
  ctx.fillText(String(log.date_label || ""), 20, 50);

  let yPos = 74;
  const margin = 20;
  const gridWidth = W - margin * 2;
  const colW = gridWidth / 3;

  drawInfoColumn(ctx, "From Location", cleanText(log.from_location), margin, yPos, colW - 12);
  drawInfoColumn(ctx, "To Location", cleanText(log.to_location), margin + colW, yPos, colW - 12);
  drawInfoColumn(ctx, "Miles Today", `${Math.round(log.total_miles || 0)} mi`, margin + colW * 2, yPos, colW - 12, "#16a34a");

  yPos = 118;
  const gridLeft = margin;
  const gridRight = W - margin;
  const labelWidth = 116;
  const totalWidth = 72;
  const gridDataLeft = gridLeft + labelWidth;
  const gridDataRight = gridRight - totalWidth;
  const dataWidth = gridDataRight - gridDataLeft;
  const rowHeight = 50;
  const numRows = 4;
  const gridTop = yPos;
  const gridBottom = gridTop + rowHeight * numRows;
  const hourW = dataWidth / 24;
  const headerRowH = 26;

  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(gridDataLeft, gridTop - headerRowH, dataWidth, headerRowH);
  ctx.strokeStyle = "#374151";
  ctx.lineWidth = 1;
  ctx.strokeRect(gridDataLeft, gridTop - headerRowH, dataWidth, headerRowH);

  ctx.font = "bold 8px Arial, sans-serif";
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  for (let i = 0; i <= 24; i += 1) {
    const x = gridDataLeft + i * hourW;
    ctx.beginPath();
    ctx.moveTo(x, gridTop - headerRowH);
    ctx.lineTo(x, gridTop);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = i % 6 === 0 ? 1.5 : 0.8;
    ctx.stroke();

    if (i < 24) {
      ctx.fillText(getHourLabel(i), x + hourW / 2, gridTop - 9);
    }
  }

  for (let row = 0; row < numRows; row += 1) {
    const rowTop = gridTop + row * rowHeight;
    const rowBottom = rowTop + rowHeight;
    const statusInfo = STATUS_LABELS[row];
    const statusKey = ["off_duty", "sleeper", "driving", "on_duty"][row];
    const totalHrs = getTotalHoursForStatus(log.events || [], statusKey);

    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(gridLeft, rowTop, labelWidth, rowHeight);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.strokeRect(gridLeft, rowTop, labelWidth, rowHeight);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(statusInfo.label, gridLeft + 8, rowTop + 17);
    ctx.font = "9px Arial, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`${statusInfo.marker} / ${statusInfo.abbr}`, gridLeft + 8, rowTop + 34);

    ctx.fillStyle = row % 2 === 0 ? "#fafafa" : "#ffffff";
    ctx.fillRect(gridDataLeft, rowTop, dataWidth, rowHeight);

    for (let hr = 0; hr <= 24; hr += 1) {
      const x = gridDataLeft + hr * hourW;
      ctx.strokeStyle = hr % 6 === 0 ? "#94a3b8" : "#d1d5db";
      ctx.lineWidth = hr % 6 === 0 ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(x, rowTop);
      ctx.lineTo(x, rowBottom);
      ctx.stroke();

      if (hr < 24) {
        for (let q = 1; q < 4; q += 1) {
          const subX = x + (hourW / 4) * q;
          ctx.strokeStyle = "#e5e7eb";
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.moveTo(subX, rowTop + rowHeight * 0.58);
          ctx.lineTo(subX, rowBottom);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(gridDataRight, rowTop, totalWidth, rowHeight);
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    ctx.strokeRect(gridDataRight, rowTop, totalWidth, rowHeight);

    ctx.fillStyle = "#111827";
    ctx.font = "bold 9px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TOTAL", gridDataRight + totalWidth / 2, rowTop + 15);
    ctx.fillStyle = STATUS_COLORS[statusKey];
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText(`${totalHrs.toFixed(1)}h`, gridDataRight + totalWidth / 2, rowTop + 38);
  }

  drawDutyEvents(ctx, log.events || [], gridDataLeft, gridTop, dataWidth, rowHeight);
  drawRemarks(ctx, log.remarks || [], margin, gridBottom + 18, gridWidth);
  drawRecap(ctx, log, summary, margin, gridBottom + 174, gridWidth);
  drawFooter(ctx, W, H);
}

function drawInfoColumn(ctx, label, value, x, y, width, valueColor = "#111827") {
  ctx.fillStyle = "#111827";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${label}:`, x, y);
  ctx.font = "10px Arial, sans-serif";
  ctx.fillStyle = valueColor;
  ctx.fillText(truncateText(ctx, value || "N/A", width), x, y + 15);
}

function drawDutyEvents(ctx, events, gridDataLeft, gridTop, dataWidth, rowHeight) {
  ctx.save();
  ctx.rect(gridDataLeft, gridTop, dataWidth, rowHeight * 4);
  ctx.clip();

  events.forEach((ev) => {
    const row = STATUS_ROW[ev.status];
    if (row === undefined) return;

    const rowTop = gridTop + row * rowHeight;
    const rowMid = rowTop + rowHeight / 2;
    const x1 = gridDataLeft + (Number(ev.hour_start || 0) / 24) * dataWidth;
    const x2 = gridDataLeft + (Number(ev.hour_end || 0) / 24) * dataWidth;
    if (x2 <= x1 + 0.5) return;

    ctx.fillStyle = STATUS_COLORS[ev.status];
    ctx.globalAlpha = 0.78;
    ctx.fillRect(x1, rowTop + 5, x2 - x1, rowHeight - 10);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = STATUS_COLORS[ev.status];
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, rowTop + 5, x2 - x1, rowHeight - 10);

    const segmentW = x2 - x1;
    if (segmentW > 32) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${(Number(ev.hour_end || 0) - Number(ev.hour_start || 0)).toFixed(1)}h`, x1 + segmentW / 2, rowMid + 4);
    }
  });

  const sortedEvents = [...events].sort((a, b) => Number(a.hour_start || 0) - Number(b.hour_start || 0));
  for (let i = 0; i < sortedEvents.length - 1; i += 1) {
    const curr = sortedEvents[i];
    const next = sortedEvents[i + 1];
    const currRow = STATUS_ROW[curr.status];
    const nextRow = STATUS_ROW[next.status];
    if (currRow === undefined || nextRow === undefined || currRow === nextRow) continue;
    if (Math.abs(Number(curr.hour_end || 0) - Number(next.hour_start || 0)) > 0.02) continue;

    const x = gridDataLeft + (Number(curr.hour_end || 0) / 24) * dataWidth;
    const y1 = gridTop + currRow * rowHeight + rowHeight / 2;
    const y2 = gridTop + nextRow * rowHeight + rowHeight / 2;
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRemarks(ctx, remarks, x, y, width) {
  ctx.fillStyle = "#111827";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Remarks & Stops:", x, y);

  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y + 8, width, 120);

  ctx.font = "9px Arial, sans-serif";
  ctx.fillStyle = "#334155";
  const lines = remarks.length ? remarks : ["No remarks generated for this day."];
  lines.slice(0, 8).forEach((remark, idx) => {
    ctx.fillText(`- ${truncateText(ctx, cleanText(remark), width - 20)}`, x + 8, y + 25 + idx * 13);
  });
}

function drawRecap(ctx, log, summary, x, y, width) {
  ctx.fillStyle = "#111827";
  ctx.fillRect(x, y, width, 24);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("70-Hour/8-Day Recap & HOS Compliance", x + 8, y + 16);

  const dailyOnDuty = Number(log.total_driving || 0) + Number(log.total_on_duty || 0);
  const cycleHours = Number(summary?.cycle_hours_used || 0);
  const recapCols = [
    { label: "On-Duty Today", sub: "Lines 3 & 4", value: `${dailyOnDuty.toFixed(1)}h`, ok: dailyOnDuty <= 11 },
    { label: "8-Day Cycle Used", sub: "Incl. today", value: `${Math.min(70, cycleHours).toFixed(1)}h`, ok: cycleHours <= 70 },
    { label: "Available Tomorrow", sub: "70h cycle balance", value: `${Math.max(0, 70 - cycleHours).toFixed(1)}h`, ok: true },
  ];

  const colW = width / 3;
  recapCols.forEach((col, idx) => {
    const colX = x + idx * colW;
    const colY = y + 32;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(colX + 2, colY, colW - 4, 76);
    ctx.strokeStyle = col.ok ? "#22c55e" : "#ef4444";
    ctx.lineWidth = col.ok ? 2 : 1.4;
    ctx.strokeRect(colX + 2, colY, colW - 4, 76);

    ctx.textAlign = "center";
    ctx.fillStyle = "#111827";
    ctx.font = "bold 10px Arial, sans-serif";
    ctx.fillText(col.label, colX + colW / 2, colY + 18);
    ctx.font = "9px Arial, sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(col.sub, colX + colW / 2, colY + 34);
    ctx.fillStyle = col.ok ? "#16a34a" : "#dc2626";
    ctx.font = "bold 17px Arial, sans-serif";
    ctx.fillText(col.value, colX + colW / 2, colY + 61);
  });

  const isCompliant = dailyOnDuty <= 11 && cycleHours <= 70;
  const statusY = y + 122;
  ctx.fillStyle = isCompliant ? "#f0fdf4" : "#fef2f2";
  ctx.fillRect(x, statusY, width, 42);
  ctx.strokeStyle = isCompliant ? "#22c55e" : "#ef4444";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, statusY, width, 42);

  ctx.fillStyle = isCompliant ? "#16a34a" : "#dc2626";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(isCompliant ? "HOS COMPLIANT" : "HOS REVIEW REQUIRED", x + width / 2, statusY + 27);
}

function drawFooter(ctx, W, H) {
  ctx.fillStyle = "#64748b";
  ctx.font = "8px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Generated by ELD Trip Planner - FMCSA compliant logging preview", W / 2, H - 24);
}

function createPdfFromCanvases(canvases) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let length = 0;

  const appendText = (text) => appendBytes(encoder.encode(text));
  const appendBytes = (bytes) => {
    chunks.push(bytes);
    length += bytes.length;
  };

  const addObject = (id, bodyParts) => {
    offsets[id] = length;
    appendText(`${id} 0 obj\n`);
    bodyParts.forEach((part) => (typeof part === "string" ? appendText(part) : appendBytes(part)));
    appendText("\nendobj\n");
  };

  const pages = canvases.map((canvas, index) => {
    const imageBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.94));
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const maxW = PAGE_WIDTH - PAGE_MARGIN * 2;
    const maxH = PAGE_HEIGHT - PAGE_MARGIN * 2;
    const scale = Math.min(maxW / canvas.width, maxH / canvas.height);
    const drawW = canvas.width * scale;
    const drawH = canvas.height * scale;
    const drawX = (PAGE_WIDTH - drawW) / 2;
    const drawY = (PAGE_HEIGHT - drawH) / 2;
    const imageName = `Im${index + 1}`;
    const content = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/${imageName} Do\nQ`;

    return { pageId, contentId, imageId, imageName, imageBytes, content, canvas };
  });

  appendText("%PDF-1.4\n");
  addObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  addObject(2, [`<< /Type /Pages /Kids [${pages.map((page) => `${page.pageId} 0 R`).join(" ")}] /Count ${pages.length} >>`]);

  pages.forEach((page) => {
    addObject(page.pageId, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] `,
      `/Resources << /XObject << /${page.imageName} ${page.imageId} 0 R >> >> `,
      `/Contents ${page.contentId} 0 R >>`,
    ]);
    addObject(page.contentId, [`<< /Length ${page.content.length} >>\nstream\n${page.content}\nendstream`]);
    addObject(page.imageId, [
      `<< /Type /XObject /Subtype /Image /Width ${page.canvas.width} /Height ${page.canvas.height} `,
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.imageBytes.length} >>\nstream\n`,
      page.imageBytes,
      "\nendstream",
    ]);
  });

  const xrefOffset = length;
  appendText(`xref\n0 ${offsets.length}\n`);
  appendText("0000000000 65535 f \n");
  for (let i = 1; i < offsets.length; i += 1) {
    appendText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  appendText(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatHours(value) {
  return Number(value || 0).toFixed(1);
}

function getHourLabel(hour) {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return String(hour > 12 ? hour - 12 : hour);
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateText(ctx, text, maxWidth) {
  const clean = cleanText(text);
  if (!clean || ctx.measureText(clean).width <= maxWidth) return clean;

  let output = clean;
  while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

function getTotalHoursForStatus(events, status) {
  return events
    .filter((event) => event.status === status)
    .reduce((sum, event) => sum + (Number(event.hour_end || 0) - Number(event.hour_start || 0)), 0);
}
