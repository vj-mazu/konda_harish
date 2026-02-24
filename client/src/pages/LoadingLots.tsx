import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface SampleEntry {
    id: string;
    entryDate: string;
    brokerName: string;
    variety: string;
    partyName: string;
    location: string;
    bags: number;
    packaging: string;
    workflowStatus: string;
    qualityParameters?: any;
    offering?: any;
    creator?: { username: string };
    slNo?: number;
}

const unitLabel = (u: string) => {
    const map: Record<string, string> = { per_kg: '/Kg', per_ton: '/Ton', per_bag: '/Bag', per_quintal: '/Qtl' };
    return map[u] || u || '';
};

const fmtVal = (val: any, unit?: string) => {
    if (val == null || val === '') return '-';
    return unit ? `${val} ${unitLabel(unit)}` : `${val}`;
};

const LoadingLots: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<SampleEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ broker: '', variety: '', party: '', location: '', startDate: '', endDate: '' });
    const pageSize = 50;

    const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [managerData, setManagerData] = useState({
        sute: '', suteUnit: 'per_kg',
        moistureValue: '',
        hamali: '', hamaliUnit: 'per_bag',
        brokerage: '', brokerageUnit: 'per_bag',
        lf: '', lfUnit: 'per_bag'
    });

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
            if (filters.broker) params.broker = filters.broker;
            if (filters.variety) params.variety = filters.variety;
            if (filters.party) params.party = filters.party;
            if (filters.location) params.location = filters.location;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/sample-entries/tabs/loading-lots`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data as { entries: SampleEntry[]; total: number };
            setEntries(data.entries || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error('Error fetching loading lots:', err);
        }
        setLoading(false);
    }, [page, filters]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    const handleUpdateClick = (entry: SampleEntry) => {
        const o = entry.offering || {};
        setSelectedEntry(entry);
        setManagerData({
            sute: o.finalSute?.toString() ?? o.sute?.toString() ?? '',
            suteUnit: o.finalSuteUnit || o.suteUnit || 'per_kg',
            moistureValue: o.moistureValue?.toString() ?? '',
            hamali: o.hamali?.toString() ?? '',
            hamaliUnit: o.hamaliUnit || 'per_bag',
            brokerage: o.brokerage?.toString() ?? '',
            brokerageUnit: o.brokerageUnit || 'per_bag',
            lf: o.lf?.toString() ?? '',
            lfUnit: o.lfUnit || 'per_bag'
        });
        setShowModal(true);
    };

    const handleSaveValues = async () => {
        if (!selectedEntry) return;
        try {
            const token = localStorage.getItem('token');
            const o = selectedEntry.offering || {};

            const payload: any = {
                finalSute: o.finalSute ?? o.sute ?? null,
                finalSuteUnit: o.finalSuteUnit ?? o.suteUnit ?? 'per_kg',
                finalBaseRate: o.finalBaseRate ?? o.offerBaseRateValue ?? null,
                suteEnabled: o.suteEnabled,
                moistureEnabled: o.moistureEnabled,
                hamaliEnabled: o.hamaliEnabled,
                brokerageEnabled: o.brokerageEnabled,
                lfEnabled: o.lfEnabled,
                moistureValue: o.moistureValue ?? 0,
                hamali: o.hamali ?? 0,
                hamaliUnit: o.hamaliUnit ?? 'per_bag',
                brokerage: o.brokerage ?? 0,
                brokerageUnit: o.brokerageUnit ?? 'per_bag',
                lf: o.lf ?? 0,
                lfUnit: o.lfUnit ?? 'per_bag',
                egbValue: o.egbValue ?? 0,
                customDivisor: o.customDivisor ?? null,
                isFinalized: true
            };

            // Override with manager-provided values for disabled fields
            if (o.suteEnabled === false) {
                payload.finalSute = managerData.sute ? parseFloat(managerData.sute) : null;
                payload.finalSuteUnit = managerData.suteUnit;
            }
            if (o.moistureEnabled === false) {
                payload.moistureValue = managerData.moistureValue ? parseFloat(managerData.moistureValue) : null;
            }
            if (o.hamaliEnabled === false) {
                payload.hamali = managerData.hamali ? parseFloat(managerData.hamali) : null;
                payload.hamaliUnit = managerData.hamaliUnit;
            }
            if (o.brokerageEnabled === false) {
                payload.brokerage = managerData.brokerage ? parseFloat(managerData.brokerage) : null;
                payload.brokerageUnit = managerData.brokerageUnit;
            }
            if (o.lfEnabled === false) {
                payload.lf = managerData.lf ? parseFloat(managerData.lf) : null;
                payload.lfUnit = managerData.lfUnit;
            }

            await axios.post(
                `${API_URL}/sample-entries/${selectedEntry.id}/final-price`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setShowModal(false);
            setSelectedEntry(null);
            fetchEntries();

            // Show success notification
            // Server-side /final-price endpoint already auto-transitions FINAL_REPORT → LOT_ALLOTMENT
            showNotification('✅ Values saved successfully! Lot moved to Pending Allotting Supervisor', 'success');
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to save values', 'error');
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    // Group entries by date
    const groupedByDate: Record<string, SampleEntry[]> = {};
    entries.forEach(e => {
        const dt = new Date(e.entryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        if (!groupedByDate[dt]) groupedByDate[dt] = [];
        groupedByDate[dt].push(e);
    });

    const isManagerOrOwner = user?.role === 'manager' || user?.role === 'owner' || user?.role === 'admin';

    return (
        <div>
            {/* Filter Toggle */}
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>Showing {entries.length} of {total} lots</span>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{ padding: '6px 14px', fontSize: '13px', background: showFilters ? '#e74c3c' : '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {showFilters ? '✕ Hide Filters' : '🔍 Filters'}
                </button>
            </div>

            {/* Filters */}
            {showFilters && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', padding: '10px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                    {(['broker', 'variety', 'party', 'location'] as const).map(key => (
                        <input key={key} placeholder={key.charAt(0).toUpperCase() + key.slice(1)} value={filters[key]}
                            onChange={e => setFilters({ ...filters, [key]: e.target.value })}
                            style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', width: '140px' }} />
                    ))}
                    <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ padding: '6px 10px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <button onClick={() => { setPage(1); fetchEntries(); }} style={{ padding: '6px 14px', background: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Apply</button>
                    <button onClick={() => { setFilters({ broker: '', variety: '', party: '', location: '', startDate: '', endDate: '' }); setPage(1); }} style={{ padding: '6px 14px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
                </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #ddd' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #2c3e50, #3498db)', color: 'white' }}>
                            {['SL', 'Broker', 'Bags', 'Pkg', 'Variety', 'Party', 'Location', 'Base Rate', 'Sute', 'Mst%', 'Hamali', 'Bkrg', 'LF', 'Total ₹', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '10px 6px', textAlign: 'center', fontWeight: '600', whiteSpace: 'nowrap', fontSize: '11px' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={17} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>Loading...</td></tr>
                        ) : entries.length === 0 ? (
                            <tr><td colSpan={17} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No loading lots found</td></tr>
                        ) : Object.entries(groupedByDate).map(([dateStr, dateEntries]) => (
                            <React.Fragment key={dateStr}>
                                {/* Date Group Header */}
                                <tr>
                                    <td colSpan={17} style={{
                                        background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                                        color: 'white', padding: '6px 12px', fontWeight: '700',
                                        fontSize: '12px', letterSpacing: '0.5px'
                                    }}>
                                        📅 {dateStr} — {dateEntries.length} {dateEntries.length === 1 ? 'lot' : 'lots'}
                                    </td>
                                </tr>
                                {dateEntries.map((e, i) => {
                                    const o = e.offering || {};
                                    // Check which fields the admin left blank (disabled) that need manager fill
                                    const suteMissing = o.suteEnabled === false && o.finalSute == null && o.sute == null;
                                    const mstMissing = o.moistureEnabled === false && o.moistureValue == null;
                                    const hamaliMissing = o.hamaliEnabled === false && o.hamali == null;
                                    const bkrgMissing = o.brokerageEnabled === false && o.brokerage == null;
                                    const lfMissing = o.lfEnabled === false && o.lf == null;
                                    const needsFill = suteMissing || mstMissing || hamaliMissing || bkrgMissing || lfMissing;

                                    const cellStyle = (missing: boolean) => ({
                                        padding: '6px',
                                        textAlign: 'center' as const,
                                        background: missing ? '#fff3cd' : 'transparent',
                                        color: missing ? '#856404' : '#333',
                                        fontWeight: missing ? '700' : '400' as any,
                                        fontSize: '12px'
                                    });

                                    const statusColors: Record<string, { bg: string; color: string }> = {
                                        LOT_ALLOTMENT: { bg: '#e3f2fd', color: '#1565c0' },
                                        PHYSICAL_INSPECTION: { bg: '#fff3e0', color: '#e65100' },
                                        INVENTORY_ENTRY: { bg: '#e8f5e9', color: '#2e7d32' },
                                        OWNER_FINANCIAL: { bg: '#f3e5f5', color: '#7b1fa2' },
                                        MANAGER_FINANCIAL: { bg: '#e0f7fa', color: '#00695c' },
                                        FINAL_REVIEW: { bg: '#fce4ec', color: '#c62828' }
                                    };
                                    const sc = statusColors[e.workflowStatus] || { bg: '#f5f5f5', color: '#333' };

                                    return (
                                        <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: '700', fontSize: '12px' }}>{i + 1 + (page - 1) * pageSize}</td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontSize: '12px' }}>{e.brokerName}</td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: '600', fontSize: '12px' }}>{e.bags}</td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontSize: '12px' }}>{e.packaging || '-'}</td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontSize: '12px' }}>{e.variety}</td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontSize: '12px' }}>{e.partyName}</td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontSize: '12px' }}>{e.location || '-'}</td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontSize: '11px' }}>
                                                {o.finalBaseRate ?? o.offerBaseRateValue ? (
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '12px', color: '#2c3e50' }}>
                                                            ₹{o.finalBaseRate ?? o.offerBaseRateValue}
                                                            <span style={{ fontSize: '10px', color: '#666' }}>{o.baseRateUnit === 'per_quintal' ? '/Qtl' : '/Bag'}</span>
                                                        </div>
                                                        <div style={{ fontSize: '9px', color: '#888', fontWeight: '500' }}>
                                                            {o.baseRateType?.replace('_', '/') || ''}
                                                        </div>
                                                        {o.egbValue != null && o.egbValue > 0 && (
                                                            <div style={{ fontSize: '9px', color: '#e67e22', fontWeight: '600' }}>EGB: {o.egbValue}</div>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td style={cellStyle(suteMissing)}>
                                                {suteMissing ? '⚠ Need' : fmtVal(o.finalSute ?? o.sute, o.finalSuteUnit ?? o.suteUnit)}
                                            </td>
                                            <td style={cellStyle(mstMissing)}>
                                                {mstMissing ? '⚠ Need' : (o.moistureValue != null ? `${o.moistureValue}%` : '-')}
                                            </td>
                                            <td style={cellStyle(hamaliMissing)}>
                                                {hamaliMissing ? '⚠ Need' : fmtVal(o.hamali, o.hamaliUnit)}
                                            </td>
                                            <td style={cellStyle(bkrgMissing)}>
                                                {bkrgMissing ? '⚠ Need' : fmtVal(o.brokerage, o.brokerageUnit)}
                                            </td>
                                            <td style={cellStyle(lfMissing)}>
                                                {lfMissing ? '⚠ Need' : fmtVal(o.lf, o.lfUnit)}
                                            </td>
                                            <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: (o.finalPrice ?? o.finalBaseRate ?? o.offerBaseRateValue) ? '#2e7d32' : '#999' }}>
                                                {o.finalPrice != null ? `₹${o.finalPrice}` : (o.finalBaseRate ?? o.offerBaseRateValue) != null ? `₹${o.finalBaseRate ?? o.offerBaseRateValue}` : '-'}
                                            </td>
                                            <td style={{ padding: '6px', textAlign: 'center' }}>
                                                <div>
                                                    <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', background: '#d4edda', color: '#155724', whiteSpace: 'nowrap', display: 'inline-block', marginBottom: '2px' }}>
                                                        Admin ✅
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', background: needsFill ? '#fff3cd' : '#d4edda', color: needsFill ? '#856404' : '#155724', whiteSpace: 'nowrap', display: 'inline-block', marginBottom: '2px' }}>
                                                        {needsFill ? 'Manager ⏳ Pending' : 'Manager ✅'}
                                                    </span>
                                                </div>
                                                <span style={{ padding: '1px 4px', borderRadius: '8px', fontSize: '9px', fontWeight: '600', background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                                                    {e.workflowStatus.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '6px', textAlign: 'center' }}>
                                                {isManagerOrOwner && (
                                                    <button
                                                        onClick={() => handleUpdateClick(e)}
                                                        style={{
                                                            padding: '4px 10px',
                                                            background: needsFill ? '#e67e22' : '#3498db',
                                                            color: 'white',
                                                            border: 'none', borderRadius: '4px', fontSize: '11px',
                                                            cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {needsFill ? '⚠ Fill Values' : '✏️ View/Edit'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px', alignItems: 'center' }}>
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer', background: page <= 1 ? '#f5f5f5' : 'white' }}>← Prev</button>
                    <span style={{ padding: '6px 12px', fontSize: '13px', color: '#666' }}>Page {page} of {totalPages} ({total} total)</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', background: page >= totalPages ? '#f5f5f5' : 'white' }}>Next →</button>
                </div>
            )}

            {/* Manager Values Modal */}
            {showModal && selectedEntry && (() => {
                const o = selectedEntry.offering || {};
                const hasDisabledFields = o.suteEnabled === false || o.moistureEnabled === false ||
                    o.hamaliEnabled === false || o.brokerageEnabled === false || o.lfEnabled === false;

                // Admin-set values to display as read-only context
                const adminValues = [
                    { label: 'Base Rate Type', value: o.baseRateType || o.offerBaseRateType || '-' },
                    { label: 'Base Rate', value: o.finalBaseRate ?? o.offerBaseRateValue ?? '-' },
                    { label: 'Final Price', value: o.finalPrice != null ? `₹${o.finalPrice}` : '-' },
                    { label: 'EGB', value: o.egbValue != null ? o.egbValue : 'N/A' },
                ];

                return (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '10px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                            <h3 style={{ marginTop: 0, color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px', fontSize: '16px' }}>
                                📋 Update Values — {selectedEntry.brokerName} ({selectedEntry.variety})
                            </h3>

                            {/* Entry Info */}
                            <div style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e0e0e0' }}>
                                <div style={{ fontSize: '12px', color: '#666', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                    <span><b>Party:</b> {selectedEntry.partyName}</span>
                                    <span><b>Bags:</b> {selectedEntry.bags}</span>
                                    <span><b>Location:</b> {selectedEntry.location || '-'}</span>
                                    <span><b>Date:</b> {new Date(selectedEntry.entryDate).toLocaleDateString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Admin-Set Values (Read-Only) */}
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '13px', color: '#7f8c8d', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    🔒 Admin Set Values
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    {adminValues.map(av => (
                                        <div key={av.label} style={{ background: '#e8f5e9', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
                                            <span style={{ color: '#666' }}>{av.label}: </span>
                                            <span style={{ fontWeight: '700', color: '#2e7d32' }}>{av.value}</span>
                                        </div>
                                    ))}
                                    {/* Show what admin enabled/disabled */}
                                    {[
                                        { key: 'Sute', enabled: o.suteEnabled, val: fmtVal(o.sute, o.suteUnit) },
                                        { key: 'Moisture', enabled: o.moistureEnabled, val: o.moistureValue != null ? `${o.moistureValue}%` : '-' },
                                        { key: 'Hamali', enabled: o.hamaliEnabled, val: fmtVal(o.hamali, o.hamaliUnit) },
                                        { key: 'Brokerage', enabled: o.brokerageEnabled, val: fmtVal(o.brokerage, o.brokerageUnit) },
                                        { key: 'LF', enabled: o.lfEnabled, val: fmtVal(o.lf, o.lfUnit) },
                                    ].map(item => (
                                        <div key={item.key} style={{
                                            background: item.enabled === false ? '#fff3cd' : '#e8f5e9',
                                            padding: '6px 10px', borderRadius: '4px', fontSize: '12px'
                                        }}>
                                            <span style={{ color: '#666' }}>{item.key}: </span>
                                            {item.enabled === false ? (
                                                <span style={{ fontWeight: '700', color: '#e67e22' }}>⚠ Manager to fill</span>
                                            ) : (
                                                <span style={{ fontWeight: '700', color: '#2e7d32' }}>{item.val}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Manager Fill Section */}
                            {hasDisabledFields && (
                                <div>
                                    <h4 style={{ fontSize: '13px', color: '#e67e22', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        ✏️ Fill Missing Values
                                    </h4>

                                    {o.suteEnabled === false && (
                                        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <label style={{ width: '90px', fontSize: '12px', fontWeight: '700', color: '#333' }}>Sute</label>
                                            <input type="number" step="0.01" value={managerData.sute}
                                                onChange={e => setManagerData({ ...managerData, sute: e.target.value })}
                                                style={{ flex: 1, padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '13px' }} placeholder="Enter sute value" />
                                            <select value={managerData.suteUnit} onChange={e => setManagerData({ ...managerData, suteUnit: e.target.value })}
                                                style={{ padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '12px' }}>
                                                <option value="per_kg">Per Kg</option>
                                                <option value="per_ton">Per Ton</option>
                                            </select>
                                        </div>
                                    )}
                                    {o.moistureEnabled === false && (
                                        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <label style={{ width: '90px', fontSize: '12px', fontWeight: '700', color: '#333' }}>Moisture %</label>
                                            <input type="number" step="0.01" value={managerData.moistureValue}
                                                onChange={e => setManagerData({ ...managerData, moistureValue: e.target.value })}
                                                style={{ flex: 1, padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '13px' }} placeholder="Enter moisture %" />
                                        </div>
                                    )}
                                    {o.hamaliEnabled === false && (
                                        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <label style={{ width: '90px', fontSize: '12px', fontWeight: '700', color: '#333' }}>Hamali</label>
                                            <input type="number" step="0.01" value={managerData.hamali}
                                                onChange={e => setManagerData({ ...managerData, hamali: e.target.value })}
                                                style={{ flex: 1, padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '13px' }} placeholder="Enter hamali" />
                                            <select value={managerData.hamaliUnit} onChange={e => setManagerData({ ...managerData, hamaliUnit: e.target.value })}
                                                style={{ padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '12px' }}>
                                                <option value="per_bag">Per Bag</option>
                                                <option value="per_quintal">Per Qtl</option>
                                            </select>
                                        </div>
                                    )}
                                    {o.brokerageEnabled === false && (
                                        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <label style={{ width: '90px', fontSize: '12px', fontWeight: '700', color: '#333' }}>Brokerage</label>
                                            <input type="number" step="0.01" value={managerData.brokerage}
                                                onChange={e => setManagerData({ ...managerData, brokerage: e.target.value })}
                                                style={{ flex: 1, padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '13px' }} placeholder="Enter brokerage" />
                                            <select value={managerData.brokerageUnit} onChange={e => setManagerData({ ...managerData, brokerageUnit: e.target.value })}
                                                style={{ padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '12px' }}>
                                                <option value="per_bag">Per Bag</option>
                                                <option value="per_quintal">Per Qtl</option>
                                            </select>
                                        </div>
                                    )}
                                    {o.lfEnabled === false && (
                                        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <label style={{ width: '90px', fontSize: '12px', fontWeight: '700', color: '#333' }}>LF</label>
                                            <input type="number" step="0.01" value={managerData.lf}
                                                onChange={e => setManagerData({ ...managerData, lf: e.target.value })}
                                                style={{ flex: 1, padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '13px' }} placeholder="Enter LF" />
                                            <select value={managerData.lfUnit} onChange={e => setManagerData({ ...managerData, lfUnit: e.target.value })}
                                                style={{ padding: '8px', border: '2px solid #e67e22', borderRadius: '4px', fontSize: '12px' }}>
                                                <option value="per_bag">Per Bag</option>
                                                <option value="per_quintal">Per Qtl</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!hasDisabledFields && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#27ae60', fontSize: '14px', fontWeight: '600' }}>
                                    ✅ All values are complete! No fields need to be filled.
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '14px' }}>
                                <button onClick={() => setShowModal(false)} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                                {hasDisabledFields && (
                                    <button onClick={handleSaveValues} style={{
                                        padding: '8px 24px', border: 'none', borderRadius: '6px',
                                        background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                                        color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '13px'
                                    }}>
                                        💾 Save Values
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default LoadingLots;
