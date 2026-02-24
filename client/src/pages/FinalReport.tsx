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
  offeringPrice?: number;
  priceType?: string;
  suit?: string;
  offerBaseRate?: string;
  perUnit?: string;
  hamali?: boolean;
  brokerage?: number;
  lf?: number;
  egb?: number;
  customDivisor?: number;
  finalPrice?: number;
}

interface OfferingData {
  offerRate: string;
  sute: string;
  suteUnit: string;
  baseRateType: string;
  baseRateUnit: string;
  offerBaseRateValue: string;
  hamaliEnabled: boolean;
  hamaliPerKg: string;
  hamaliPerQuintal: string;
  hamaliUnit: string;
  moistureValue: string;
  brokerageValue: string;
  brokerageEnabled: boolean;
  brokerageUnit: string;
  lfValue: string;
  lfEnabled: boolean;
  lfUnit: string;
  egbValue: string;
  customDivisor: string;
  remarks: string;
}

interface FinalPriceFormData {
  finalSute: string;
  finalSuteUnit: string;
  finalBaseRate: string;
  baseRateType: string;
  suteEnabled: boolean;
  moistureEnabled: boolean;
  hamaliEnabled: boolean;
  brokerageEnabled: boolean;
  lfEnabled: boolean;
  moistureValue: string;
  hamali: string;
  hamaliUnit: string;
  brokerage: string;
  brokerageUnit: string;
  lf: string;
  lfUnit: string;
  egbValue: string;
  customDivisor: string;
  finalPrice: string;
  remarks: string;
}

// Shared styles
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '6px', fontWeight: '600', color: '#333', fontSize: '13px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fff' };
const radioLabelStyle: React.CSSProperties = { fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' };
const radioGroupStyle: React.CSSProperties = { display: 'flex', gap: '12px', justifyContent: 'center' };
const fieldGroupStyle: React.CSSProperties = { marginBottom: '16px' };
const headerCellStyle: React.CSSProperties = { border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' };
const dataCellStyle: React.CSSProperties = { border: '1px solid #ddd', padding: '6px', fontSize: '11px' };

const FinalReport: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showFinalPriceModal, setShowFinalPriceModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
  const [offeringCache, setOfferingCache] = useState<{ [key: string]: any }>({});
  const isAdmin = (user?.role as string) === 'admin' || (user?.role as string) === 'owner';
  const isManager = user?.role === 'manager';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [offerData, setOfferData] = useState<OfferingData>({
    offerRate: '',
    sute: '',
    suteUnit: 'per_kg',
    baseRateType: 'PD_LOOSE',
    baseRateUnit: 'per_bag',
    offerBaseRateValue: '',
    hamaliEnabled: false,
    hamaliPerKg: '',
    hamaliPerQuintal: '',
    hamaliUnit: 'per_bag',
    moistureValue: '',
    brokerageValue: '',
    brokerageEnabled: false,
    brokerageUnit: 'per_bag',
    lfValue: '',
    lfEnabled: false,
    lfUnit: 'per_bag',
    egbValue: '',
    customDivisor: '',
    remarks: ''
  });

  const [finalData, setFinalData] = useState<FinalPriceFormData>({
    finalSute: '',
    finalSuteUnit: 'per_kg',
    finalBaseRate: '',
    baseRateType: 'PD_LOOSE',
    suteEnabled: false,
    moistureEnabled: false,
    hamaliEnabled: false,
    brokerageEnabled: false,
    lfEnabled: false,
    moistureValue: '',
    hamali: '',
    hamaliUnit: 'per_bag',
    brokerage: '',
    brokerageUnit: 'per_bag',
    lf: '',
    lfUnit: 'per_bag',
    egbValue: '',
    customDivisor: '',
    finalPrice: '',
    remarks: ''
  });

  // Filters
  const [filterBroker, setFilterBroker] = useState('');
  const [filterVariety, setFilterVariety] = useState('');
  // removed party filter
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Server-side Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  // Unique broker/variety lists for dropdowns
  const brokersList = useMemo(() => Array.from(new Set(entries.map(e => e.brokerName))).sort(), [entries]);
  const varietiesList = useMemo(() => Array.from(new Set(entries.map(e => e.variety))).sort(), [entries]);

  useEffect(() => {
    loadEntries();
  }, [currentPage]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params: any = { status: 'FINAL_REPORT', page: currentPage, pageSize };
      if (filterBroker) params.broker = filterBroker;
      if (filterVariety) params.variety = filterVariety;
      if (filterDateFrom) params.startDate = filterDateFrom;
      if (filterDateTo) params.endDate = filterDateTo;
      const response = await axios.get(`${API_URL}/sample-entries/by-role`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data as any;
      const loadedEntries = data.entries || [];
      setEntries(loadedEntries);
      if (data.total != null) {
        setTotalEntries(data.total);
        setTotalPages(data.totalPages || Math.ceil(data.total / pageSize));
      }
      // Load offering details for each entry to display in table
      loadOfferingForEntries(loadedEntries, token!);
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadEntries();
  };

  const loadOfferingForEntries = async (entryList: SampleEntry[], token: string) => {
    const cache: { [key: string]: any } = {};
    for (const entry of entryList) {
      try {
        const res = await axios.get(`${API_URL}/sample-entries/${entry.id}/offering-data`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) cache[entry.id] = res.data;
      } catch { /* skip */ }
    }
    setOfferingCache(cache);
  };

  // Entries are now server-side filtered, no client-side filtering needed
  const paginatedEntries = entries;

  // Group entries by date then broker
  const groupedEntries = useMemo(() => {
    const sorted = [...paginatedEntries].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    const grouped: Record<string, Record<string, typeof sorted>> = {};
    sorted.forEach(entry => {
      const dateKey = entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown Date';
      const brokerKey = entry.brokerName || 'Unknown';
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][brokerKey]) grouped[dateKey][brokerKey] = [];
      grouped[dateKey][brokerKey].push(entry);
    });
    return grouped;
  }, [paginatedEntries]);

  // ===== OFFERING PRICE MODAL =====
  const handleOpenOfferModal = async (entry: SampleEntry) => {
    setSelectedEntry(entry);
    // Try to fetch existing offering data
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/sample-entries/${entry.id}/offering-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d: any = res.data;
      if (d && d.offerRate) {
        setOfferData({
          offerRate: d.offerRate?.toString() || '',
          sute: d.sute?.toString() || '',
          suteUnit: d.suteUnit || 'per_kg',
          baseRateType: d.baseRateType || 'PD_LOOSE',
          baseRateUnit: d.baseRateUnit || 'per_bag',
          offerBaseRateValue: d.offerBaseRateValue?.toString() || '',
          hamaliEnabled: d.hamaliEnabled || false,
          hamaliPerKg: d.hamaliPerKg?.toString() || '',
          hamaliPerQuintal: d.hamaliPerQuintal?.toString() || '',
          hamaliUnit: d.hamaliUnit || d.baseRateUnit || 'per_bag',
          moistureValue: d.moistureValue?.toString() || '',
          brokerageValue: d.brokerage?.toString() || '',
          brokerageEnabled: d.brokerageEnabled || false,
          brokerageUnit: d.brokerageUnit || d.baseRateUnit || 'per_bag',
          lfValue: d.lf?.toString() || '',
          lfEnabled: d.lfEnabled || false,
          lfUnit: d.lfUnit || d.baseRateUnit || 'per_bag',
          egbValue: d.egbValue?.toString() || '',
          customDivisor: d.customDivisor?.toString() || '',
          remarks: ''
        });
      } else {
        resetOfferData(entry);
      }
    } catch {
      resetOfferData(entry);
    }
    setShowOfferModal(true);
  };

  const resetOfferData = (entry: SampleEntry) => {
    setOfferData({
      offerRate: entry.offeringPrice?.toString() || '',
      sute: '',
      suteUnit: entry.suit || 'per_kg',
      baseRateType: entry.offerBaseRate || 'PD_LOOSE',
      baseRateUnit: entry.perUnit || 'per_bag',
      offerBaseRateValue: '',
      hamaliEnabled: entry.hamali || false,
      hamaliPerKg: '',
      hamaliPerQuintal: '',
      hamaliUnit: entry.perUnit || 'per_bag',
      moistureValue: '',
      brokerageValue: entry.brokerage?.toString() || '',
      brokerageEnabled: false,
      brokerageUnit: entry.perUnit || 'per_bag',
      lfValue: entry.lf?.toString() || '',
      lfEnabled: false,
      lfUnit: entry.perUnit || 'per_bag',
      egbValue: entry.egb?.toString() || '',
      customDivisor: entry.customDivisor?.toString() || '',
      remarks: ''
    });
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${selectedEntry.id}/offering-price`,
        {
          offerRate: parseFloat(offerData.offerRate),
          sute: offerData.sute ? parseFloat(offerData.sute) : 0,
          suteUnit: offerData.suteUnit,
          baseRateType: offerData.baseRateType,
          baseRateUnit: offerData.baseRateUnit,
          offerBaseRateValue: offerData.offerBaseRateValue ? parseFloat(offerData.offerBaseRateValue) : 0,
          hamaliEnabled: offerData.hamaliEnabled,
          hamaliPerKg: offerData.hamaliPerKg ? parseFloat(offerData.hamaliPerKg) : 0,
          hamaliPerQuintal: offerData.hamaliPerQuintal ? parseFloat(offerData.hamaliPerQuintal) : 0,
          hamaliUnit: offerData.hamaliUnit,
          moistureValue: offerData.moistureValue ? parseFloat(offerData.moistureValue) : 0,
          brokerageValue: offerData.brokerageValue ? parseFloat(offerData.brokerageValue) : 0,
          brokerageEnabled: offerData.brokerageEnabled,
          brokerageUnit: offerData.brokerageUnit,
          lfValue: offerData.lfValue ? parseFloat(offerData.lfValue) : 0,
          lfEnabled: offerData.lfEnabled,
          lfUnit: offerData.lfUnit,
          egbValue: offerData.egbValue ? parseFloat(offerData.egbValue) : 0,
          customDivisor: offerData.customDivisor ? parseFloat(offerData.customDivisor) : null,
          remarks: offerData.remarks
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification('Offering price saved successfully', 'success');
      setShowOfferModal(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to save offering price', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== FINAL PRICE MODAL =====
  const handleOpenFinalModal = async (entry: SampleEntry) => {
    setSelectedEntry(entry);
    // Fetch offering data to auto-populate
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/sample-entries/${entry.id}/offering-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d: any = res.data;
      if (d) {
        setFinalData({
          finalSute: d.finalSute?.toString() || d.sute?.toString() || '',
          finalSuteUnit: d.finalSuteUnit || d.suteUnit || 'per_kg',
          finalBaseRate: d.finalBaseRate?.toString() || d.offerBaseRateValue?.toString() || '',
          baseRateType: d.baseRateType || 'PD_LOOSE',
          suteEnabled: d.suteEnabled !== false,
          moistureEnabled: d.moistureEnabled !== false,
          hamaliEnabled: d.hamaliEnabled || false,
          brokerageEnabled: d.brokerageEnabled || false,
          lfEnabled: d.lfEnabled || false,
          moistureValue: d.moistureValue?.toString() || '',
          hamali: d.hamali?.toString() || d.hamaliPerKg?.toString() || d.hamaliPerQuintal?.toString() || '',
          hamaliUnit: d.hamaliUnit || d.baseRateUnit || 'per_bag',
          brokerage: d.brokerage?.toString() || '',
          brokerageUnit: d.brokerageUnit || d.baseRateUnit || 'per_bag',
          lf: d.lf?.toString() || '',
          lfUnit: d.lfUnit || d.baseRateUnit || 'per_bag',
          egbValue: d.egbValue?.toString() || '',
          customDivisor: d.customDivisor?.toString() || '',
          finalPrice: d.finalPrice?.toString() || entry.finalPrice?.toString() || '',
          remarks: ''
        });
      }
    } catch {
      setFinalData({
        finalSute: '', finalSuteUnit: 'per_kg', finalBaseRate: '', baseRateType: 'PD_LOOSE',
        suteEnabled: true, moistureEnabled: true,
        hamaliEnabled: false, brokerageEnabled: false, lfEnabled: false,
        moistureValue: '', hamali: '', hamaliUnit: 'per_bag',
        brokerage: '', brokerageUnit: 'per_bag', lf: '', lfUnit: 'per_bag', egbValue: '', customDivisor: '',
        finalPrice: entry.finalPrice?.toString() || '', remarks: ''
      });
    }
    setShowFinalPriceModal(true);
  };

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${selectedEntry.id}/final-price`,
        {
          finalSute: finalData.finalSute ? parseFloat(finalData.finalSute) : null,
          finalSuteUnit: finalData.finalSuteUnit,
          finalBaseRate: finalData.finalBaseRate ? parseFloat(finalData.finalBaseRate) : null,
          suteEnabled: finalData.suteEnabled,
          moistureEnabled: finalData.moistureEnabled,
          hamaliEnabled: finalData.hamaliEnabled,
          brokerageEnabled: finalData.brokerageEnabled,
          lfEnabled: finalData.lfEnabled,
          moistureValue: finalData.moistureValue ? parseFloat(finalData.moistureValue) : null,
          hamali: finalData.hamali ? parseFloat(finalData.hamali) : null,
          hamaliUnit: finalData.hamaliUnit,
          brokerage: finalData.brokerage ? parseFloat(finalData.brokerage) : null,
          brokerageUnit: finalData.brokerageUnit,
          lf: finalData.lf ? parseFloat(finalData.lf) : null,
          lfUnit: finalData.lfUnit,
          egbValue: finalData.egbValue ? parseFloat(finalData.egbValue) : null,
          customDivisor: finalData.customDivisor ? parseFloat(finalData.customDivisor) : null,
          finalPrice: finalData.finalPrice ? parseFloat(finalData.finalPrice) : null,
          isFinalized: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification('Final price saved successfully', 'success');
      setShowFinalPriceModal(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to save final price', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build summary text for offering
  const buildOfferSummary = () => {
    const parts: string[] = [];
    if (offerData.offerRate) parts.push(`₹${offerData.offerRate}`);
    if (offerData.sute) parts.push(`${offerData.sute} sute ${offerData.suteUnit === 'per_kg' ? 'per kg' : 'per ton'}`);
    if (offerData.offerBaseRateValue) {
      const typeLabel = offerData.baseRateType.replace('_', '/');
      const unitLabel = offerData.baseRateUnit === 'per_bag' ? 'per bag' : 'per quintal';
      parts.push(`${offerData.offerBaseRateValue} ${typeLabel} ${unitLabel}`);
    }
    return parts.join(', ') || 'No data entered';
  };

  // Is EGB visible? Not for PD/WB and MD/WB
  const isEgbVisible = offerData.baseRateType !== 'PD_WB' && offerData.baseRateType !== 'MD_WB';
  // Custom divisor visible only for MD/Loose
  const isCustomDivisorVisible = offerData.baseRateType === 'MD_LOOSE';

  return (
    <div>
      {/* Collapsible Filters */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={() => setFiltersVisible(!filtersVisible)}
          style={{
            padding: '7px 16px',
            backgroundColor: filtersVisible ? '#e74c3c' : '#3498db',
            color: 'white', border: 'none', borderRadius: '4px',
            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {filtersVisible ? '✕ Hide Filters' : '🔍 Filters'}
        </button>
        {filtersVisible && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '12px 16px',
            borderRadius: '6px',
            marginTop: '8px',
            border: '1px solid #e0e0e0',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            alignItems: 'flex-end'
          }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '3px' }}>Date From</label>
              <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '3px' }}>Date To</label>
              <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '3px' }}>Broker</label>
              <select value={filterBroker} onChange={e => { setFilterBroker(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px', minWidth: '140px', backgroundColor: 'white' }}>
                <option value="">All Brokers</option>
                {brokersList.map((b, i) => <option key={i} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '600', color: '#555', display: 'block', marginBottom: '3px' }}>Variety</label>
              <select value={filterVariety} onChange={e => { setFilterVariety(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '12px', minWidth: '140px', backgroundColor: 'white' }}>
                <option value="">All Varieties</option>
                {varietiesList.map((v, i) => <option key={i} value={v}>{v}</option>)}
              </select>
            </div>

            {(filterBroker || filterVariety || filterDateFrom || filterDateTo) && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleApplyFilters}
                  style={{ padding: '4px 12px', border: 'none', borderRadius: '3px', backgroundColor: '#3498db', color: 'white', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Apply Filters
                </button>
                <button onClick={() => { setFilterBroker(''); setFilterVariety(''); setFilterDateFrom(''); setFilterDateTo(''); setCurrentPage(1); setTimeout(loadEntries, 0); }}
                  style={{ padding: '4px 12px', border: '1px solid #e74c3c', borderRadius: '3px', backgroundColor: '#fff', color: '#e74c3c', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', backgroundColor: 'white', border: '1px solid #ddd' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
              <th style={headerCellStyle}>SL</th>
              <th style={headerCellStyle}>Broker & Date</th>
              <th style={headerCellStyle}>Bags</th>
              <th style={headerCellStyle}>Pkg</th>
              <th style={headerCellStyle}>Variety</th>
              <th style={headerCellStyle}>Party Name</th>
              <th style={headerCellStyle}>Paddy Location</th>
              <th style={headerCellStyle}>Offering Details</th>
              <th style={headerCellStyle}>Final Price Details</th>
              <th style={headerCellStyle}>Sample Reports</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</td></tr>
            ) : paginatedEntries.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries pending final report</td></tr>
            ) : (
              paginatedEntries.map((entry, index) => (
                <tr key={entry.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                  <td style={{ ...dataCellStyle, textAlign: 'center', fontWeight: '600' }}>{(currentPage - 1) * pageSize + index + 1}</td>
                  <td style={dataCellStyle}>
                    <div style={{ fontWeight: 'bold' }}>{entry.brokerName}</div>
                    <div style={{ color: '#666', fontSize: '10px' }}>{entry.entryDate ? new Date(entry.entryDate).toLocaleDateString('en-IN') : '-'}</div>
                  </td>
                  <td style={{ ...dataCellStyle, textAlign: 'right' }}>{entry.bags}</td>
                  <td style={{ ...dataCellStyle, textAlign: 'center' }}>{entry.packaging || '-'}</td>
                  <td style={dataCellStyle}>{entry.variety}</td>
                  <td style={dataCellStyle}>{entry.partyName}</td>
                  <td style={dataCellStyle}>{entry.location}</td>
                  <td style={{ ...dataCellStyle, fontSize: '10px', maxWidth: '300px', lineHeight: '1.6' }}>
                    {(entry.offeringPrice || offeringCache[entry.id]) ? (() => {
                      const o = offeringCache[entry.id];
                      const unitLabel = (u: string) => u === 'per_bag' ? 'Per Bag' : u === 'per_quintal' ? 'Per Qtl' : '-';
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <div><strong>Base:</strong> {o?.offerBaseRateValue || '-'} ({(o?.baseRateType || entry.offerBaseRate || '-').replace('_', '/')})</div>
                          <div><strong>Sute:</strong> {o?.sute || '-'} {o?.suteUnit === 'per_kg' ? '(Per Kg)' : o?.suteUnit === 'per_ton' ? '(Per Ton)' : ''}</div>
                          <div><strong>Hamali:</strong> {o?.hamaliPerKg || o?.hamali || '-'} <span style={{ color: '#888' }}>({unitLabel(o?.hamaliUnit || 'per_bag')})</span></div>
                          <div><strong>Bkrg:</strong> {o?.brokerage || '-'} <span style={{ color: '#888' }}>({unitLabel(o?.brokerageUnit || 'per_bag')})</span></div>
                          <div><strong>LF:</strong> {o?.lf || '-'} <span style={{ color: '#888' }}>({unitLabel(o?.lfUnit || 'per_bag')})</span></div>
                          <div><strong>EGB:</strong> {(o?.baseRateType || '').toLowerCase().includes('loose') ? (o?.egbValue || '-') : 'N/A'}</div>
                        </div>
                      );
                    })() : '-'}
                  </td>
                  <td style={{ ...dataCellStyle, fontSize: '10px', maxWidth: '280px', lineHeight: '1.6' }}>
                    {(() => {
                      const o = offeringCache[entry.id];
                      if (!entry.finalPrice && !o?.finalPrice) return '-';
                      const unitLabel = (u: string) => u === 'per_bag' ? 'Per Bag' : u === 'per_quintal' ? 'Per Qtl' : '-';
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          <div><strong>Final:</strong> ₹{o?.finalPrice || entry.finalPrice}</div>
                          {o?.finalBaseRate ? <div><strong>Base Rate:</strong> {o.finalBaseRate} ({(o?.baseRateType || entry.offerBaseRate || '-').replace('_', '/')})</div> : null}
                          {o?.finalSute ? <div><strong>Sute:</strong> {o.finalSute} {o.finalSuteUnit === 'per_kg' ? '(Per Kg)' : '(Per Ton)'}</div> : null}
                          {o?.hamaliEnabled ? <div><strong>Hamali:</strong> {o.hamaliPerKg || o.hamali || '-'} <span style={{ color: '#888' }}>({unitLabel(o?.hamaliUnit || 'per_bag')})</span></div> : <div style={{ color: '#999' }}>Hamali: No</div>}
                          {o?.brokerageEnabled ? <div><strong>Bkrg:</strong> {o.brokerage || '-'} <span style={{ color: '#888' }}>({unitLabel(o?.brokerageUnit || 'per_bag')})</span></div> : <div style={{ color: '#999' }}>Bkrg: No</div>}
                          {o?.lfEnabled ? <div><strong>LF:</strong> {o.lf || '-'} <span style={{ color: '#888' }}>({unitLabel(o?.lfUnit || 'per_bag')})</span></div> : <div style={{ color: '#999' }}>LF: No</div>}
                          {(o?.baseRateType || '').toLowerCase().includes('loose') && <div><strong>EGB:</strong> {o?.egbValue || '-'}</div>}
                          {(o?.baseRateType || '').toLowerCase() === 'md_loose' && o?.customDivisor && <div><strong>Divisor:</strong> {o.customDivisor}</div>}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ ...dataCellStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {isAdmin && (
                        <button
                          onClick={() => handleOpenOfferModal(entry)}
                          style={{
                            fontSize: '10px', padding: '4px 8px',
                            backgroundColor: entry.offeringPrice ? '#3498db' : '#2196F3',
                            color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer',
                            fontWeight: '600', minWidth: '70px'
                          }}
                        >
                          {entry.offeringPrice ? 'Edit Offer' : 'Add Offer'}
                        </button>
                      )}
                      {(isAdmin || isManager) && (entry.offeringPrice || offeringCache[entry.id]) && (
                        <button
                          onClick={() => handleOpenFinalModal(entry)}
                          style={{
                            fontSize: '10px', padding: '4px 8px',
                            backgroundColor: entry.finalPrice ? '#27ae60' : '#e67e22',
                            color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer',
                            fontWeight: '600', minWidth: '70px'
                          }}
                        >
                          {entry.finalPrice ? 'Edit Final' : 'Add Final'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
          padding: '12px', fontSize: '12px'
        }}>
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
            style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', cursor: currentPage === 1 ? 'default' : 'pointer', backgroundColor: currentPage === 1 ? '#f0f0f0' : 'white', fontSize: '11px' }}>
            First
          </button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', cursor: currentPage === 1 ? 'default' : 'pointer', backgroundColor: currentPage === 1 ? '#f0f0f0' : 'white', fontSize: '11px' }}>
            ‹ Prev
          </button>
          <span style={{ fontWeight: '500', color: '#555' }}>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', cursor: currentPage === totalPages ? 'default' : 'pointer', backgroundColor: currentPage === totalPages ? '#f0f0f0' : 'white', fontSize: '11px' }}>
            Next ›
          </button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
            style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: '3px', cursor: currentPage === totalPages ? 'default' : 'pointer', backgroundColor: currentPage === totalPages ? '#f0f0f0' : 'white', fontSize: '11px' }}>
            Last
          </button>
          <span style={{ color: '#888', marginLeft: '8px' }}>({totalEntries} total)</span>
        </div>
      )}

      {/* ==================== OFFERING PRICE MODAL ==================== */}
      {showOfferModal && selectedEntry && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px',
            width: '100%', maxWidth: '1400px', height: '95vh',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflowY: 'auto'
          }}>
            <h3 style={{
              marginTop: 0, marginBottom: '20px', fontSize: '22px', fontWeight: '700',
              color: '#2c3e50', borderBottom: '3px solid #3498db', paddingBottom: '12px',
              position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10
            }}>
              Set Offering Price
            </h3>

            {/* Entry Info */}
            <div style={{
              backgroundColor: '#eaf2f8', padding: '10px 12px', borderRadius: '6px',
              marginBottom: '16px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px'
            }}>
              <div><strong>Broker:</strong> {selectedEntry.brokerName}</div>
              <div><strong>Variety:</strong> {selectedEntry.variety}</div>
              <div><strong>Bags:</strong> {selectedEntry.bags}</div>
              <div><strong>Party:</strong> {selectedEntry.partyName}</div>
              <div><strong>Paddy Location:</strong> {selectedEntry.location}</div>
            </div>

            <form onSubmit={handleSubmitOffer}>


              {/* Row 2: Sute value + Per Kg / Per Ton radios (same row) */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Sute</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="number" step="0.01" value={offerData.sute}
                    onChange={e => setOfferData({ ...offerData, sute: e.target.value })}
                    style={{ ...inputStyle, flex: '1' }} placeholder="Sute value" />
                  <label style={radioLabelStyle}>
                    <input type="radio" name="suteUnit"
                      checked={offerData.suteUnit === 'per_kg'}
                      onChange={() => setOfferData({ ...offerData, suteUnit: 'per_kg' })} /> Per Kg
                  </label>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="suteUnit"
                      checked={offerData.suteUnit === 'per_ton'}
                      onChange={() => setOfferData({ ...offerData, suteUnit: 'per_ton' })} /> Per Ton
                  </label>
                </div>
              </div>

              {/* Row 3: Offer Base Rate — type select + value + MASTER per bag/quintal toggle */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Offer Base Rate *</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={offerData.baseRateType}
                    onChange={e => setOfferData({ ...offerData, baseRateType: e.target.value })}
                    style={{ ...inputStyle, flex: '0 0 130px', cursor: 'pointer' }} required>
                    <option value="PD_LOOSE">PD/Loose</option>
                    <option value="PD_WB">PD/WB</option>
                    <option value="MD_WB">MD/WB</option>
                    <option value="MD_LOOSE">MD/Loose</option>
                  </select>
                  <input type="number" step="0.01" value={offerData.offerBaseRateValue}
                    onChange={e => setOfferData({ ...offerData, offerBaseRateValue: e.target.value })}
                    style={{ ...inputStyle, flex: '1' }} placeholder="Rate value" />
                  <label style={radioLabelStyle}>
                    <input type="radio" name="baseRateUnit"
                      checked={offerData.baseRateUnit === 'per_bag'}
                      onChange={() => setOfferData({ ...offerData, baseRateUnit: 'per_bag', hamaliUnit: 'per_bag', brokerageUnit: 'per_bag', lfUnit: 'per_bag' })} /> Per Bag (All)
                  </label>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="baseRateUnit"
                      checked={offerData.baseRateUnit === 'per_quintal'}
                      onChange={() => setOfferData({ ...offerData, baseRateUnit: 'per_quintal', hamaliUnit: 'per_quintal', brokerageUnit: 'per_quintal', lfUnit: 'per_quintal' })} /> Per Qtl (All)
                  </label>
                </div>
              </div>

              {/* Row 3b: Custom Divisor — directly below base rate, only for MD/Loose */}
              {isCustomDivisorVisible && (
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Custom Divisor (MD/Loose)</label>
                  <input type="number" step="0.01" value={offerData.customDivisor}
                    onChange={e => setOfferData({ ...offerData, customDivisor: e.target.value })}
                    style={inputStyle} placeholder="Custom divisor number" />
                </div>
              )}

              {/* Row 4: Hamali — value input + Per Bag/Per Quintal radios */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Hamali</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="number" step="0.01" value={offerData.hamaliPerKg}
                    onChange={e => setOfferData({ ...offerData, hamaliPerKg: e.target.value, hamaliEnabled: true })}
                    style={{ ...inputStyle, flex: '1', minWidth: '80px' }} placeholder="Hamali value" />
                  <label style={radioLabelStyle}>
                    <input type="radio" name="hamaliUnit" checked={offerData.hamaliUnit === 'per_bag'} onChange={() => setOfferData({ ...offerData, hamaliUnit: 'per_bag' })} /> Per Bag
                  </label>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="hamaliUnit" checked={offerData.hamaliUnit === 'per_quintal'} onChange={() => setOfferData({ ...offerData, hamaliUnit: 'per_quintal' })} /> Per Qtl
                  </label>
                </div>
              </div>

              {/* Row 5: Moisture */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Moisture (%)</label>
                <input type="number" step="0.01" value={offerData.moistureValue}
                  onChange={e => setOfferData({ ...offerData, moistureValue: e.target.value })}
                  style={inputStyle} placeholder="Moisture percentage" />
              </div>

              {/* Row 6: Brokerage — value input + Per Bag/Per Quintal radios */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Brokerage</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="number" step="0.01" value={offerData.brokerageValue}
                    onChange={e => setOfferData({ ...offerData, brokerageValue: e.target.value, brokerageEnabled: true })}
                    style={{ ...inputStyle, flex: '1', minWidth: '80px' }} placeholder="Brokerage value" />
                  <label style={radioLabelStyle}>
                    <input type="radio" name="brokerageUnit" checked={offerData.brokerageUnit === 'per_bag'} onChange={() => setOfferData({ ...offerData, brokerageUnit: 'per_bag' })} /> Per Bag
                  </label>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="brokerageUnit" checked={offerData.brokerageUnit === 'per_quintal'} onChange={() => setOfferData({ ...offerData, brokerageUnit: 'per_quintal' })} /> Per Qtl
                  </label>
                </div>
              </div>

              {/* Row 7: LF — value input + Per Bag/Per Quintal radios */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>LF</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="number" step="0.01" value={offerData.lfValue}
                    onChange={e => setOfferData({ ...offerData, lfValue: e.target.value, lfEnabled: true })}
                    style={{ ...inputStyle, flex: '1', minWidth: '80px' }} placeholder="LF value" />
                  <label style={radioLabelStyle}>
                    <input type="radio" name="lfUnit" checked={offerData.lfUnit === 'per_bag'} onChange={() => setOfferData({ ...offerData, lfUnit: 'per_bag' })} /> Per Bag
                  </label>
                  <label style={radioLabelStyle}>
                    <input type="radio" name="lfUnit" checked={offerData.lfUnit === 'per_quintal'} onChange={() => setOfferData({ ...offerData, lfUnit: 'per_quintal' })} /> Per Qtl
                  </label>
                </div>
              </div>

              {/* EGB — only for PD/Loose and MD/Loose (hidden for WB types) */}
              {isEgbVisible && (
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>EGB</label>
                  <input type="number" step="0.01" value={offerData.egbValue}
                    onChange={e => setOfferData({ ...offerData, egbValue: e.target.value })}
                    style={inputStyle} placeholder="EGB value" />
                </div>
              )}

              {/* Save Summary */}
              <div style={{
                backgroundColor: '#e8f5e9', padding: '10px 12px', borderRadius: '6px',
                marginBottom: '12px', fontSize: '12px', border: '1px solid #c8e6c9'
              }}>
                <strong style={{ color: '#2e7d32' }}>Summary:</strong>
                <span style={{ marginLeft: '6px', color: '#555' }}>{buildOfferSummary()}</span>
              </div>

              {/* Remarks */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Remarks</label>
                <textarea value={offerData.remarks}
                  onChange={e => setOfferData({ ...offerData, remarks: e.target.value })}
                  style={{ ...inputStyle, minHeight: '50px' }} placeholder="Enter remarks..." />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                <button type="button" onClick={() => setShowOfferModal(false)} disabled={isSubmitting}
                  style={{ padding: '8px 16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white', fontSize: '13px', color: '#666' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  style={{ padding: '8px 20px', cursor: isSubmitting ? 'not-allowed' : 'pointer', backgroundColor: isSubmitting ? '#95a5a6' : '#3498db', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>
                  {isSubmitting ? 'Saving...' : '💾 Save Offering Price'}
                </button>
              </div>
            </form>
          </div>
        </div >
      )}

      {/* ==================== FINAL PRICE MODAL ==================== */}
      {showFinalPriceModal && selectedEntry && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px',
            width: '100%', maxWidth: '1400px', height: '95vh',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflowY: 'auto'
          }}>
            <h3 style={{
              marginTop: 0, marginBottom: '20px', fontSize: '22px', fontWeight: '700',
              color: '#2c3e50', borderBottom: '3px solid #27ae60', paddingBottom: '12px',
              position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10
            }}>
              Set Final Price
            </h3>

            {/* Entry Info */}
            <div style={{
              backgroundColor: '#e8f8f5', padding: '12px', borderRadius: '6px',
              marginBottom: '16px', fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px'
            }}>
              <div><strong>Broker:</strong> {selectedEntry.brokerName}</div>
              <div><strong>Variety:</strong> {selectedEntry.variety}</div>
              <div><strong>Bags:</strong> {selectedEntry.bags}</div>
              <div><strong>Offering:</strong> ₹{selectedEntry.offeringPrice || '-'}</div>
            </div>

            <form onSubmit={handleSubmitFinal}>
              {/* Auto-fetched from offering */}
              <div style={{
                ...fieldGroupStyle, backgroundColor: '#f0f4f8', padding: '12px',
                borderRadius: '6px', border: '1px solid #d0d8e0'
              }}>
                <label style={{ ...labelStyle, fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  Auto-Fetched from Offering Price
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Sute (auto) {!finalData.suteEnabled && <span style={{ color: '#e74c3c', fontSize: '10px' }}>(Admin: No)</span>}</label>
                    <input type="number" step="0.01" value={finalData.finalSute}
                      onChange={e => setFinalData({ ...finalData, finalSute: e.target.value })}
                      style={{ ...inputStyle, backgroundColor: '#f9f9f9', opacity: finalData.suteEnabled ? 1 : 0.6 }}
                      readOnly={!finalData.suteEnabled && !isManager} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sute Unit</label>
                    <div style={radioGroupStyle}>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="finalSuteUnit"
                          checked={finalData.finalSuteUnit === 'per_kg'}
                          onChange={() => setFinalData({ ...finalData, finalSuteUnit: 'per_kg' })} /> Per Kg
                      </label>
                      <label style={radioLabelStyle}>
                        <input type="radio" name="finalSuteUnit"
                          checked={finalData.finalSuteUnit === 'per_ton'}
                          onChange={() => setFinalData({ ...finalData, finalSuteUnit: 'per_ton' })} /> Per Ton
                      </label>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <label style={labelStyle}>Final Base Rate (auto)</label>
                  <input type="number" step="0.01" value={finalData.finalBaseRate}
                    onChange={e => setFinalData({ ...finalData, finalBaseRate: e.target.value })}
                    style={{ ...inputStyle, backgroundColor: '#f9f9f9' }} />
                </div>
              </div>

              {/* Admin Toggles */}
              {isAdmin && (
                <div style={{
                  ...fieldGroupStyle, backgroundColor: '#fff3e0', padding: '12px',
                  borderRadius: '6px', border: '1px solid #ffe0b2'
                }}>
                  <label style={{ ...labelStyle, fontWeight: '600', color: '#333', marginBottom: '10px' }}>
                    👉 Manager Should Fill? (Select "No" for Manager to fill these fields)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
                    {/* Sute Toggle */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Sute</div>
                      <div style={radioGroupStyle}>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalSuteEnabled"
                            checked={finalData.suteEnabled}
                            onChange={() => setFinalData({ ...finalData, suteEnabled: true })} />
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>Yes</span>
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalSuteEnabled"
                            checked={!finalData.suteEnabled}
                            onChange={() => setFinalData({ ...finalData, suteEnabled: false })} />
                          <span style={{ color: '#e74c3c', fontWeight: '600' }}>No</span>
                        </label>
                      </div>
                    </div>
                    {/* Moisture Toggle */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Moisture</div>
                      <div style={radioGroupStyle}>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalMoistureEnabled"
                            checked={finalData.moistureEnabled}
                            onChange={() => setFinalData({ ...finalData, moistureEnabled: true })} />
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>Yes</span>
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalMoistureEnabled"
                            checked={!finalData.moistureEnabled}
                            onChange={() => setFinalData({ ...finalData, moistureEnabled: false })} />
                          <span style={{ color: '#e74c3c', fontWeight: '600' }}>No</span>
                        </label>
                      </div>
                    </div>
                    {/* Hamali Toggle */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Hamali</div>
                      <div style={radioGroupStyle}>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalHamaliEnabled"
                            checked={finalData.hamaliEnabled}
                            onChange={() => setFinalData({ ...finalData, hamaliEnabled: true })} />
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>Yes</span>
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalHamaliEnabled"
                            checked={!finalData.hamaliEnabled}
                            onChange={() => setFinalData({ ...finalData, hamaliEnabled: false })} />
                          <span style={{ color: '#e74c3c', fontWeight: '600' }}>No</span>
                        </label>
                      </div>
                    </div>
                    {/* Brokerage Toggle */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Brokerage</div>
                      <div style={radioGroupStyle}>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalBrokerageEnabled"
                            checked={finalData.brokerageEnabled}
                            onChange={() => setFinalData({ ...finalData, brokerageEnabled: true })} />
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>Yes</span>
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalBrokerageEnabled"
                            checked={!finalData.brokerageEnabled}
                            onChange={() => setFinalData({ ...finalData, brokerageEnabled: false })} />
                          <span style={{ color: '#e74c3c', fontWeight: '600' }}>No</span>
                        </label>
                      </div>
                    </div>
                    {/* LF Toggle */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>LF</div>
                      <div style={radioGroupStyle}>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalLfEnabled"
                            checked={finalData.lfEnabled}
                            onChange={() => setFinalData({ ...finalData, lfEnabled: true })} />
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>Yes</span>
                        </label>
                        <label style={radioLabelStyle}>
                          <input type="radio" name="finalLfEnabled"
                            checked={!finalData.lfEnabled}
                            onChange={() => setFinalData({ ...finalData, lfEnabled: false })} />
                          <span style={{ color: '#e74c3c', fontWeight: '600' }}>No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Value Fields — Manager sees ALL fields, Admin sees only enabled fields */}
              <div style={{
                ...fieldGroupStyle, backgroundColor: '#f3e5f5', padding: '12px',
                borderRadius: '6px', border: '1px solid #e1bee7'
              }}>
                <label style={{ ...labelStyle, fontWeight: '600', color: '#333', marginBottom: '10px' }}>
                  {isAdmin ? 'Value Fields (Editable by Admin)' : 'Manager Entry — Fill Remaining Values'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

                  {/* Moisture */}
                  <div>
                    <label style={labelStyle}>Moisture (%) {!finalData.moistureEnabled && <span style={{ color: '#e74c3c', fontSize: '10px' }}>(Admin: No)</span>}</label>
                    <input type="number" step="0.01" value={finalData.moistureValue}
                      onChange={e => setFinalData({ ...finalData, moistureValue: e.target.value, moistureEnabled: true })}
                      style={inputStyle} placeholder="Moisture %" />
                  </div>

                  {/* Hamali */}
                  <div>
                    <label style={labelStyle}>Hamali {!finalData.hamaliEnabled && <span style={{ color: '#e74c3c', fontSize: '10px' }}>(Admin: No)</span>}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" step="0.01" value={finalData.hamali}
                        onChange={e => setFinalData({ ...finalData, hamali: e.target.value, hamaliEnabled: true })}
                        style={{ ...inputStyle, flex: 1 }} placeholder="Amount" />
                      <select value={finalData.hamaliUnit}
                        onChange={e => setFinalData({ ...finalData, hamaliUnit: e.target.value, hamaliEnabled: true })}
                        style={{ ...inputStyle, width: '100px' }}>
                        <option value="per_bag">Per Bag</option>
                        <option value="per_quintal">Per Qtl</option>
                      </select>
                    </div>
                  </div>

                  {/* Brokerage */}
                  <div>
                    <label style={labelStyle}>Brokerage {!finalData.brokerageEnabled && <span style={{ color: '#e74c3c', fontSize: '10px' }}>(Admin: No)</span>}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" step="0.01" value={finalData.brokerage}
                        onChange={e => setFinalData({ ...finalData, brokerage: e.target.value, brokerageEnabled: true })}
                        style={{ ...inputStyle, flex: 1 }} placeholder="Amount" />
                      <select value={finalData.brokerageUnit}
                        onChange={e => setFinalData({ ...finalData, brokerageUnit: e.target.value, brokerageEnabled: true })}
                        style={{ ...inputStyle, width: '100px' }}>
                        <option value="per_bag">Per Bag</option>
                        <option value="per_quintal">Per Qtl</option>
                      </select>
                    </div>
                  </div>

                  {/* LF */}
                  <div>
                    <label style={labelStyle}>LF {!finalData.lfEnabled && <span style={{ color: '#e74c3c', fontSize: '10px' }}>(Admin: No)</span>}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" step="0.01" value={finalData.lf}
                        onChange={e => setFinalData({ ...finalData, lf: e.target.value, lfEnabled: true })}
                        style={{ ...inputStyle, flex: 1 }} placeholder="Amount" />
                      <select value={finalData.lfUnit}
                        onChange={e => setFinalData({ ...finalData, lfUnit: e.target.value, lfEnabled: true })}
                        style={{ ...inputStyle, width: '100px' }}>
                        <option value="per_bag">Per Bag</option>
                        <option value="per_quintal">Per Qtl</option>
                      </select>
                    </div>
                  </div>

                </div>
              </div>

              {/* EGB — only for PD/Loose and MD/Loose */}
              {(finalData.baseRateType === 'PD_LOOSE' || finalData.baseRateType === 'MD_LOOSE' ||
                finalData.baseRateType === 'pd_loose' || finalData.baseRateType === 'md_loose') && (
                  <div style={fieldGroupStyle}>
                    <label style={labelStyle}>EGB (Loose type)</label>
                    <input type="number" step="0.01" value={finalData.egbValue}
                      onChange={e => setFinalData({ ...finalData, egbValue: e.target.value })}
                      style={inputStyle} placeholder="EGB value" />
                  </div>
                )}

              {/* Custom Divisor — only for MD/Loose */}
              {(finalData.baseRateType === 'MD_LOOSE' || finalData.baseRateType === 'md_loose') && (
                <div style={fieldGroupStyle}>
                  <label style={labelStyle}>Custom Divisor (MD/Loose)</label>
                  <input type="number" step="0.01" value={finalData.customDivisor}
                    onChange={e => setFinalData({ ...finalData, customDivisor: e.target.value })}
                    style={inputStyle} placeholder="Custom divisor" />
                </div>
              )}

              {/* Remarks */}
              <div style={fieldGroupStyle}>
                <label style={labelStyle}>Remarks</label>
                <textarea value={finalData.remarks}
                  onChange={e => setFinalData({ ...finalData, remarks: e.target.value })}
                  style={{ ...inputStyle, minHeight: '50px' }} placeholder="Enter remarks..." />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                <button type="button" onClick={() => setShowFinalPriceModal(false)} disabled={isSubmitting}
                  style={{ padding: '8px 16px', cursor: isSubmitting ? 'not-allowed' : 'pointer', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white', fontSize: '13px', color: '#666' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  style={{ padding: '8px 20px', cursor: isSubmitting ? 'not-allowed' : 'pointer', backgroundColor: isSubmitting ? '#95a5a6' : '#27ae60', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: '600' }}>
                  {isSubmitting ? 'Saving...' : '💾 Save Final Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )
      }

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '16px 0', marginTop: '12px' }}>
        <button
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: currentPage <= 1 ? '#eee' : '#fff', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: '600' }}
        >
          ← Prev
        </button>
        <span style={{ fontSize: '13px', color: '#666' }}>
          Page {currentPage} of {totalPages} &nbsp;({totalEntries} total)
        </span>
        <button
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          style={{ padding: '6px 16px', borderRadius: '4px', border: '1px solid #ccc', background: currentPage >= totalPages ? '#eee' : '#fff', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: '600' }}
        >
          Next →
        </button>
      </div>
    </div >
  );
};

export default FinalReport;
