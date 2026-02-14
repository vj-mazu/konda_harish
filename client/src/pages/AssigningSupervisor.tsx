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
}

interface Supervisor {
  id: number;
  username: string;
}

const AssigningSupervisor: React.FC = () => {
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
      
      // Fetch ONLY entries with FINAL_REPORT status (pending assignment)
      const response = await axios.get(`${API_URL}/sample-entries/by-role?status=FINAL_REPORT`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const pendingEntries = (response.data as any).entries || [];
      setEntries(pendingEntries);
      
    } catch (error: any) {
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

  const handleAssign = async (entryId: string) => {
    const supervisorId = selectedSupervisors[entryId];
    
    if (!supervisorId) {
      showNotification('Please select a physical supervisor', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${API_URL}/sample-entries/${entryId}/lot-allotment`,
        {
          physicalSupervisorId: supervisorId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      showNotification('Physical supervisor assigned successfully', 'success');
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to assign supervisor', 'error');
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
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Select Supervisor</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries pending supervisor assignment</td></tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={entry.id} style={{ 
                  backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                }}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>
                    {entry.entryDate ? new Date(entry.entryDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.brokerName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.variety}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.partyName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.location}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>{entry.bags}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px' }}>
                    <select
                      value={selectedSupervisors[entry.id] || ''}
                      onChange={(e) => handleSupervisorChange(entry.id, Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '4px',
                        fontSize: '11px',
                        border: '1px solid #ddd',
                        borderRadius: '3px'
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
                      onClick={() => handleAssign(entry.id)}
                      disabled={!selectedSupervisors[entry.id]}
                      style={{
                        fontSize: '10px',
                        padding: '4px 8px',
                        backgroundColor: selectedSupervisors[entry.id] ? '#4CAF50' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: selectedSupervisors[entry.id] ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssigningSupervisor;
