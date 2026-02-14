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

const AllottedSupervisors: React.FC = () => {
  const { showNotification } = useNotification();
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupervisors, setSelectedSupervisors] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadEntries();
    loadSupervisors();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('Fetching allotted supervisors with status=LOT_ALLOTMENT and PHYSICAL_INSPECTION');
      
      // Fetch entries with LOT_ALLOTMENT status (assigned but not started) 
      // AND PHYSICAL_INSPECTION status (currently being inspected)
      const [lotAllotmentResponse, physicalInspectionResponse] = await Promise.all([
        axios.get(`${API_URL}/sample-entries/by-role?status=LOT_ALLOTMENT`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/sample-entries/by-role?status=PHYSICAL_INSPECTION`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const lotAllotmentEntries = (lotAllotmentResponse.data as any).entries || [];
      const physicalInspectionEntries = (physicalInspectionResponse.data as any).entries || [];
      
      console.log('LOT_ALLOTMENT entries:', lotAllotmentEntries.length);
      console.log('PHYSICAL_INSPECTION entries:', physicalInspectionEntries.length);
      console.log('Sample entry data:', physicalInspectionEntries[0]); // Log first entry to see structure
      
      // Combine both arrays
      const allEntries = [...lotAllotmentEntries, ...physicalInspectionEntries];
      console.log('Combined allotted entries:', allEntries.length);
      setEntries(allEntries);
      
      // Pre-populate selected supervisors with current assignments
      const preSelected: { [key: string]: number } = {};
      allEntries.forEach((entry: SampleEntry) => {
        if (entry.lotAllotment?.allottedToSupervisorId) {
          preSelected[entry.id] = entry.lotAllotment.allottedToSupervisorId;
        }
      });
      setSelectedSupervisors(preSelected);
      
    } catch (error: any) {
      console.error('Error loading allotted entries:', error);
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
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

  return (
    <div>
      <div style={{ 
        overflowX: 'auto',
        backgroundColor: 'white',
        border: '1px solid #ddd'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Broker</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Variety</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Party</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Location</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Bags</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Current Supervisor</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Change To</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No allotted supervisors found</td></tr>
            ) : (
              entries.map((entry, index) => {
                const currentSupervisor = entry.lotAllotment?.supervisor;
                const hasChanged = currentSupervisor && selectedSupervisors[entry.id] !== currentSupervisor.id;
                
                return (
                  <tr key={entry.id} style={{ 
                    backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                  }}>
                    <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>
                      {entry.entryDate ? (() => {
                        const date = new Date(entry.entryDate);
                        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
                      })() : 'No Date'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.brokerName}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.variety}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.partyName}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.location}</td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>{entry.bags}</td>
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
                        <option value="">-- Select Supervisor --</option>
                        {supervisors.map(supervisor => (
                          <option key={supervisor.id} value={supervisor.id}>
                            {supervisor.username}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
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
                          cursor: hasChanged ? 'pointer' : 'not-allowed'
                        }}
                      >
                        {hasChanged ? 'Reassign' : 'No Change'}
                      </button>
                    </td>
                  </tr>
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
