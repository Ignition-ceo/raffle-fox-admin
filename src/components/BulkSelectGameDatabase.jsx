import { useState, useEffect, useRef } from "react";

const GAMES_DATA = [
  { id: 1, name: "Carnival Madness", prize: "Prize 4", ticketPrice: "10 Gold Coins", start: "Jan 28, 2026", end: "Mar 25, 2026", timeLeft: "28d 7h 12m", status: "Live", ticketsSold: 0 },
  { id: 2, name: "Shopping Spree", prize: "Prize 6", ticketPrice: "3 Gold Coins", start: "Jan 28, 2026", end: "Feb 27, 2026", timeLeft: "2d 7h 12m", status: "Live", ticketsSold: 0 },
  { id: 3, name: "TRIBE", prize: "TRIBE Frontline Costu...", ticketPrice: "50 Gold Coins", start: "Jan 18, 2026", end: "Mar 27, 2026", timeLeft: "30d 7h 12m", status: "Ended", ticketsSold: 0 },
  { id: 4, name: "Programmers Delight", prize: "Macbook Pro", ticketPrice: "3 Gold Coins", start: "Jan 5, 2026", end: "Mar 27, 2026", timeLeft: "30d 7h 12m", status: "Live", ticketsSold: 0 },
  { id: 5, name: "Call Your Luck: iPhone Edition", prize: "iPhone 17", ticketPrice: "5 Gold Coins", start: "Nov 6, 2025", end: "Mar 1, 2026", timeLeft: "4d 7h 12m", status: "Live", ticketsSold: 0 },
  { id: 6, name: "Scorch Day Grand Prize", prize: "Mercedes Benz GLC 3...", ticketPrice: "10 Gold Coins", start: "Nov 5, 2025", end: "Mar 1, 2026", timeLeft: "4d 7h 12m", status: "Live", ticketsSold: 0 },
];

const PRIZES_DATA = [
  { id: 1, name: "TRIBE Frontline Costume", description: "Krakoa | frontline | backpack included", price: "$15,000", stock: 1, status: "Active" },
  { id: 2, name: "Macbook Pro", description: 'Macbook Pro | 2025 | 16" M3', price: "$7,000", stock: 3, status: "Active" },
  { id: 3, name: "iPhone 17", description: "256GB | Multiple Colors | A19 Chip", price: "$1,000", stock: 10, status: "Active" },
  { id: 4, name: "Mercedes Benz GLC 300", description: "Luxury SUV | Turbocharged | Leather Interior", price: "$100,000", stock: 3, status: "Active" },
  { id: 5, name: "Deploy Price", description: "d | d | d", price: "$50", stock: 13, status: "Active" },
  { id: 6, name: "50k Doller", description: "5 | 5 | 5", price: "$100", stock: 15, status: "Active" },
];

// Floating confirmation modal
function ConfirmModal({ message, onConfirm, onCancel, actionLabel = "Confirm", danger = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "32px 36px", maxWidth: 400, width: "90%",
        boxShadow: "0 25px 60px rgba(0,0,0,0.18)", animation: "scaleIn 0.25s ease"
      }}>
        <div style={{ fontSize: 15, color: "#334155", lineHeight: 1.6, marginBottom: 28 }}>{message}</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0",
            background: "#fff", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s"
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: danger ? "#ef4444" : "#f97316", color: "#fff",
            fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
          }}>{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Status badge
function StatusBadge({ status }) {
  const isLive = status === "Live" || status === "Active";
  const isInactive = status === "Inactive";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
      background: isInactive ? "#f1f5f9" : isLive ? "#ecfdf5" : "#fef2f2",
      color: isInactive ? "#64748b" : isLive ? "#059669" : "#ef4444",
      border: `1px solid ${isInactive ? "#cbd5e1" : isLive ? "#a7f3d0" : "#fecaca"}`
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isInactive ? "#94a3b8" : isLive ? "#10b981" : "#ef4444",
        boxShadow: isLive ? "0 0 6px #10b981" : "none",
        animation: isLive ? "pulse 2s infinite" : "none"
      }} />
      {status}
    </span>
  );
}

// Custom checkbox
function Checkbox({ checked, onChange, indeterminate = false }) {
  return (
    <button onClick={onChange} style={{
      width: 22, height: 22, borderRadius: "50%", border: `2px solid ${checked || indeterminate ? "#e97a2b" : "#d4a574"}`,
      background: checked || indeterminate ? "#e97a2b" : "#fff",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s ease", flexShrink: 0, padding: 0
    }}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {indeterminate && !checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5H8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

// Bulk action toolbar
function BulkActionBar({ count, total, onAction, actions, onClearSelection }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
      borderRadius: 14, padding: "14px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      boxShadow: "0 8px 32px rgba(15,23,42,0.25)",
      animation: "slideDown 0.3s ease", marginBottom: 12
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          background: "#e97a2b", color: "#fff", borderRadius: 8,
          padding: "4px 12px", fontSize: 13, fontWeight: 700, minWidth: 28, textAlign: "center"
        }}>{count}</div>
        <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 500 }}>
          of {total} selected
        </span>
        <button onClick={onClearSelection} style={{
          color: "#94a3b8", fontSize: 12, background: "none", border: "none",
          cursor: "pointer", textDecoration: "underline", fontWeight: 500
        }}>Clear</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {actions.map((action) => (
          <button key={action.label} onClick={() => onAction(action.key)} style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: action.danger ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.1)",
            color: action.danger ? "#fca5a5" : "#e2e8f0",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s"
          }}>
            <span style={{ fontSize: 15 }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Toast notification
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", bottom: 32, right: 32, zIndex: 2000,
      background: type === "success" ? "#059669" : type === "danger" ? "#ef4444" : "#e97a2b",
      color: "#fff", padding: "14px 24px", borderRadius: 12,
      fontSize: 14, fontWeight: 600, boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
      animation: "slideUp 0.3s ease", display: "flex", alignItems: "center", gap: 10
    }}>
      <span>{type === "success" ? "✓" : type === "danger" ? "✕" : "⚡"}</span>
      {message}
    </div>
  );
}

export default function BulkSelectGameDatabase() {
  const [activeTab, setActiveTab] = useState("games");
  const [games, setGames] = useState(GAMES_DATA);
  const [prizes, setPrizes] = useState(PRIZES_DATA);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState(null);
  const [toast, setToast] = useState(null);

  const data = activeTab === "games" ? games : prizes;

  // Reset selection on tab change
  useEffect(() => { setSelectedIds(new Set()); }, [activeTab]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(d => d.id)));
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.size === data.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < data.length;

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleBulkAction = (actionKey) => {
    const count = selectedIds.size;
    switch (actionKey) {
      case "view":
        showToast(`Opening ${count} prize${count > 1 ? "s" : ""} for viewing`, "warning");
        setSelectedIds(new Set());
        break;
      case "delete":
        setConfirmModal({
          message: `Are you sure you want to delete ${count} ${activeTab === "games" ? "game" : "prize"}${count > 1 ? "s" : ""}? This action cannot be undone.`,
          actionLabel: "Delete All",
          danger: true,
          onConfirm: () => {
            if (activeTab === "games") setGames(g => g.filter(x => !selectedIds.has(x.id)));
            else setPrizes(p => p.filter(x => !selectedIds.has(x.id)));
            setSelectedIds(new Set());
            setConfirmModal(null);
            showToast(`${count} item${count > 1 ? "s" : ""} deleted`, "danger");
          }
        });
        break;
      case "end":
        setConfirmModal({
          message: `End ${count} game${count > 1 ? "s" : ""} immediately? Players will no longer be able to purchase tickets.`,
          actionLabel: "End Games",
          danger: false,
          onConfirm: () => {
            setGames(g => g.map(x => selectedIds.has(x.id) ? { ...x, status: "Ended" } : x));
            setSelectedIds(new Set());
            setConfirmModal(null);
            showToast(`${count} game${count > 1 ? "s" : ""} ended`);
          }
        });
        break;
      case "activate":
        if (activeTab === "games") {
          setGames(g => g.map(x => selectedIds.has(x.id) ? { ...x, status: "Live" } : x));
        } else {
          setPrizes(p => p.map(x => selectedIds.has(x.id) ? { ...x, status: "Active" } : x));
        }
        setSelectedIds(new Set());
        showToast(`${count} item${count > 1 ? "s" : ""} activated`);
        break;
      case "deactivate":
        setPrizes(p => p.map(x => selectedIds.has(x.id) ? { ...x, status: "Inactive" } : x));
        setSelectedIds(new Set());
        showToast(`${count} item${count > 1 ? "s" : ""} deactivated`, "warning");
        break;
    }
  };

  const gameActions = [
    { key: "end", label: "End Games", icon: "⏹", danger: false },
    { key: "activate", label: "Reactivate", icon: "▶", danger: false },
    { key: "delete", label: "Delete", icon: "🗑", danger: true },
  ];

  const prizeActions = [
    { key: "view", label: "View", icon: "👁", danger: false },
    { key: "activate", label: "Activate", icon: "▶", danger: false },
    { key: "deactivate", label: "Deactivate", icon: "⏸", danger: false },
    { key: "delete", label: "Delete", icon: "🗑", danger: true },
  ];

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      background: "#ffffff", minHeight: "100vh", padding: "32px 24px"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; }
        button:hover { filter: brightness(1.08); }
        tr.row-selected { background: #fdf6f0 !important; }
        tr:hover { background: #fafafa; }
        tr.row-selected:hover { background: #fdf0e6 !important; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0 }}>
              {activeTab === "games" ? "Game Database" : "Prize Database"}
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "4px 0 0" }}>
              {activeTab === "games" ? "Manage raffles, games and competitions" : "Manage prizes, stock, sponsors and availability"}
            </p>
          </div>
          <button style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "12px 24px", borderRadius: 10, border: "none",
            background: "#e97a2b", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(233,122,43,0.2)"
          }}>
            <span style={{ fontSize: 18 }}>+</span> Create New
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f3f3", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {["games", "prizes"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "9px 24px", borderRadius: 8, border: "none",
              background: activeTab === tab ? "#fff" : "transparent",
              color: activeTab === tab ? "#0f172a" : "#64748b",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: activeTab === tab ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.2s"
            }}>{tab === "games" ? "Games" : "Prizes"}</button>
          ))}
        </div>

        {/* Table card */}
        <div style={{
          background: "#fff", borderRadius: 16, border: "1px solid #eee",
          boxShadow: "0 1px 4px rgba(0,0,0,0.03)", overflow: "hidden"
        }}>
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div style={{ padding: "12px 20px 0" }}>
              <BulkActionBar
                count={selectedIds.size}
                total={data.length}
                onAction={handleBulkAction}
                actions={activeTab === "games" ? gameActions : prizeActions}
                onClearSelection={() => setSelectedIds(new Set())}
              />
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  <th style={{ padding: "16px 20px", width: 50, textAlign: "left" }}>
                    <Checkbox checked={isAllSelected} indeterminate={isIndeterminate} onChange={toggleAll} />
                  </th>
                  {activeTab === "games" ? (
                    <>
                      <th style={thStyle}>Game Name</th>
                      <th style={thStyle}>Prize</th>
                      <th style={thStyle}>Ticket Price</th>
                      <th style={thStyle}>Start</th>
                      <th style={thStyle}>End</th>
                      <th style={thStyle}>Time Left</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, width: 100 }}>Actions</th>
                    </>
                  ) : (
                    <>
                      <th style={thStyle}>Prize Name</th>
                      <th style={thStyle}>Description</th>
                      <th style={thStyle}>Price</th>
                      <th style={thStyle}>Stock</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, width: 100 }}>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr key={item.id} className={isSelected ? "row-selected" : ""}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s", cursor: "pointer" }}
                      onClick={() => toggleSelect(item.id)}
                    >
                      <td style={{ padding: "16px 20px" }} onClick={e => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onChange={() => toggleSelect(item.id)} />
                      </td>
                      {activeTab === "games" ? (
                        <>
                          <td style={tdStyle}><span style={{ fontWeight: 600, color: "#0f172a" }}>{item.name}</span></td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e2e8f0", flexShrink: 0 }} />
                              <span style={{ color: "#475569", fontSize: 13 }}>{item.prize}</span>
                            </div>
                          </td>
                          <td style={tdStyle}><span style={{ color: "#475569" }}>{item.ticketPrice}</span></td>
                          <td style={tdStyle}><span style={{ color: "#64748b", fontSize: 13 }}>{item.start}</span></td>
                          <td style={tdStyle}><span style={{ color: "#64748b", fontSize: 13 }}>{item.end}</span></td>
                          <td style={tdStyle}>
                            <span style={{ color: "#475569", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
                              ⏱ {item.timeLeft}
                            </span>
                          </td>
                          <td style={tdStyle}><StatusBadge status={item.status} /></td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                              <ActionBtn icon="👁" />
                              <ActionBtn icon="✏" />
                              <ActionBtn icon="🗑" danger />
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={tdStyle}><span style={{ fontWeight: 600, color: "#0f172a" }}>{item.name}</span></td>
                          <td style={tdStyle}><span style={{ color: "#64748b", fontSize: 13 }}>{item.description}</span></td>
                          <td style={tdStyle}><span style={{ fontWeight: 600, color: "#0f172a" }}>{item.price}</span></td>
                          <td style={tdStyle}><span style={{ color: "#475569" }}>{item.stock}</span></td>
                          <td style={tdStyle}><StatusBadge status={item.status} /></td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                              <ActionBtn icon="👁" />
                              <ActionBtn icon="🗑" danger />
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 15 }}>
                      No items remaining. All selected items have been removed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: 24, padding: "20px 24px", background: "#fdf6f0",
          borderRadius: 12, border: "1px solid #f0d9c4"
        }}>
          <p style={{ margin: 0, color: "#a0621a", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            💡 Bulk Select Demo
          </p>
          <p style={{ margin: 0, color: "#7a4a15", fontSize: 13, lineHeight: 1.6 }}>
            Click rows or checkboxes to select items. Use the header checkbox to select all. 
            When items are selected, the bulk action toolbar appears with contextual actions. 
            Destructive actions like "Delete" require confirmation. Switch between Games and Prizes tabs to see both views.
          </p>
        </div>
      </div>

      {/* Modals & Toasts */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          actionLabel={confirmModal.actionLabel}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// Shared styles
const thStyle = {
  padding: "14px 16px", textAlign: "left", fontSize: 12,
  fontWeight: 600, color: "#94a3b8", textTransform: "uppercase",
  letterSpacing: "0.5px", whiteSpace: "nowrap"
};

const tdStyle = {
  padding: "16px", fontSize: 14, whiteSpace: "nowrap"
};

function ActionBtn({ icon, danger = false }) {
  return (
    <button style={{
      width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0",
      background: "#fff", cursor: "pointer", display: "flex",
      alignItems: "center", justifyContent: "center", fontSize: 14,
      transition: "all 0.15s", color: danger ? "#ef4444" : "#64748b"
    }}>{icon}</button>
  );
}
