import React, { useState, useEffect, useMemo } from 'react';
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
  packaging?: string;
  workflowStatus: string;
  qualityParameters?: {
    moisture: number;
    cutting1: number;
    cutting2: number;
    bend: number;
    mixS: number;
    mixL: number;
    mix: number;
    kandu: number;
    oil: number;
    sk: number;
    grainsCount: number;
    wbR: number;
    wbBk: number;
    wbT: number;
    paddyWb: number;
    uploadFileUrl?: string;
    reportedBy: string;
  };
}

const LotSelection: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 50;

  // Filters
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterBroker, setFilterBroker] = useState('');

  // Detail popup
  const [detailEntry, setDetailEntry] = useState<SampleEntry | null>(null);

  useEffect(() => {
    loadEntries();
  }, [page]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = { status: 'QUALITY_CHECK', page, pageSize: PAGE_SIZE };
      if (filterDateFrom) params.startDate = filterDateFrom;
      if (filterDateTo) params.endDate = filterDateTo;
      if (filterBroker) params.broker = filterBroker;
      const response = await axios.get(`${API_URL}/sample-entries/by-role`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data as any;
      setEntries(data.entries || []);
      if (data.total != null) {
        setTotal(data.total);
        setTotalPages(data.totalPages || Math.ceil(data.total / PAGE_SIZE));
      }
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    loadEntries();
  };

  const handleDecision = async (entryId: string, decision: string) => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${entryId}/lot-selection`,
        { decision },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      let message = '';
      if (decision === 'PASS_WITHOUT_COOKING') {
        message = 'Entry passed and moved to Final Report';
      } else if (decision === 'PASS_WITH_COOKING') {
        message = 'Entry passed and moved to Cooking Report';
      } else if (decision === 'FAIL') {
        message = 'Entry marked as failed';
      }

      showNotification(message, 'success');
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to process decision', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get unique brokers for filter dropdown
  const brokersList = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.brokerName))).sort();
  }, [entries]);

  // Group entries by date then broker (no client-side filtering — filters are server-side now)
  const groupedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    const grouped: Record<string, Record<string, typeof sorted>> = {};
    sorted.forEach(entry => {
      const dateKey = new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const brokerKey = entry.brokerName || 'Unknown';
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][brokerKey]) grouped[dateKey][brokerKey] = [];
      grouped[dateKey][brokerKey].push(entry);
    });
    return grouped;
  }, [entries]);

  let globalSlNo = 0;

  return (
    <div>
      {/* Collapsible Filter Bar */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={() => setFiltersVisible(!filtersVisible)}
          style={{
            padding: '7px 16px',
            backgroundColor: filtersVisible ? '#e74c3c' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {filtersVisible ? '✕ Hide Filters' : '🔍 Filters'}
        </button>
        {filtersVisible && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            backgroundColor: '#fff',
            padding: '10px 14px',
            borderRadius: '6px',
            border: '1px solid #e0e0e0'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>From Date</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>To Date</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#555', marginBottom: '3px' }}>Broker</label>
              <select value={filterBroker} onChange={e => setFilterBroker(e.target.value)}
                style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', minWidth: '140px', backgroundColor: 'white' }}>
                <option value="">All Brokers</option>
                {brokersList.map((b, i) => <option key={i} value={b}>{b}</option>)}
              </select>
            </div>
            {(filterDateFrom || filterDateTo || filterBroker) && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleApplyFilters}
                  style={{ padding: '5px 12px', border: 'none', borderRadius: '4px', backgroundColor: '#3498db', color: 'white', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Apply Filters
                </button>
                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterBroker(''); setPage(1); setTimeout(loadEntries, 0); }}
                  style={{ padding: '5px 12px', border: '1px solid #e74c3c', borderRadius: '4px', backgroundColor: '#fff', color: '#e74c3c', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #ddd' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
        ) : Object.keys(groupedEntries).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries pending review</div>
        ) : (
          Object.entries(groupedEntries).map(([dateKey, brokerGroups]) => (
            <div key={dateKey} style={{ marginBottom: '16px' }}>
              {/* Date Header */}
              <div style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                color: 'white',
                padding: '8px 12px',
                fontWeight: '700',
                fontSize: '13px',
                letterSpacing: '0.5px'
              }}>
                📅 {dateKey}
              </div>
              {Object.entries(brokerGroups).map(([brokerName, brokerEntries]) => (
                <div key={brokerName}>
                  {/* Broker Sub-Header */}
                  <div style={{
                    backgroundColor: '#e8f4fd',
                    padding: '6px 12px',
                    fontWeight: '600',
                    fontSize: '12px',
                    color: '#2c3e50',
                    borderBottom: '1px solid #bdd7ee',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    👤 {brokerName}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px', width: '40px' }}>SL</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Bags</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Pkg</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Variety</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Party</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Paddy Location</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Grains</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Image</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Sample Reports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokerEntries.map((entry, index) => {
                        globalSlNo++;
                        return (
                          <tr key={entry.id} style={{
                            backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                          }}>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>{globalSlNo}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>{entry.bags}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>{entry.packaging || '75'} Kg</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>{entry.variety}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px', cursor: 'pointer', color: '#2980b9', fontWeight: '600' }}
                              onClick={() => setDetailEntry(entry)}>
                              {entry.partyName}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>{entry.location}</td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>
                              {entry.qualityParameters?.grainsCount || '-'}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center', fontSize: '11px' }}>
                              {entry.qualityParameters?.uploadFileUrl ? (
                                <a href={entry.qualityParameters.uploadFileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4a90e2', textDecoration: 'none' }}>
                                  📷
                                </a>
                              ) : '-'}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button
                                  onClick={() => handleDecision(entry.id, 'PASS_WITHOUT_COOKING')}
                                  disabled={isSubmitting}
                                  style={{
                                    fontSize: '9px',
                                    padding: '4px 8px',
                                    backgroundColor: isSubmitting ? '#e0e0e0' : '#e67e22',
                                    color: isSubmitting ? '#999' : 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                  }}
                                >
                                  {isSubmitting ? '...' : 'Pass without Cooking'}
                                </button>
                                <button
                                  onClick={() => handleDecision(entry.id, 'PASS_WITH_COOKING')}
                                  disabled={isSubmitting}
                                  style={{
                                    fontSize: '9px',
                                    padding: '4px 8px',
                                    backgroundColor: isSubmitting ? '#e0e0e0' : '#27ae60',
                                    color: isSubmitting ? '#999' : 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                  }}
                                >
                                  {isSubmitting ? '...' : 'Pass with Cooking'}
                                </button>
                                <button
                                  onClick={() => handleDecision(entry.id, 'FAIL')}
                                  disabled={isSubmitting}
                                  style={{
                                    fontSize: '9px',
                                    padding: '4px 8px',
                                    backgroundColor: isSubmitting ? '#e0e0e0' : '#e74c3c',
                                    color: isSubmitting ? '#999' : 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                  }}
                                >
                                  {isSubmitting ? '...' : 'Fail'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Detail Popup - shows all quality data when clicking party name */}
      {detailEntry && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }} onClick={() => setDetailEntry(null)}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '0',
            width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
              padding: '16px 20px', borderRadius: '8px 8px 0 0', color: 'white',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
                  {detailEntry.partyName} — Complete Details
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.8 }}>
                  {detailEntry.brokerName} | {new Date(detailEntry.entryDate).toLocaleDateString('en-GB')}
                </p>
              </div>
              <button onClick={() => setDetailEntry(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', fontSize: '16px', color: 'white', fontWeight: '700' }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {/* Staff Entry Section */}
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '6px' }}>👤 Staff Entry Details</h4>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <tbody>
                  {[
                    ['Date', new Date(detailEntry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
                    ['Broker Name', detailEntry.brokerName],
                    ['Bags', detailEntry.bags],
                    ['Packaging', `${detailEntry.packaging || '75'} Kg`],
                    ['Variety', detailEntry.variety],
                    ['Party Name', detailEntry.partyName],
                    ['Paddy Location', detailEntry.location],
                    ['Sample Collected By', (detailEntry as any).sampleCollectedBy || '-'],
                    ['Lorry Number', (detailEntry as any).lorryNumber || '-'],
                    ['Supervisor', (detailEntry as any).supervisorName || '-'],
                  ].map(([label, value], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600', color: '#555', width: '40%', background: i % 2 === 0 ? '#f8f9fa' : 'white' }}>{label}</td>
                      <td style={{ padding: '6px 8px', color: '#333', background: i % 2 === 0 ? '#f8f9fa' : 'white' }}>{value || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Quality Parameters Section */}
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '6px' }}>🔬 Quality Parameters</h4>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Moisture', detailEntry.qualityParameters?.moisture],
                    ['Cutting', detailEntry.qualityParameters?.cutting1 && detailEntry.qualityParameters?.cutting2 ? `${detailEntry.qualityParameters.cutting1} x ${detailEntry.qualityParameters.cutting2}` : '-'],
                    ['Bend', detailEntry.qualityParameters?.bend],
                    ['Mix S', detailEntry.qualityParameters?.mixS],
                    ['Mix L', detailEntry.qualityParameters?.mixL],
                    ['Mix', detailEntry.qualityParameters?.mix],
                    ['Kandu', detailEntry.qualityParameters?.kandu],
                    ['Oil', detailEntry.qualityParameters?.oil],
                    ['SK', detailEntry.qualityParameters?.sk],
                    ['Grains Count', detailEntry.qualityParameters?.grainsCount],
                    ['WB (R)', detailEntry.qualityParameters?.wbR],
                    ['WB (BK)', detailEntry.qualityParameters?.wbBk],
                    ['WB (T)', detailEntry.qualityParameters?.wbT],
                    ['Paddy WB', detailEntry.qualityParameters?.paddyWb],
                    ['Reported By', detailEntry.qualityParameters?.reportedBy],
                  ].map(([label, value], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px 8px', fontWeight: '600', color: '#555', width: '40%', background: i % 2 === 0 ? '#f8f9fa' : 'white' }}>{label}</td>
                      <td style={{ padding: '6px 8px', color: '#333', background: i % 2 === 0 ? '#f8f9fa' : 'white' }}>{value || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detailEntry.qualityParameters?.uploadFileUrl && (
                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <a href={detailEntry.qualityParameters.uploadFileUrl} target="_blank" rel="noopener noreferrer">
                    <img src={detailEntry.qualityParameters.uploadFileUrl} alt="Sample" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                  </a>
                </div>
              )}
              <button onClick={() => setDetailEntry(null)}
                style={{ marginTop: '16px', width: '100%', padding: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px 0', marginTop: '12px' }}>
        <button
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: page <= 1 ? '#eee' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
        >
          ← Prev
        </button>
        <span style={{ fontSize: '13px', color: '#666' }}>
          Page {page} of {totalPages} &nbsp;({total} total)
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: page >= totalPages ? '#eee' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default LotSelection;
