import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  workflowStatus: string;
  lotAllotment?: {
    id: string;
    allottedToSupervisorId: number;
    allottedBags?: number;
    supervisor: {
      id: number;
      username: string;
    };
  };
}

interface Supervisor {
  id: number;
  username: string;
}

interface PreviousInspection {
  id: string;
  inspectionDate: string;
  lorryNumber: string;
  bags: number;
  cutting1: number;
  cutting2: number;
  bend: number;
  reportedBy: {
    username: string;
  };
}

interface InspectionProgress {
  totalBags: number;
  inspectedBags: number;
  remainingBags: number;
  progressPercentage: number;
  previousInspections: PreviousInspection[];
}

const AllottedSupervisors: React.FC = () => {
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupervisors, setSelectedSupervisors] = useState<{ [key: string]: number }>({});
  const [inspectionProgress, setInspectionProgress] = useState<{ [key: string]: InspectionProgress }>({});
  const [expandedEntries, setExpandedEntries] = useState<{ [key: string]: boolean }>({});
  const [closingEntryId, setClosingEntryId] = useState<string | null>(null);
  const [closeLotReason, setCloseLotReason] = useState('');
  const [offeringCache, setOfferingCache] = useState<{ [key: string]: any }>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalEntries, setTotalEntries] = useState(0);

  // Filter options (for dropdowns)
  const [brokerOptions, setBrokerOptions] = useState<string[]>([]);
  const [varietyOptions, setVarietyOptions] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    broker: '',
    variety: '',
    party: '',
    status: ''
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      broker: '',
      variety: '',
      party: '',
      status: ''
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    loadSupervisors();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [currentPage, filters]);

  const applyFilters = (allEntries: any[]) => {
    return allEntries.filter((entry: any) => {
      // Date filter
      if (filters.startDate) {
        const entryDate = new Date(entry.entryDate);
        const startDate = new Date(filters.startDate);
        if (entryDate < startDate) return false;
      }
      if (filters.endDate) {
        const entryDate = new Date(entry.entryDate);
        const endDate = new Date(filters.endDate);
        if (entryDate > endDate) return false;
      }
      // Broker filter
      if (filters.broker && !entry.brokerName?.toLowerCase().includes(filters.broker.toLowerCase())) {
        return false;
      }
      // Variety filter
      if (filters.variety && !entry.variety?.toLowerCase().includes(filters.variety.toLowerCase())) {
        return false;
      }
      // Party filter
      if (filters.party && !entry.partyName?.toLowerCase().includes(filters.party.toLowerCase())) {
        return false;
      }
      // Status filter
      if (filters.status && entry.workflowStatus !== filters.status) {
        return false;
      }
      return true;
    });
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch entries with multiple statuses to ensure they don't disappear after workflow progresses
      const [lotAllotmentResponse, physicalInspectionResponse, inventoryResponse, ownerFinancialResponse, managerFinancialResponse, finalReviewResponse, completedResponse] = await Promise.all([
        axios.get(`${API_URL}/sample-entries/by-role?status=LOT_ALLOTMENT`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sample-entries/by-role?status=PHYSICAL_INSPECTION`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sample-entries/by-role?status=INVENTORY_ENTRY`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sample-entries/by-role?status=OWNER_FINANCIAL`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sample-entries/by-role?status=MANAGER_FINANCIAL`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sample-entries/by-role?status=FINAL_REVIEW`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sample-entries/by-role?status=COMPLETED`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const lotAllotmentEntries = (lotAllotmentResponse.data as any).entries || [];
      const physicalInspectionEntries = (physicalInspectionResponse.data as any).entries || [];
      const inventoryEntries = (inventoryResponse.data as any).entries || [];
      const ownerFinancialEntries = (ownerFinancialResponse.data as any).entries || [];
      const managerFinancialEntries = (managerFinancialResponse.data as any).entries || [];
      const finalReviewEntries = (finalReviewResponse.data as any).entries || [];
      const completedEntries = (completedResponse.data as any).entries || [];

      // Combine all arrays and remove duplicates
      const allMap = new Map();
      [...lotAllotmentEntries, ...physicalInspectionEntries, ...inventoryEntries, ...ownerFinancialEntries, ...managerFinancialEntries, ...finalReviewEntries, ...completedEntries].forEach((entry: any) => {
        allMap.set(entry.id, entry);
      });
      let allEntries = Array.from(allMap.values());

      // Extract unique broker and variety options for dropdowns
      const brokerSet = new Set(allEntries.map((e: any) => e.brokerName).filter(Boolean));
      const varietySet = new Set(allEntries.map((e: any) => e.variety).filter(Boolean));
      const brokers = Array.from(brokerSet).sort();
      const varieties = Array.from(varietySet).sort();
      setBrokerOptions(brokers);
      setVarietyOptions(varieties);

      // Apply filters
      allEntries = applyFilters(allEntries);

      // Apply pagination
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedEntries = allEntries.slice(startIndex, startIndex + pageSize);
      setEntries(paginatedEntries);

      // Pre-populate selected supervisors with current assignments
      const preSelected: { [key: string]: number } = {};
      allEntries.forEach((entry: SampleEntry) => {
        if (entry.lotAllotment?.allottedToSupervisorId) {
          preSelected[entry.id] = entry.lotAllotment.allottedToSupervisorId;
        }
      });
      setSelectedSupervisors(preSelected);

      // Load offering data for each entry
      const offerCache: { [key: string]: any } = {};
      for (const entry of allEntries) {
        try {
          const offerRes = await axios.get(`${API_URL}/sample-entries/${entry.id}/offering-data`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (offerRes.data) offerCache[entry.id] = offerRes.data;
        } catch { /* skip */ }
      }
      setOfferingCache(offerCache);

      // Load inspection progress for each entry
      for (const entry of allEntries) {
        await loadInspectionProgress(entry.id);
      }

    } catch (error: any) {
      console.error('Error loading allotted entries:', error);
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInspectionProgress = async (entryId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get<InspectionProgress>(`${API_URL}/sample-entries/${entryId}/inspection-progress`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInspectionProgress(prev => ({
        ...prev,
        [entryId]: response.data as InspectionProgress
      }));
    } catch (error: any) {
      console.error('Failed to load inspection progress for', entryId, error);
      setInspectionProgress(prev => ({
        ...prev,
        [entryId]: {
          totalBags: 0,
          inspectedBags: 0,
          remainingBags: 0,
          progressPercentage: 0,
          previousInspections: []
        }
      }));
    }
  };

  const loadSupervisors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/admin/physical-supervisors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const physicalSupervisors = (response.data as any).users || [];
      setSupervisors(physicalSupervisors);
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load supervisors', 'error');
    }
  };

  const handleSupervisorChange = (entryId: string, supervisorId: number) => {
    setSelectedSupervisors(prev => ({
      ...prev,
      [entryId]: supervisorId
    }));
  };

  const handleReassign = async (entryId: string) => {
    const supervisorId = selectedSupervisors[entryId];
    const entry = entries.find(e => e.id === entryId);

    if (!supervisorId) {
      showNotification('Please select a physical supervisor', 'error');
      return;
    }

    // Check if supervisor actually changed
    if (entry?.lotAllotment?.allottedToSupervisorId === supervisorId) {
      showNotification('Please select a different supervisor to reassign', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Update existing lot allotment
      await axios.put(
        `${API_URL}/sample-entries/${entryId}/lot-allotment`,
        {
          physicalSupervisorId: supervisorId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification('Physical supervisor reassigned successfully', 'success');
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to reassign supervisor', 'error');
    }
  };

  const handleCloseLot = async (entryId: string) => {
    const progress = inspectionProgress[entryId];
    const entry = entries.find(e => e.id === entryId);

    if (!progress || progress.inspectedBags === 0) {
      showNotification('Cannot close lot with 0 inspected bags. At least one inspection trip is required.', 'error');
      return;
    }

    const confirmMsg = `Are you sure you want to close this lot?\n\n` +
      `Party: ${entry?.partyName || 'Unknown'}\n` +
      `Allotted: ${progress.totalBags} bags\n` +
      `Inspected: ${progress.inspectedBags} bags\n` +
      `Remaining (not sent): ${progress.remainingBags} bags\n\n` +
      `The ${progress.inspectedBags} inspected bags will proceed to inventory.\n` +
      `The remaining ${progress.remainingBags} bags will be marked as not received.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/sample-entries/${entryId}/close-lot`,
        { reason: closeLotReason || `Party did not send remaining ${progress.remainingBags} bags` },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showNotification(
        `Lot closed successfully! ${progress.inspectedBags} bags proceed to inventory. ${progress.remainingBags} bags marked as not received.`,
        'success'
      );
      setClosingEntryId(null);
      setCloseLotReason('');
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to close lot', 'error');
    }
  };

  const toggleExpand = (entryId: string) => {
    setExpandedEntries(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return '#4CAF50';
    if (percentage >= 50) return '#FFC107';
    return '#2196F3';
  };

  return (
    <div>
      {/* Filters Section */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#333' }}>🔍 Filters</h3>
          <button
            onClick={clearFilters}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              backgroundColor: '#e2e8f0',
              color: '#666',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '10px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>From Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>To Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>Broker</label>
            <select
              value={filters.broker}
              onChange={(e) => handleFilterChange('broker', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Brokers</option>
              {brokerOptions.map(broker => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>Variety</label>
            <select
              value={filters.variety}
              onChange={(e) => handleFilterChange('variety', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Varieties</option>
              {varietyOptions.map(variety => (
                <option key={variety} value={variety}>{variety}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>Party</label>
            <input
              type="text"
              placeholder="Search party..."
              value={filters.party}
              onChange={(e) => handleFilterChange('party', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', color: '#666' }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ width: '100%', padding: '6px', fontSize: '11px', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="">All Status</option>
              <option value="LOT_ALLOTMENT">Lot Allotment</option>
              <option value="PHYSICAL_INSPECTION">Physical Inspection</option>
              <option value="INVENTORY_ENTRY">Inventory Entry</option>
              <option value="OWNER_FINANCIAL">Owner Financial</option>
              <option value="MANAGER_FINANCIAL">Manager Financial</option>
              <option value="FINAL_REVIEW">Final Review</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{
        overflowX: 'auto',
        backgroundColor: 'white',
        border: '1px solid #ddd'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'left', width: '70px' }}>Date</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'left', width: '70px' }}>Broker</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'left', width: '70px' }}>Variety</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'left', width: '90px' }}>Party</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'left', width: '70px' }}>Location</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'center', width: '60px' }}>Hamali</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'center', width: '60px' }}>Bkrg</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'center', width: '50px' }}>LF</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'right', width: '60px' }}>Allotted</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'right', width: '60px' }}>Inspected</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'right', width: '60px' }}>Remaining</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'center', width: '100px' }}>Progress</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'center', width: '80px' }}>Supervisor</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'center', width: '80px' }}>Change To</th>
              <th style={{ border: '1px solid #357abd', padding: '8px', fontWeight: '600', fontSize: '11px', textAlign: 'center', width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={15} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No allotted supervisors found</td></tr>
            ) : (
              entries.map((entry, index) => {
                const currentSupervisor = entry.lotAllotment?.supervisor;
                const hasChanged = currentSupervisor && selectedSupervisors[entry.id] !== currentSupervisor.id;
                const progress = inspectionProgress[entry.id];
                const progressPercentage = progress?.progressPercentage || 0;
                const hasPreviousInspections = progress && progress.previousInspections && progress.previousInspections.length > 0;

                // Check if this is a new lot (different from previous)
                const prevEntry = entries[index - 1];
                const isNewLot = !prevEntry || prevEntry.id !== entry.id;

                return (
                  <React.Fragment key={entry.id}>
                    {/* Add visual gap between different lots */}
                    {isNewLot && index > 0 && (
                      <tr>
                        <td colSpan={15} style={{
                          height: '15px',
                          backgroundColor: '#e0e0e0',
                          borderLeft: '3px solid #4a90e2',
                          borderRight: '3px solid #4a90e2'
                        }}>
                          <div style={{
                            fontSize: '10px',
                            color: '#666',
                            padding: '0 10px',
                            fontWeight: '600'
                          }}>
                            📦 New Lot: {entry.partyName} - {entry.variety} ({entry.bags} bags)
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr style={{
                      backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                    }}>
                      <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px', textAlign: 'left' }}>
                        {entry.entryDate ? (() => {
                          const date = new Date(entry.entryDate);
                          return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                        })() : 'No Date'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px', textAlign: 'left' }}>{entry.brokerName}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px', textAlign: 'left' }}>{entry.variety}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px', textAlign: 'left' }}>{entry.partyName}</td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px', textAlign: 'left' }}>{entry.location}</td>
                      {/* Financial details columns */}
                      {(() => {
                        const o = offeringCache[entry.id];
                        const missing = { color: '#e74c3c', fontWeight: '600', fontSize: '10px' };
                        const set = { fontSize: '11px' };
                        return (
                          <>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                              {o?.hamaliPerKg || o?.hamali ? <span style={set}>{o.hamaliPerKg || o.hamali}</span> : <span style={missing}>⚠️</span>}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                              {o?.brokerage ? <span style={set}>{o.brokerage}</span> : <span style={missing}>⚠️</span>}
                            </td>
                            <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                              {o?.lf ? <span style={set}>{o.lf}</span> : <span style={missing}>⚠️</span>}
                            </td>
                          </>
                        );
                      })()}
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#10b981' }}>
                        {entry.lotAllotment?.allottedBags || entry.bags}
                      </td>
                      {/* Inspected Bags */}
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: '#4CAF50' }}>
                        {progress?.inspectedBags || 0}
                      </td>
                      {/* Remaining Bags */}
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: progress?.remainingBags === 0 ? '#4CAF50' : '#FF9800' }}>
                        {progress?.remainingBags ?? (entry.lotAllotment?.allottedBags || entry.bags)}
                      </td>
                      {/* Progress Bar */}
                      <td style={{ border: '1px solid #ddd', padding: '6px', minWidth: '100px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <div style={{
                            flex: 1,
                            height: '18px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '9px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${progressPercentage}%`,
                              backgroundColor: getProgressColor(progressPercentage),
                              transition: 'width 0.3s ease',
                              borderRadius: '9px'
                            }} />
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: '600', minWidth: '30px' }}>
                            {progressPercentage.toFixed(0)}%
                          </span>
                        </div>
                        {hasPreviousInspections && (
                          <button
                            onClick={() => toggleExpand(entry.id)}
                            style={{
                              fontSize: '9px',
                              padding: '2px 6px',
                              marginTop: '3px',
                              backgroundColor: 'transparent',
                              color: '#4a90e2',
                              border: '1px solid #4a90e2',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              display: 'block',
                              width: '100%'
                            }}
                          >
                            {expandedEntries[entry.id] ? '▲ Hide Details' : `▼ ${progress.previousInspections.length} Trip(s)`}
                          </button>
                        )}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>
                        {currentSupervisor ? (
                          <span style={{
                            color: '#333',
                            fontWeight: '600',
                            padding: '2px 6px',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '3px'
                          }}>
                            {currentSupervisor.username}
                          </span>
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>
                        )}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                        <select
                          value={selectedSupervisors[entry.id] || ''}
                          onChange={(e) => handleSupervisorChange(entry.id, Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '11px',
                            border: '1px solid #ddd',
                            borderRadius: '3px',
                            backgroundColor: hasChanged ? '#fff3cd' : 'white'
                          }}
                        >
                          <option value="">-- Select --</option>
                          {supervisors.map(supervisor => (
                            <option key={supervisor.id} value={supervisor.id}>
                              {supervisor.username}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', alignItems: 'center' }}>
                          <button
                            onClick={() => handleReassign(entry.id)}
                            disabled={!hasChanged}
                            style={{
                              fontSize: '10px',
                              padding: '4px 8px',
                              backgroundColor: hasChanged ? '#FF9800' : '#ccc',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: hasChanged ? 'pointer' : 'not-allowed',
                              width: '100%'
                            }}
                          >
                            {hasChanged ? 'Reassign' : 'No Change'}
                          </button>
                          {progressPercentage > 0 && progressPercentage < 100 && (
                            <button
                              onClick={() => {
                                if (closingEntryId === entry.id) {
                                  handleCloseLot(entry.id);
                                } else {
                                  setClosingEntryId(entry.id);
                                }
                              }}
                              style={{
                                fontSize: '10px',
                                padding: '4px 8px',
                                backgroundColor: closingEntryId === entry.id ? '#d32f2f' : '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              {closingEntryId === entry.id ? '⚠️ Confirm Close' : `❌ Close Lot (${progress?.remainingBags || 0} bags left)`}
                            </button>
                          )}
                        </div>
                        {closingEntryId === entry.id && (
                          <div style={{ marginTop: '5px' }}>
                            <input
                              type="text"
                              placeholder="Reason (optional)"
                              value={closeLotReason}
                              onChange={(e) => setCloseLotReason(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '3px 5px',
                                fontSize: '10px',
                                border: '1px solid #f44336',
                                borderRadius: '3px'
                              }}
                            />
                            <button
                              onClick={() => { setClosingEntryId(null); setCloseLotReason(''); }}
                              style={{
                                fontSize: '9px',
                                padding: '2px 6px',
                                marginTop: '3px',
                                backgroundColor: '#9e9e9e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Expandable inspection details */}
                    {expandedEntries[entry.id] && hasPreviousInspections && (
                      <tr>
                        <td colSpan={15} style={{ padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ddd' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', marginBottom: '5px', color: '#333' }}>
                            📋 Inspection Trips ({progress.previousInspections.length}) — {progress.inspectedBags} of {progress.totalBags} bags inspected
                          </div>
                          <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#e3f2fd' }}>
                                <th style={{ border: '1px solid #ddd', padding: '4px' }}>#</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px' }}>Date</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px' }}>Lorry Number</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px' }}>Bags</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px' }}>Cutting</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px' }}>Bend</th>
                                <th style={{ border: '1px solid #ddd', padding: '4px' }}>Inspected By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {progress.previousInspections.map((inspection, idx) => (
                                <tr key={inspection.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9f9f9' }}>
                                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'center' }}>{idx + 1}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>
                                    {new Date(inspection.inspectionDate).toLocaleDateString()}
                                  </td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>{inspection.lorryNumber}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right', fontWeight: '600' }}>
                                    {inspection.bags}
                                  </td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>
                                    {inspection.cutting1} x {inspection.cutting2}
                                  </td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px', textAlign: 'right' }}>{inspection.bend}</td>
                                  <td style={{ border: '1px solid #ddd', padding: '4px' }}>{inspection.reportedBy?.username || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllottedSupervisors;
