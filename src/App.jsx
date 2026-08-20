import React, { useState, useLayoutEffect, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Smartphone,
  ClipboardList,
  Loader2,
  X,
  Lock,
  RefreshCw,
  Minus,
  Type,
  List,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";

const PRIMARY = "#dc2626";
const SECONDARY = "#000000";
const MM_TO_PX = 96 / 25.4; // 1mm in on-screen CSS px at 96dpi
const PAGE_W_MM = 150;
const PAGE_H_MM = 100;

// ---------- id helper ----------
let idCounter = 1;
const nextId = () => idCounter++;

const DEFAULT_FIELDS = [
  // { id: nextId(), key: "W/O", value: "6770" },
  // { id: nextId(), key: "PO NO", value: "" },
  // { id: nextId(), key: "REF", value: "GBPL-D26-6770-VERBAL" },
  // { id: nextId(), key: "ITEM", value: "BC5213 - 01 NOS" },
  // { id: nextId(), key: "WT", value: "16 KG" },
  // { id: nextId(), key: "BOX NO", value: "2/1" },
];

// ---------- toast system (in-memory only, no storage) ----------
let toastId = 1;
function useToasts() {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = toastId++;
      const entry = { id, type: "info", duration: 4000, ...toast };
      setToasts((t) => [...t, entry]);
      if (!entry.actions && entry.duration) {
        setTimeout(() => remove(id), entry.duration);
      }
      return id;
    },
    [remove]
  );

  return { toasts, push, remove };
}

function ToastStack({ toasts, remove }) {
  const iconFor = {
    info: <Loader2 size={16} className="spin" color="#3f3f46" />,
    success: <CheckCircle2 size={16} color="#16a34a" />,
    error: <AlertTriangle size={16} color={PRIMARY} />,
    warning: <AlertTriangle size={16} color="#d97706" />,
  };
  const borderFor = {
    info: "#e4e4e7",
    success: "#bbf7d0",
    error: "#fecaca",
    warning: "#fde68a",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 68,
        right: 20,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: 320,
      }}
      className="no-print"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: "#fff",
            border: `1px solid ${borderFor[t.type] || "#e4e4e7"}`,
            borderRadius: 10,
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            padding: 12,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            animation: "toast-in 0.15s ease-out",
          }}
        >
          <div style={{ marginTop: 1, flexShrink: 0 }}>{iconFor[t.type] || iconFor.info}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {t.title && <div style={{ fontSize: 13, fontWeight: 700, color: SECONDARY, marginBottom: 2 }}>{t.title}</div>}
            <div style={{ fontSize: 12.5, color: "#52525b", lineHeight: 1.4 }}>{t.message}</div>
            {t.actions && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {t.actions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      a.onClick();
                      remove(t.id);
                    }}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: a.primary ? "none" : "1px solid #d4d4d8",
                      background: a.primary ? PRIMARY : "#fff",
                      color: a.primary ? "#fff" : SECONDARY,
                      cursor: "pointer",
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!t.actions && (
            <button
              onClick={() => remove(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#a1a1aa", flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- auto-fit text hook ----------
function useAutoFit(dep, { max = 15, min = 7, step = 0.5 } = {}) {
  const ref = useRef(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let fs = max;
    el.style.fontSize = fs + "px";
    let guard = 0;
    const overflowing = () => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    while (overflowing() && fs > min && guard < 80) {
      fs -= step;
      el.style.fontSize = fs + "px";
      guard++;
    }
    setSize(fs);
  }, [dep, max, min, step]);

  return [ref, size];
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      const coarsePointer =
        typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
      const touch = navigator.maxTouchPoints && navigator.maxTouchPoints > 2;
      if (width < 1024) {
        setIsDesktop(false);
        setReason("screen");
      } else if (coarsePointer && touch) {
        setIsDesktop(false);
        setReason("touch");
      } else {
        setIsDesktop(true);
        setReason("");
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return { isDesktop, reason };
}

function useFitScale(pageWidthPx) {
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setScale(Math.min(1, w / pageWidthPx));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPx]);

  return [outerRef, scale];
}

// ---------- printer status machine ----------
// idle -> checking -> printing -> awaiting-confirm -> success | error -> idle
const PRINTER_META = {
  idle: { color: "#71717a", bg: "#f4f4f5", dot: "#a1a1aa", label: "Printer not checked", Icon: HelpCircle },
  checking: { color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6", label: "Checking printer…", Icon: Loader2 },
  printing: { color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6", label: "Sending to printer…", Icon: Loader2 },
  "awaiting-confirm": { color: "#d97706", bg: "#fffbeb", dot: "#f59e0b", label: "Confirm output", Icon: AlertTriangle },
  success: { color: "#15803d", bg: "#f0fdf4", dot: "#22c55e", label: "Printer ready · last print OK", Icon: CheckCircle2 },
  error: { color: PRIMARY, bg: "#fef2f2", dot: PRIMARY, label: "Printer not connected", Icon: AlertTriangle },
};

// ---------- step card (numbered section for the guided left-hand panel) ----------
function StepCard({ number, icon: Icon, title, hint, children }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: PRIMARY,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12.5,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: SECONDARY, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            {Icon && <Icon size={15} color={PRIMARY} />} {title}
          </h2>
          {hint && <p style={{ fontSize: 12, color: "#71717a", margin: "3px 0 0", lineHeight: 1.45 }}>{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------- font size stepper control ----------
function FontSizeControl({ label, value, onDec, onInc, disabled, min, max }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ fontSize: 13, color: SECONDARY, fontWeight: 600 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onDec}
          disabled={disabled || value <= min}
          title="Decrease"
          style={{ ...stepperBtnStyle, opacity: disabled || value <= min ? 0.4 : 1, cursor: disabled || value <= min ? "not-allowed" : "pointer" }}
        >
          <Minus size={14} color={SECONDARY} />
        </button>
        <span style={{ fontSize: 13, color: SECONDARY, width: 36, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
          {value}px
        </span>
        <button
          onClick={onInc}
          disabled={disabled || value >= max}
          title="Increase"
          style={{ ...stepperBtnStyle, opacity: disabled || value >= max ? 0.4 : 1, cursor: disabled || value >= max ? "not-allowed" : "pointer" }}
        >
          <Plus size={14} color={SECONDARY} />
        </button>
      </div>
    </div>
  );
}

// ---------- label row ----------
// key and value each start at their own user-set base size. If the line would
// wrap onto extra lines / overflow the label, both shrink together (keeping
// their relative ratio) until it fits. Otherwise they print exactly at the
// size the client chose.
const ROW_MIN_FACTOR = 0.35;

function LabelRow({ field, keyBase, valueBase }) {
  const containerRef = useRef(null);
  const keyRef = useRef(null);
  const valueRef = useRef(null);
  const [factor, setFactor] = useState(1);
  const key = (field.key || "").trim();
  const value = (field.value || "").trim();
  const dep = `${key}|${value}|${keyBase}|${valueBase}`;

  useLayoutEffect(() => {
    const el = containerRef.current;
    const kEl = keyRef.current;
    const vEl = valueRef.current;
    if (!el || !kEl || !vEl) return;

    const apply = (f) => {
      kEl.style.fontSize = keyBase * f + "px";
      vEl.style.fontSize = valueBase * f + "px";
    };
    let f = 1;
    apply(f);
    let guard = 0;
    const overflowing = () => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    while (overflowing() && f > ROW_MIN_FACTOR && guard < 120) {
      f -= 0.02;
      apply(f);
      guard++;
    }
    setFactor(f);
  }, [dep]);

  return (
    <div className="label-row">
      <div ref={containerRef} className="label-row-text">
        <span ref={keyRef} style={{ fontWeight: 700, fontSize: keyBase * factor }}>
          {key || "(untitled)"}
        </span>
        <span style={{ margin: "0 4px", fontSize: valueBase * factor }}>:</span>
        <span ref={valueRef} style={{ fontSize: valueBase * factor }}>
          {value || "—"}
        </span>
      </div>
    </div>
  );
}

// ---------- label markup (shared by on-screen preview and the hidden print copy) ----------
function LabelMarkup({ companyName, fields, keyFontSize, valueFontSize, onOverflowChange }) {
  const [headerRef, headerFontSize] = useAutoFit(companyName, { max: 26, min: 16 });
  const bodyRef = useRef(null);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || !onOverflowChange) return;
    onOverflowChange(el.scrollHeight > el.clientHeight + 1);
  }, [fields, companyName, keyFontSize, valueFontSize, onOverflowChange]);

  return (
    <div style={labelBoxStyle}>
      <div ref={headerRef} className="header-text" style={{ ...labelHeaderStyle, fontSize: headerFontSize }}>
        {companyName || "COMPANY NAME"}
      </div>
      <div ref={bodyRef} style={labelBodyStyle}>
        {fields.map((f) => (
          <LabelRow key={f.id} field={f} keyBase={keyFontSize} valueBase={valueFontSize} />
        ))}
      </div>
    </div>
  );
}

// ---------- main app ----------
export default function App() {
  const { isDesktop, reason } = useIsDesktop();
  const [companyName, setCompanyName] = useState("SHREE HARI OM ENGINEERING");
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addError, setAddError] = useState("");
  const [lastEdited, setLastEdited] = useState(null);
  const [bodyOverflow, setBodyOverflow] = useState(false);

  const MIN_FONT = 40;
  const MAX_FONT = 36;
  const [keyFontSize, setKeyFontSize] = useState(18);
  const [valueFontSize, setValueFontSize] = useState(16);
  const bumpKeyFont = (delta) => setKeyFontSize((s) => Math.min(MAX_FONT, Math.max(MIN_FONT, s + delta)));
  const bumpValueFont = (delta) => setValueFontSize((s) => Math.min(MAX_FONT, Math.max(MIN_FONT, s + delta)));

  const [printerState, setPrinterState] = useState("idle");
  const [printLog, setPrintLog] = useState([]);
  const { toasts, push, remove } = useToasts();

  const pageWidthPx = PAGE_W_MM * MM_TO_PX;
  const pageHeightPx = PAGE_H_MM * MM_TO_PX;
  const [outerRef, scale] = useFitScale(pageWidthPx);

  // UI is locked (read-only) while a print is in flight, so the client can't
  // change the label mid-print and get a mismatched printout.
  const locked = printerState === "checking" || printerState === "printing" || printerState === "awaiting-confirm";

  const touch = useCallback(() => setLastEdited(new Date()), []);

  const addField = () => {
    const k = newKey.trim();
    const v = newValue.trim();
    if (!k) {
      setAddError("Title can't be empty.");
      return;
    }
    if (k.length > 40 || v.length > 120) {
      setAddError("Title/description is too long — keep it short so it prints cleanly.");
      return;
    }
    setAddError("");
    setFields((f) => [...f, { id: nextId(), key: k, value: v }]);
    setNewKey("");
    setNewValue("");
    touch();
  };

  const removeField = (id) => {
    setFields((f) => f.filter((x) => x.id !== id));
    touch();
  };

  const updateField = (id, prop, val) => {
    setFields((f) => f.map((x) => (x.id === id ? { ...x, [prop]: val } : x)));
    touch();
  };

  useEffect(() => {
    const onBeforePrint = () => setPrinterState("printing");
    const onAfterPrint = () => {
      setPrinterState("awaiting-confirm");
      push({
        type: "warning",
        title: "Did it print?",
        message: "Confirm whether the label actually came out of the printer.",
        duration: 0,
        actions: [
          {
            label: "Yes, printed",
            primary: true,
            onClick: () => {
              setPrinterState("success");
              setPrintLog((log) => [{ time: new Date(), fieldsCount: fields.length, ok: true }, ...log].slice(0, 8));
              push({ type: "success", title: "Printed", message: "Label sent and confirmed printed.", duration: 3500 });
            },
          },
          {
            label: "No / not connected",
            onClick: () => {
              setPrinterState("error");
              setPrintLog((log) => [{ time: new Date(), fieldsCount: fields.length, ok: false }, ...log].slice(0, 8));
              push({
                type: "error",
                title: "Printer not connected",
                message: "Check the printer's power, cable/USB or network connection, then try again.",
                duration: 6000,
              });
            },
          },
        ],
      });
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [fields.length, push]);

  const printerBlocked = printerState === "error";

  const handlePrint = () => {
    if (locked || printerBlocked) return;
    if (fields.length === 0) {
      push({ type: "error", title: "Nothing to print", message: "Add at least one field before printing." });
      return;
    }
    setPrinterState("checking");
    push({ type: "info", title: "Opening printer…", message: "Checking for a connected printer and opening the print dialog." });
    // let React paint the locked/checking UI before the (blocking) print dialog opens
    setTimeout(() => window.print(), 60);
  };

  // Separate recovery action: once a print attempt has come back "not connected",
  // the main Print button stays disabled until the connection is rechecked here.
  const handleRecheckPrinter = () => {
    if (locked) return;
    setPrinterState("checking");
    push({ type: "info", title: "Rechecking printer…", message: "Opening the print dialog again to check the connection." });
    setTimeout(() => window.print(), 60);
  };

  const meta = PRINTER_META[printerState];
  const PrinterIcon = meta.Icon;
  const spinning = printerState === "checking" || printerState === "printing";

  if (!isDesktop) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f4f5",
          fontFamily: "inherit",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 420,
            textAlign: "center",
            background: "#fff",
            borderRadius: 16,
            padding: "40px 32px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e5e5",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Smartphone color={PRIMARY} size={28} />
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: SECONDARY, margin: "0 0 8px" }}>Desktop only</h1>
          <p style={{ fontSize: 14, color: "#52525b", lineHeight: 1.5, margin: 0 }}>
            This label-printing tool is built for precise 150mm × 100mm label printing and only works on a
            desktop or laptop browser. Please open this page on a desktop computer.
          </p>
          <p style={{ fontSize: 12, color: "#a1a1aa", marginTop: 16 }}>
            {reason === "screen" ? "Reason: screen too narrow." : "Reason: touch device detected."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="app-shell" style={{ minHeight: "100vh", background: "#f4f4f5", color: SECONDARY, fontFamily: "inherit" }}>
      <style>{`
        @media print {
          .app-shell { display: none !important; }
          .print-only {
            position: static !important;
            left: 0 !important;
            top: 0 !important;
          }
          @page { size: 150mm 100mm; margin: 0; }
          html, body { margin: 0; padding: 0; }
        }
        .print-only {
          position: fixed;
          top: 0;
          left: -99999px;
          width: 150mm;
          height: 100mm;
          background: #fff;
        }
        .label-row-text {
          white-space: normal;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-overflow: ellipsis;
          width: 100%;
          color: #000;
          line-height: 1.25;
          word-break: break-word;
        }
        .header-text {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-overflow: ellipsis;
          word-break: break-word;
        }
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toast-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .locked-panel { position: relative; }
        .locked-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.55);
          border-radius: 12px;
          cursor: not-allowed;
        }
      `}</style>

      <ToastStack toasts={toasts} remove={remove} />

      {/* sticky header with always-visible printer status */}
      <div
        style={{
          background: PRIMARY,
          color: "#fff",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          position: "sticky",
          top: 0,
          zIndex: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
        className="no-print"
      >
        <Printer size={20} />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Label Print — {companyName || "Company"}</span>

        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.15)",
            padding: "5px 10px",
            borderRadius: 999,
            fontSize: 12,
          }}
        >
          <Monitor size={13} /> Desktop view
        </span>

        <span
          title={meta.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#fff",
            color: meta.color,
            padding: "5px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.dot }} />
          {meta.label}
        </span>

        {locked && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.15)",
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 12,
            }}
          >
            <Lock size={12} /> Editing locked
          </span>
        )}
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: 24,
          display: "grid",
          gridTemplateColumns: "1fr minmax(380px, 480px)",
          gap: 20,
          alignItems: "start",
        }}
        className="no-print"
      >
        {/* LEFT: editor */}
        <div
          className={locked ? "locked-panel" : ""}
          style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0, opacity: locked ? 0.7 : 1, transition: "opacity 0.15s" }}
        >
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Label header</h2>
            <input
              value={companyName}
              maxLength={60}
              disabled={locked}
              onChange={(e) => {
                setCompanyName(e.target.value);
                touch();
              }}
              style={inputStyle}
              placeholder="Company / header name"
            />
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Text size</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FontSizeControl label="Key size" value={keyFontSize} onDec={() => bumpKeyFont(-1)} onInc={() => bumpKeyFont(1)} disabled={locked} min={MIN_FONT} max={MAX_FONT} />
              <FontSizeControl label="Value size" value={valueFontSize} onDec={() => bumpValueFont(-1)} onInc={() => bumpValueFont(1)} disabled={locked} min={MIN_FONT} max={MAX_FONT} />
            </div>
            <p style={{ fontSize: 11, color: "#a1a1aa", margin: "10px 0 0" }}>
              This is the size each row starts at. If a line is too long and would wrap or overflow the
              label, it shrinks automatically — otherwise it prints exactly at the size you set.
            </p>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitle}>Fields</h2>
            {fields.length === 0 && (
              <div style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 8 }}>No fields yet — add one below.</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {fields.map((f) => (
                <div key={f.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={f.key}
                    maxLength={40}
                    disabled={locked}
                    onChange={(e) => updateField(f.id, "key", e.target.value)}
                    placeholder="Title"
                    style={{ ...inputStyle, flex: "0 0 38%", minWidth: 0 }}
                  />
                  <input
                    value={f.value}
                    maxLength={120}
                    disabled={locked}
                    onChange={(e) => updateField(f.id, "value", e.target.value)}
                    placeholder="Description"
                    style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                  />
                  <button
                    onClick={() => removeField(f.id)}
                    disabled={locked}
                    title="Remove field"
                    style={{ ...iconBtnStyle, opacity: locked ? 0.5 : 1, cursor: locked ? "not-allowed" : "pointer" }}
                  >
                    <Trash2 size={16} color={PRIMARY} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, borderTop: "1px dashed #e4e4e7", paddingTop: 12, flexWrap: "wrap" }}>
              <input
                value={newKey}
                disabled={locked}
                onChange={(e) => {
                  setNewKey(e.target.value);
                  if (addError) setAddError("");
                }}
                placeholder="New title"
                style={{ ...inputStyle, flex: "0 0 38%", minWidth: 0 }}
                onKeyDown={(e) => e.key === "Enter" && addField()}
              />
              <input
                value={newValue}
                disabled={locked}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  if (addError) setAddError("");
                }}
                placeholder="New description"
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                onKeyDown={(e) => e.key === "Enter" && addField()}
              />
              <button onClick={addField} disabled={locked} style={{ ...primaryBtnStyle, opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                <Plus size={16} /> Add
              </button>
              {addError && (
                <div style={{ width: "100%", fontSize: 12, color: PRIMARY, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={12} /> {addError}
                </div>
              )}
            </div>
          </div>

          {/* review section */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>
              <ClipboardList size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
              Review before printing
            </h2>
            <p style={{ fontSize: 12, color: "#71717a", margin: "0 0 10px" }}>
              {fields.length} field{fields.length !== 1 ? "s" : ""} will be printed on the label.
              {lastEdited && <> Last edited at {lastEdited.toLocaleTimeString()}.</>}
            </p>

            {bodyOverflow && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 10,
                  fontSize: 12,
                  color: PRIMARY,
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Content doesn't fit the 150×100mm label. Some text may print cut off — remove a field or shorten
                the text.
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fields.length === 0 && <div style={{ fontSize: 13, color: "#a1a1aa" }}>No fields added yet.</div>}
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 13,
                    padding: "6px 10px",
                    background: "#fafafa",
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <span style={{ color: "#71717a", flexShrink: 0 }}>
                    {i + 1}. {f.key || "(no title)"}
                  </span>
                  <span style={{ fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>{f.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* printer detail section */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>
              <Printer size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
              Printer status
            </h2>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                background: meta.bg,
                border: `1px solid ${printerState === "error" ? "#fecaca" : "#e4e4e7"}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <PrinterIcon size={18} color={meta.color} className={spinning ? "spin" : ""} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: "#3f3f46", lineHeight: 1.5 }}>
                {printerState === "idle" &&
                  "Not checked yet. A browser can't see a physical printer directly — click 'Print label' to open the system print dialog and confirm a printer is listed there. That confirms the print pipeline is ready."}
                {printerState === "checking" && "Opening the print dialog and checking for a connected printer…"}
                {printerState === "printing" && "Print dialog is open — pick your printer and confirm."}
                {printerState === "awaiting-confirm" &&
                  "Dialog closed. Please confirm in the toast whether the label actually came out."}
                {printerState === "success" && "Last print was confirmed. Printer is ready for the next label."}
                {printerState === "error" &&
                  "Last attempt failed or wasn't confirmed. Check the printer's power and cable/USB/network connection, then print again."}
              </div>
            </div>

            {printLog.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 4 }}>Recent print attempts</div>
                {printLog.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: p.ok ? "#15803d" : PRIMARY, display: "flex", alignItems: "center", gap: 6 }}>
                    {p.ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {p.time.toLocaleTimeString()} — {p.fieldsCount} fields — {p.ok ? "printed" : "failed"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: preview + print */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 76, minWidth: 0 }}>
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Preview (150mm × 100mm)</h2>
            <div
              ref={outerRef}
              className="label-scale-outer"
              style={{
                width: "100%",
                height: pageHeightPx * scale,
                position: "relative",
                background: "#e4e4e7",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: pageWidthPx,
                  height: pageHeightPx,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}
              >
                <LabelMarkup
                  companyName={companyName}
                  fields={fields}
                  keyFontSize={keyFontSize}
                  valueFontSize={valueFontSize}
                  onOverflowChange={setBodyOverflow}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={locked || printerBlocked}
            style={{
              ...primaryBtnStyle,
              justifyContent: "center",
              padding: "12px 20px",
              fontSize: 14,
              opacity: locked || printerBlocked ? 0.5 : 1,
              cursor: locked || printerBlocked ? "not-allowed" : "pointer",
            }}
          >
            {spinning ? <Loader2 size={16} className="spin" /> : <Printer size={16} />}
            {printerState === "checking" && "Opening printer…"}
            {printerState === "printing" && "Printing…"}
            {printerState === "awaiting-confirm" && "Waiting for confirmation…"}
            {printerState === "error" && "Print label (printer disconnected)"}
            {(printerState === "idle" || printerState === "success") && "Print label"}
          </button>

          {printerBlocked && (
            <button
              onClick={handleRecheckPrinter}
              disabled={locked}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: "#fff",
                color: PRIMARY,
                border: `1px solid ${PRIMARY}`,
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} className={printerState === "checking" ? "spin" : ""} /> Check printer connection
            </button>
          )}

          {fields.length === 0 && !printerBlocked && (
            <div style={{ fontSize: 12, color: "#a1a1aa", textAlign: "center" }}>Add at least one field before printing.</div>
          )}
          {printerBlocked && (
            <div style={{ fontSize: 12, color: PRIMARY, textAlign: "center" }}>
              Printing is disabled until the printer connection is rechecked.
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Always rendered off-canvas so its auto-fit measurements stay accurate;
        only this element becomes visible when printing (see .print-only CSS). */}
    <div className="print-only">
      <LabelMarkup companyName={companyName} fields={fields} keyFontSize={keyFontSize} valueFontSize={valueFontSize} />
    </div>
    </>
  );
}

// ---------- shared styles ----------
const cardStyle = { background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #e4e4e7" };

const sectionTitle = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: SECONDARY,
  margin: "0 0 12px",
};

const inputStyle = {
  border: "1px solid #d4d4d8",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  color: SECONDARY,
  outline: "none",
  fontFamily: "inherit",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

const primaryBtnStyle = {
  background: PRIMARY,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const iconBtnStyle = {
  background: "#fff",
  border: "1px solid #e4e4e7",
  borderRadius: 8,
  padding: 8,
  cursor: "pointer",
  display: "flex",
  flexShrink: 0,
};

const stepperBtnStyle = {
  background: "#fff",
  border: "1px solid #e4e4e7",
  borderRadius: 6,
  padding: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const labelBoxStyle = {
  width: "100%",
  height: "100%",
  border: "2.5px solid #000",
  borderRadius: "8mm",
  boxSizing: "border-box",
  padding: "5mm 6mm",
  display: "flex",
  flexDirection: "column",
  fontFamily: "inherit",
};

const labelHeaderStyle = {
  fontWeight: 800,
  textAlign: "center",
  color: "#000",
  borderBottom: "1.5px solid #000",
  paddingBottom: "3mm",
  marginBottom: "3mm",
  letterSpacing: 0.3,
  flexShrink: 0,
};

const labelBodyStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "2mm",
  flex: 1,
  overflow: "hidden",
  minHeight: 0,
};