import React, { useState, useEffect } from 'react';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import type { SampleEntry, EntryType } from '../types/sampleEntry';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SampleEntryPage: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<SampleEntry | null>(null);
  const [entryType, setEntryType] = useState<EntryType>('CREATE_NEW');
  const [entries, setEntries] = useState<SampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasExistingQualityData, setHasExistingQualityData] = useState(false);
  
  // Dropdown options
  const [brokers, setBrokers] = useState<string[]>([]);
  const [varieties, setVarieties] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    brokerName: '',
    variety: '',
    partyName: '',
    location: '',
    bags: '',
    lorryNumber: ''
  });

  // Quality parameters form
  const [qualityData, setQualityData] = useState({
    moisture: '',
    cutting1: '',
    cutting2: '',
    bend: '',
    mixS: '',
    mixL: '',
    mix: '',
    kandu: '',
    oil: '',
    sk: '',
    grainsCount: '',
    wbR: '',
    wbBk: '',
    wbT: '',
    paddyWb: '',
    uploadFile: null as File | null
  });

  useEffect(() => {
    loadEntries();
    loadDropdownData();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await sampleEntryApi.getSampleEntriesByRole({});
      setEntries(response.data.entries);
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to load entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch varieties from locations API
      const varietiesResponse = await axios.get<{ varieties: Array<{ name: string }> }>(`${API_URL}/locations/varieties`, { headers });
      const varietyNames = varietiesResponse.data.varieties.map((v) => v.name);
      setVarieties(varietyNames);

      // Fetch brokers from locations API (new broker endpoint)
      const brokersResponse = await axios.get<{ brokers: Array<{ name: string }> }>(`${API_URL}/locations/brokers`, { headers });
      const brokerNames = brokersResponse.data.brokers.map((b) => b.name);
      setBrokers(brokerNames);
    } catch (error: any) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure user is authenticated
      if (!user || !user.id) {
        showNotification('User not authenticated', 'error');
        return;
      }

      await sampleEntryApi.createSampleEntry({
        entryDate: formData.entryDate,
        brokerName: formData.brokerName.toUpperCase(),
        variety: formData.variety.toUpperCase(),
        partyName: formData.partyName.toUpperCase(),
        location: formData.location.toUpperCase(),
        bags: parseInt(formData.bags),
        lorryNumber: formData.lorryNumber ? formData.lorryNumber.toUpperCase() : undefined,
        entryType
        // Note: createdByUserId is set by the backend from the auth token
      });
      showNotification('Sample entry created successfully', 'success');
      setShowModal(false);
      setFormData({
        entryDate: new Date().toISOString().split('T')[0],
        brokerName: '',
        variety: '',
        partyName: '',
        location: '',
        bags: '',
        lorryNumber: ''
      });
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to create entry', 'error');
    }
  };

  // Auto-uppercase handler
  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value.toUpperCase() });
  };

  const handleViewEntry = (entry: SampleEntry) => {
    setSelectedEntry(entry);
    setShowQualityModal(true);
    
    // Fetch existing quality parameters if they exist
    const fetchQualityParameters = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get<any>(
          `${API_URL}/sample-entries/${entry.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('Sample entry response:', response.data);
        
        // If quality parameters exist, populate the form with saved data
        if (response.data.qualityParameters) {
          console.log('Quality parameters found:', response.data.qualityParameters);
          const qp = response.data.qualityParameters;
          setQualityData({
            moisture: qp.moisture?.toString() || '',
            cutting1: qp.cutting1?.toString() || '',
            cutting2: qp.cutting2?.toString() || '',
            bend: qp.bend?.toString() || '',
            mixS: qp.mixS?.toString() || '',
            mixL: qp.mixL?.toString() || '',
            mix: qp.mix?.toString() || '',
            kandu: qp.kandu?.toString() || '',
            oil: qp.oil?.toString() || '',
            sk: qp.sk?.toString() || '',
            grainsCount: qp.grainsCount?.toString() || '',
            wbR: qp.wbR?.toString() || '',
            wbBk: qp.wbBk?.toString() || '',
            wbT: qp.wbT?.toString() || '',
            paddyWb: qp.paddyWb?.toString() || '',
            uploadFile: null
          });
          setHasExistingQualityData(true);
        } else {
          // Reset quality data for new entry
          setQualityData({
            moisture: '',
            cutting1: '',
            cutting2: '',
            bend: '',
            mixS: '',
            mixL: '',
            mix: '',
            kandu: '',
            oil: '',
            sk: '',
            grainsCount: '',
            wbR: '',
            wbBk: '',
            wbT: '',
            paddyWb: '',
            uploadFile: null
          });
          setHasExistingQualityData(false);
        }
      } catch (error) {
        console.error('Error fetching quality parameters:', error);
        // Reset on error
        setQualityData({
          moisture: '',
          cutting1: '',
          cutting2: '',
          bend: '',
          mixS: '',
          mixL: '',
          mix: '',
          kandu: '',
          oil: '',
          sk: '',
          grainsCount: '',
          wbR: '',
          wbBk: '',
          wbT: '',
          paddyWb: '',
          uploadFile: null
        });
        setHasExistingQualityData(false);
      }
    };
    
    fetchQualityParameters();
  };

  const handleSubmitQualityParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    try {
      const formData = new FormData();
      formData.append('moisture', qualityData.moisture);
      formData.append('cutting1', qualityData.cutting1);
      formData.append('cutting2', qualityData.cutting2);
      formData.append('bend', qualityData.bend);
      formData.append('mixS', qualityData.mixS);
      formData.append('mixL', qualityData.mixL);
      formData.append('mix', qualityData.mix);
      formData.append('kandu', qualityData.kandu);
      formData.append('oil', qualityData.oil);
      formData.append('sk', qualityData.sk);
      formData.append('grainsCount', qualityData.grainsCount);
      formData.append('wbR', qualityData.wbR);
      formData.append('wbBk', qualityData.wbBk);
      formData.append('wbT', qualityData.wbT);
      formData.append('paddyWb', qualityData.paddyWb);
      // reportedBy will be auto-filled by backend from logged-in user
      formData.append('reportedBy', user?.username || 'Unknown');
      
      if (qualityData.uploadFile) {
        formData.append('photo', qualityData.uploadFile);
      }

      await axios.post(
        `${API_URL}/sample-entries/${selectedEntry.id}/quality-parameters`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      showNotification('Quality parameters added successfully', 'success');
      setShowQualityModal(false);
      setSelectedEntry(null);
      loadEntries();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to add quality parameters', 'error');
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '15px',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, color: '#333', fontSize: '20px' }}>Sample Entry</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setEntryType('CREATE_NEW'); setShowModal(true); }}
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            Create New
          </button>
          <button
            onClick={() => { setEntryType('DIRECT_LOADED_VEHICLE'); setShowModal(true); }}
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px'
            }}
          >
            Direct Loaded Vehicle
          </button>
        </div>
      </div>

      {/* Entries Table */}
      <div style={{ 
        overflowX: 'auto',
        backgroundColor: 'white',
        border: '1px solid #ddd'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#4a90e2', color: 'white' }}>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Date</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Type</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Broker</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Variety</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Party</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Location</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Bags</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Status</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Quality Check</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', fontWeight: '600', fontSize: '11px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No entries found</td></tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={entry.id} style={{ 
                  backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                }}>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{new Date(entry.entryDate).toLocaleDateString()}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.entryType}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.brokerName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.variety}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.partyName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '11px' }}>{entry.location}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'right', fontSize: '11px' }}>{entry.bags}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '10px' }}>{entry.workflowStatus}</td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', fontSize: '10px', textAlign: 'center' }}>
                    {entry.workflowStatus === 'QUALITY_CHECK' || entry.workflowStatus === 'LOT_SELECTION' || entry.workflowStatus === 'COOKING_REPORT' || entry.workflowStatus === 'FINAL_REPORT' || entry.workflowStatus === 'COMPLETED' ? (
                      <span style={{ color: '#4CAF50', fontWeight: '600' }}>✓ Done</span>
                    ) : entry.workflowStatus === 'STAFF_ENTRY' ? (
                      <span style={{ color: '#FF9800' }}>Pending</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '6px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleViewEntry(entry)}
                      style={{ 
                        fontSize: '10px', 
                        padding: '4px 8px',
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '80px 20px 20px 20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '4px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '20px', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#333',
              borderBottom: '2px solid #4a90e2',
              paddingBottom: '10px'
            }}>
              {entryType === 'CREATE_NEW' ? 'Create New Entry' : 'Direct Loaded Vehicle'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Date</label>
                <input
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                  required
                />
              </div>

              {entryType === 'DIRECT_LOADED_VEHICLE' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Lorry Number</label>
                  <input
                    type="text"
                    value={formData.lorryNumber}
                    onChange={(e) => handleInputChange('lorryNumber', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '6px 8px', 
                      border: '1px solid #ddd', 
                      borderRadius: '3px',
                      fontSize: '13px',
                      textTransform: 'uppercase'
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Broker Name</label>
                <select
                  value={formData.brokerName}
                  onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  required
                >
                  <option value="">-- Select Broker --</option>
                  {brokers.map((broker, index) => (
                    <option key={index} value={broker}>{broker}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Variety</label>
                <select
                  value={formData.variety}
                  onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                  required
                >
                  <option value="">-- Select Variety --</option>
                  {varieties.map((variety, index) => (
                    <option key={index} value={variety}>{variety}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Party Name</label>
                <input
                  type="text"
                  value={formData.partyName}
                  onChange={(e) => handleInputChange('partyName', e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px',
                    textTransform: 'uppercase'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Location Sample Collected</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px',
                    textTransform: 'uppercase'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '13px' }}>Bags</label>
                <input
                  type="number"
                  value={formData.bags}
                  onChange={(e) => setFormData({ ...formData, bags: e.target.value })}
                  style={{ 
                    width: '100%', 
                    padding: '6px 8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                  required
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer',
                    border: '1px solid #ddd',
                    borderRadius: '3px',
                    backgroundColor: 'white',
                    fontSize: '13px',
                    color: '#666'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer', 
                    backgroundColor: '#4CAF50',
                    color: 'white', 
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quality Parameters Modal */}
      {showQualityModal && selectedEntry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '80px 20px 20px 20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '4px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '15px', 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#333',
              borderBottom: '2px solid #4a90e2',
              paddingBottom: '10px'
            }}>
              {hasExistingQualityData ? 'View Quality Parameters' : 'Add Quality Parameters'}
            </h3>

            {/* Entry Details */}
            <div style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px', 
              marginBottom: '15px',
              fontSize: '12px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><strong>Broker:</strong> {selectedEntry.brokerName}</div>
                <div><strong>Variety:</strong> {selectedEntry.variety}</div>
                <div><strong>Party:</strong> {selectedEntry.partyName}</div>
                <div><strong>Bags:</strong> {selectedEntry.bags}</div>
              </div>
            </div>

            <form onSubmit={handleSubmitQualityParameters}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Moisture *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.moisture}
                    onChange={(e) => setQualityData({ ...qualityData, moisture: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Cutting 1 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.cutting1}
                    onChange={(e) => setQualityData({ ...qualityData, cutting1: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Cutting 2 *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.cutting2}
                    onChange={(e) => setQualityData({ ...qualityData, cutting2: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Bend *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.bend}
                    onChange={(e) => setQualityData({ ...qualityData, bend: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Mix S *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.mixS}
                    onChange={(e) => setQualityData({ ...qualityData, mixS: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Mix L *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.mixL}
                    onChange={(e) => setQualityData({ ...qualityData, mixL: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Mix *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.mix}
                    onChange={(e) => setQualityData({ ...qualityData, mix: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Kandu *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.kandu}
                    onChange={(e) => setQualityData({ ...qualityData, kandu: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Oil *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.oil}
                    onChange={(e) => setQualityData({ ...qualityData, oil: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    SK *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.sk}
                    onChange={(e) => setQualityData({ ...qualityData, sk: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Grains Count *
                  </label>
                  <input
                    type="number"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.grainsCount}
                    onChange={(e) => setQualityData({ ...qualityData, grainsCount: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    WB (R) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.wbR}
                    onChange={(e) => setQualityData({ ...qualityData, wbR: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    WB (BK) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.wbBk}
                    onChange={(e) => setQualityData({ ...qualityData, wbBk: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    WB (T) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.wbT}
                    onChange={(e) => setQualityData({ ...qualityData, wbT: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                    Paddy WB *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasExistingQualityData}
                    readOnly={hasExistingQualityData}
                    value={qualityData.paddyWb}
                    onChange={(e) => setQualityData({ ...qualityData, paddyWb: e.target.value })}
                    style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px', backgroundColor: hasExistingQualityData ? '#f5f5f5' : 'white', cursor: hasExistingQualityData ? 'not-allowed' : 'text' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#555', fontSize: '12px' }}>
                  Upload Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQualityData({ ...qualityData, uploadFile: e.target.files?.[0] || null })}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '3px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowQualityModal(false);
                    setSelectedEntry(null);
                  }}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer',
                    backgroundColor: '#6c757d',
                    color: 'white', 
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                {!hasExistingQualityData && (
                  <button
                    type="submit"
                    style={{ 
                      padding: '8px 16px', 
                      cursor: 'pointer',
                      backgroundColor: '#4CAF50',
                      color: 'white', 
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '13px'
                    }}
                  >
                    Submit Quality Parameters
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleEntryPage;
