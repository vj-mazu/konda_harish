import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import type { SampleEntryWithDetails, SampleEntryFilters } from '../types/sampleEntry';
import { useNotification } from '../contexts/NotificationContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface Broker {
  id: number;
  name: string;
}

interface Variety {
  id: number;
  name: string;
}

const SampleEntryLedger: React.FC = () => {
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<SampleEntryWithDetails[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<SampleEntryFilters>({
    startDate: '',
    endDate: '',
    broker: '',
    variety: '',
    party: '',
    location: '',
    status: undefined
  });

  useEffect(() => {
    loadBrokers();
    loadVarieties();
    loadLedger();
  }, []);

  const loadBrokers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/locations/brokers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBrokers((response.data as any).brokers || []);
    } catch (error: any) {
      console.error('Failed to load brokers:', error);
    }
  };

  const loadVarieties = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/locations/varieties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVarieties((response.data as any).varieties || []);
    } catch (error: any) {
      console.error('Failed to load varieties:', error);
    }
  };

  const loadLedger = useCallback(async (currentPage = page) => {
    try {
      setLoading(true);
      const response = await sampleEntryApi.getSampleEntryLedger({
        ...filters,
        page: currentPage,
        pageSize
      });
      // The API now returns { entries, total, page, pageSize }
      const data = response.data as any;
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  const handleFilterChange = (field: keyof SampleEntryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setPage(1); // Reset to first page on new filter application
    loadLedger(1);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      startDate: '',
      endDate: '',
      broker: '',
      variety: '',
      party: '',
      status: undefined,
      location: ''
    };
    setFilters(clearedFilters);
    setPage(1);
    loadLedger(1);
  };

  return (
    <div style={{ padding: '12px 16px', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2c3e50', fontWeight: 700 }}>Sample Entry Ledger</h2>

      {/* Filters */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '12px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#495057', fontWeight: 500 }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#495057', fontWeight: 500 }}>End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#495057', fontWeight: 500 }}>Broker</label>
            <select
              value={filters.broker || ''}
              onChange={(e) => handleFilterChange('broker', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '12px' }}
            >
              <option value="">All Brokers</option>
              {brokers.map(broker => (
                <option key={broker.id} value={broker.name}>{broker.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#495057', fontWeight: 500 }}>Variety</label>
            <select
              value={filters.variety || ''}
              onChange={(e) => handleFilterChange('variety', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '12px' }}
            >
              <option value="">All Varieties</option>
              {varieties.map(variety => (
                <option key={variety.id} value={variety.name}>{variety.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#495057', fontWeight: 500 }}>Party</label>
            <input
              type="text"
              value={filters.party || ''}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              placeholder="Search party..."
              style={{ width: '100%', padding: '6px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#495057', fontWeight: 500 }}>Location</label>
            <input
              type="text"
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              placeholder="Search location..."
              style={{ width: '100%', padding: '6px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', marginBottom: '2px', color: '#495057', fontWeight: 500 }}>Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '12px' }}
            >
              <option value="">All</option>
              <option value="STAFF_ENTRY">Staff Entry</option>
              <option value="QUALITY_CHECK">Quality Check</option>
              <option value="LOT_SELECTION">Lot Selection</option>
              <option value="COOKING_REPORT">Cooking Report</option>
              <option value="FINAL_REPORT">Final Report</option>
              <option value="LOT_ALLOTMENT">Lot Allotment</option>
              <option value="PHYSICAL_INSPECTION">Physical Inspection</option>
              <option value="INVENTORY_ENTRY">Inventory Entry</option>
              <option value="OWNER_FINANCIAL">Owner Financial</option>
              <option value="MANAGER_FINANCIAL">Manager Financial</option>
              <option value="FINAL_REVIEW">Final Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
            <button
              onClick={applyFilters}
              style={{
                padding: '6px 15px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '3px'
              }}
            >
              Apply
            </button>
            <button
              onClick={handleClearFilters}
              style={{
                padding: '6px 15px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '3px'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '8px',
          border: '1px solid #bbb',
          fontFamily: "'Segoe UI', Tahoma, sans-serif"
        }}>
          <thead>
            {(() => {
              const thStyle: React.CSSProperties = {
                border: '1px solid #2a4a6b',
                padding: '5px 4px',
                whiteSpace: 'nowrap',
                fontWeight: 600,
                fontSize: '8.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px'
              };
              return (
                <tr style={{ backgroundColor: '#1e3a5f', color: '#fff' }}>
                  <th style={thStyle}>No</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Broker</th>
                  <th style={thStyle}>Variety</th>
                  <th style={thStyle}>Party</th>
                  <th style={thStyle}>Location</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Bags</th>
                  <th style={thStyle}>Lorry</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>M%</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Cut</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Bend</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Mix S</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Mix L</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Mix</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Kandu</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Oil</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>SK</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Grains</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>WB R</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>WB Bk</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>WB T</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Paddy WB</th>
                  <th style={thStyle}>Q.Supv</th>
                  <th style={thStyle}>Cook</th>
                  <th style={thStyle}>Decision</th>
                  <th style={thStyle}>By</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Offer ₹</th>
                  <th style={thStyle}>P.Type</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Final ₹</th>
                  <th style={thStyle}>Supervisor</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Act.Bags</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Gross</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Tare</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Net Wt</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Rate Info</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Base Rate</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total Amt</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Avg Rate</th>
                  <th style={thStyle}></th>
                </tr>
              );
            })()}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={41} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                  ⏳ Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={41} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                  No entries found
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => {
                const inspections = entry.lotAllotment?.physicalInspections || [];
                const totalActualBags = inspections.reduce((sum: number, insp: any) => sum + Number(insp.bags || 0), 0);
                const lorryNumbers = inspections.map((insp: any) => insp.lorryNumber).filter(Boolean).join(', ');
                const allInventory = inspections.map((insp: any) => insp.inventoryData).filter(Boolean);
                const totalGrossWeight = allInventory.reduce((sum: number, inv: any) => sum + Number(inv.grossWeight || 0), 0);
                const totalTareWeight = allInventory.reduce((sum: number, inv: any) => sum + Number(inv.tareWeight || 0), 0);
                const totalNetWeight = allInventory.reduce((sum: number, inv: any) => sum + Number(inv.netWeight || 0), 0);
                const financialCalc = allInventory.find((inv: any) => inv.financialCalculation)?.financialCalculation;
                const entryNumber = `A${String((page - 1) * pageSize + index + 1).padStart(2, '0')}`;

                // Build rate summary string
                const rateSummary = financialCalc ? (() => {
                  const parts: string[] = [];
                  if (financialCalc.suteRate && Number(financialCalc.suteRate) > 0) {
                    parts.push(`S: ${financialCalc.suteRate} ${financialCalc.suteType === 'PER_BAG' ? '/bag' : '/ton'}`);
                  }
                  if (financialCalc.baseRateValue) {
                    parts.push(`BR: ₹${Number(financialCalc.baseRateValue).toLocaleString()} ${financialCalc.baseRateUnit === 'PER_BAG' ? '/bag' : '/Q'}`);
                  }
                  if (financialCalc.brokerageRate && Number(financialCalc.brokerageRate) > 0) {
                    parts.push(`B: ${financialCalc.brokerageRate} ${financialCalc.brokerageUnit === 'PER_BAG' ? '/bag' : '/Q'}`);
                  }
                  if (financialCalc.hamaliRate && Number(financialCalc.hamaliRate) > 0) {
                    parts.push(`H: ${financialCalc.hamaliRate} ${financialCalc.hamaliUnit === 'PER_BAG' ? '/bag' : '/Q'}`);
                  }
                  if (financialCalc.lfinRate && Number(financialCalc.lfinRate) > 0) {
                    parts.push(`LF: ${financialCalc.lfinRate} ${financialCalc.lfinUnit === 'PER_BAG' ? '/bag' : '/Q'}`);
                  }
                  if (financialCalc.egbRate && Number(financialCalc.egbRate) > 0) {
                    parts.push(`EGB: ${financialCalc.egbRate}/bag`);
                  }
                  return parts.join('\n');
                })() : null;

                // Build calculation breakdown tooltip
                const calcBreakdown = financialCalc ? (() => {
                  const lines: string[] = [];
                  if (financialCalc.suteNetWeight) {
                    lines.push(`Sute NW: ${Number(financialCalc.suteNetWeight).toFixed(1)} kg`);
                  }
                  if (financialCalc.baseRateTotal) {
                    lines.push(`Base Rate Amt: ₹${Number(financialCalc.baseRateTotal).toLocaleString()}`);
                  }
                  if (financialCalc.brokerageTotal && Number(financialCalc.brokerageTotal) > 0) {
                    lines.push(`Brokerage: ₹${Number(financialCalc.brokerageTotal).toLocaleString()}`);
                  }
                  if (financialCalc.hamaliTotal && Number(financialCalc.hamaliTotal) > 0) {
                    lines.push(`Hamali: ₹${Number(financialCalc.hamaliTotal).toLocaleString()}`);
                  }
                  if (financialCalc.lfinTotal && Number(financialCalc.lfinTotal) > 0) {
                    lines.push(`LFIN: ₹${Number(financialCalc.lfinTotal).toLocaleString()}`);
                  }
                  if (financialCalc.egbTotal && Number(financialCalc.egbTotal) > 0) {
                    lines.push(`EGB: ₹${Number(financialCalc.egbTotal).toLocaleString()}`);
                  }
                  lines.push(`─────────────`);
                  lines.push(`Total: ₹${Number(financialCalc.totalAmount).toLocaleString()}`);
                  lines.push(`Avg: ₹${Number(financialCalc.average || 0).toFixed(2)}/Q`);
                  return lines.join('\n');
                })() : '';

                const isFailed = entry.workflowStatus === 'FAILED' || entry.lotSelectionDecision === 'FAIL';
                const isCompleted = entry.workflowStatus === 'COMPLETED';
                const rowBg = isFailed ? '#fde8e8' : isCompleted ? '#fef9e7' : (index % 2 === 0 ? '#f7f8fa' : '#ffffff');
                const cellStyle: React.CSSProperties = { border: '1px solid #ddd', padding: '3px 4px', verticalAlign: 'middle', fontSize: '9px', lineHeight: '1.3' };

                return (
                  <tr key={entry.id} style={{ backgroundColor: rowBg }}>
                    <td style={{ ...cellStyle, fontWeight: 600, textAlign: 'center', color: '#2c3e50' }}>{entryNumber}</td>
                    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                      {new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td style={cellStyle}>{entry.entryType}</td>
                    <td style={cellStyle}>{entry.brokerName}</td>
                    <td style={{ ...cellStyle, fontWeight: 500 }}>{entry.variety}</td>
                    <td style={cellStyle}>{entry.partyName}</td>
                    <td style={cellStyle}>{entry.location}</td>
                    <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 600 }}>{entry.bags}</td>
                    <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                      {lorryNumbers || entry.lorryNumber || '-'}
                    </td>
                    <td style={cellStyle}>
                      <span style={{
                        padding: '1px 4px',
                        borderRadius: '3px',
                        backgroundColor:
                          entry.workflowStatus === 'COMPLETED' ? '#d4edda' :
                            entry.workflowStatus === 'FAILED' ? '#f8d7da' :
                              entry.workflowStatus === 'FINAL_REVIEW' ? '#cce5ff' :
                                '#fff3cd',
                        color:
                          entry.workflowStatus === 'COMPLETED' ? '#155724' :
                            entry.workflowStatus === 'FAILED' ? '#721c24' :
                              entry.workflowStatus === 'FINAL_REVIEW' ? '#004085' :
                                '#856404',
                        fontSize: '7px',
                        fontWeight: 600
                      }}>
                        {entry.workflowStatus}
                      </span>
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{entry.qualityParameters?.moisture || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 500 }}>
                      {(() => {
                        const c1 = entry.qualityParameters?.cutting1;
                        const c2 = entry.qualityParameters?.cutting2;
                        const clean = (v: any) => {
                          if (!v && v !== 0) return '';
                          const n = Number(v);
                          return isNaN(n) ? String(v) : (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
                        };
                        const s1 = clean(c1);
                        const s2 = clean(c2);
                        if (s1 && s2) return `${s1} x ${s2}`;
                        if (s1) return s1;
                        if (s2) return s2;
                        return '-';
                      })()}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{entry.qualityParameters?.bend || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{entry.qualityParameters?.mixS || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{entry.qualityParameters?.mixL || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.mix || (entry.qualityParameters as any)?.mixKandu || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.kandu || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.oil || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.sk || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.grainsCount || (entry.qualityParameters as any)?.skGrainsCount || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.wbR || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.wbBk || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.wbT || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{(entry.qualityParameters as any)?.paddyWb || '-'}</td>
                    <td style={cellStyle}>{entry.qualityParameters ? ((entry.qualityParameters as any)?.reportedByUser?.username || (entry.qualityParameters as any)?.reportedBy || '-') : '-'}</td>
                    <td style={cellStyle}>
                      {entry.cookingReport?.status || (entry.lotSelectionDecision === 'PASS_WITHOUT_COOKING' ? 'Skip' : '-')}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      {entry.lotSelectionDecision === 'PASS_WITHOUT_COOKING' ? (
                        <span style={{ color: '#27ae60', fontWeight: 600, fontSize: '7px' }}>PASS</span>
                      ) : entry.lotSelectionDecision === 'PASS_WITH_COOKING' ? (
                        <span style={{ color: '#e67e22', fontWeight: 600, fontSize: '7px' }}>COOK</span>
                      ) : entry.lotSelectionDecision === 'FAIL' ? (
                        <span style={{ color: '#e74c3c', fontWeight: 600, fontSize: '7px' }}>FAIL</span>
                      ) : '-'}
                    </td>
                    <td style={cellStyle}>{entry.lotSelectionByUser?.username || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 500 }}>
                      {entry.offeringPrice ? `₹${entry.offeringPrice}` : '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{entry.priceType || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: '#27ae60' }}>
                      {entry.finalPrice ? `₹${entry.finalPrice}` : '-'}
                    </td>
                    <td style={cellStyle}>{entry.lotAllotment?.supervisor?.username || '-'}</td>
                    <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 500 }}>
                      {totalActualBags > 0 ? totalActualBags : '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      {allInventory.length > 0 ? Number(totalGrossWeight || 0).toFixed(0) : '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      {allInventory.length > 0 ? Number(totalTareWeight || 0).toFixed(0) : '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600 }}>
                      {allInventory.length > 0 ? Number(totalNetWeight || 0).toFixed(0) : '-'}
                    </td>
                    {/* Rate Info - what admin entered */}
                    <td style={{
                      ...cellStyle,
                      fontSize: '7px',
                      whiteSpace: 'pre-line',
                      lineHeight: '1.2',
                      backgroundColor: rateSummary ? '#f0f5ff' : undefined,
                      maxWidth: '90px',
                      color: '#333'
                    }}>
                      {rateSummary || '-'}
                    </td>
                    {/* Base Rate */}
                    <td style={{
                      ...cellStyle,
                      textAlign: 'right',
                      backgroundColor: financialCalc?.baseRateValue ? '#f0f5ff' : undefined
                    }}>
                      {financialCalc?.baseRateValue ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#1a5276' }}>
                            ₹{Number(financialCalc.baseRateValue).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '6.5px', color: '#888' }}>
                            {financialCalc.baseRateType === 'PD_LOOSE' ? 'PD/L' :
                              financialCalc.baseRateType === 'MD_LOOSE' ? 'MD/L' :
                                financialCalc.baseRateType === 'PD_WB' ? 'PD/WB' : 'MD/WB'}
                            {' · '}
                            {financialCalc.baseRateUnit === 'PER_BAG' ? '/bag' : '/Q'}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    {/* Total Amount with hover breakdown */}
                    <td style={{
                      ...cellStyle,
                      textAlign: 'right',
                      fontWeight: 700,
                      backgroundColor: financialCalc?.totalAmount ? '#edf7f0' : undefined,
                      cursor: financialCalc ? 'help' : 'default'
                    }}
                      title={calcBreakdown}
                    >
                      {financialCalc?.totalAmount ? (
                        <span style={{ color: '#145a32', fontSize: '8px' }}>
                          ₹{Number(financialCalc.totalAmount).toLocaleString()}
                        </span>
                      ) : '-'}
                    </td>
                    {/* Avg Rate */}
                    <td style={{
                      ...cellStyle,
                      textAlign: 'right',
                      fontWeight: 600,
                      backgroundColor: financialCalc?.average ? '#edf7f0' : undefined
                    }}>
                      {financialCalc?.average ? (
                        <span style={{ color: '#145a32', fontSize: '8px' }}>
                          ₹{Number(financialCalc.average || 0).toFixed(2)}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button
                        onClick={() => window.open(`/final-review?id=${entry.id}`, '_blank')}
                        style={{
                          fontSize: '7px',
                          padding: '2px 6px',
                          backgroundColor: '#1e3a5f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        border: '1px solid #ddd',
        marginTop: '-1px'
      }}>
        <div style={{ fontSize: '0.85rem', color: '#666' }}>
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
              loadLedger(1);
            }}
            style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value={10}>10 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={500}>500 per page</option>
          </select>
          <button
            disabled={page === 1}
            onClick={() => { setPage(p => p - 1); loadLedger(page - 1); }}
            style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #ccc', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Prev
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Page {page}</span>
          <button
            disabled={page * pageSize >= total}
            onClick={() => { setPage(p => p + 1); loadLedger(page + 1); }}
            style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #ccc', cursor: page * pageSize >= total ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '5px',
          fontSize: '12px'
        }}>
          <strong>Total Entries: {entries.length}</strong>
        </div>
      )}
    </div>
  );
};

export default SampleEntryLedger;
