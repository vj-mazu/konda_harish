import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
  background-color: #f3f4f6;
  min-height: 100vh;
`;

const Title = styled.h2`
  color: #111827;
  font-weight: 700;
  margin-bottom: 2rem;
  text-align: center;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const Label = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  color: #6b7280;
  font-weight: 600;
  margin-bottom: 2px;
`;

const Value = styled.div`
  font-size: 15px;
  color: #1f2937;
  font-weight: 500;
  margin-bottom: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  margin-bottom: 1rem;
`;

const Button = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  
  &:hover { background: #4338ca; }
`;

const Td = styled.td`
  padding: 12px;
  text-align: center;
  border-bottom: 1px solid #eee;
`;

const ManagerFinancialPage: React.FC = () => {
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [managerData, setManagerData] = useState({
        lfinRate: 0,
        lfinUnit: 'PER_BAG',
        hamaliRate: 0,
        hamaliUnit: 'PER_BAG'
    });

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const response = await sampleEntryApi.getSampleEntriesByRole({ status: 'OWNER_FINANCIAL' });
            setEntries(response.data.entries || []);
        } catch (error) {
            showNotification('Failed to load pending lots', 'error');
        } finally {
            setLoading(false);
        }
    };

    const findFinancialCalculation = (entry: any) => {
        const inspections = entry?.lotAllotment?.physicalInspections || [];
        for (const insp of inspections) {
            if (insp?.inventoryData?.financialCalculation) {
                return {
                    fc: insp.inventoryData.financialCalculation,
                    inventoryDataId: insp.inventoryData.id
                };
            }
        }
        return null;
    };

    const handleSelect = (e: any) => {
        setSelectedEntry(e);
        const data = findFinancialCalculation(e);
        if (data?.fc) {
            setManagerData({
                lfinRate: data.fc.lfinRate || 0,
                lfinUnit: data.fc.lfinUnit || 'PER_BAG',
                hamaliRate: data.fc.hamaliRate || 0,
                hamaliUnit: data.fc.hamaliUnit || 'PER_BAG'
            });
        }
    };

    const handleSubmit = async () => {
        try {
            const data = findFinancialCalculation(selectedEntry);
            if (!data?.fc) throw new Error('Financial calculation not found');

            await sampleEntryApi.createManagerFinancialCalculation(selectedEntry.id, {
                ...data.fc,
                ...managerData,
                inventoryDataId: data.inventoryDataId
            });
            showNotification('Manager financials updated', 'success');
            setSelectedEntry(null);
            loadEntries();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to save', 'error');
        }
    };

    if (!selectedEntry) {
        return (
            <Container>
                <Title>📊 Manager Financial Review</Title>
                <Card>
                    <table style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb' }}>
                                <th>Date</th>
                                <th>Party</th>
                                <th>Variety</th>
                                <th>Owner Total</th>
                                <th>Owner Net Rate</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading...</td></tr> :
                                entries.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center' }}>No entries pending manager review</td></tr> :
                                    entries.map(e => {
                                        const data = findFinancialCalculation(e);
                                        return (
                                            <tr key={e.id}>
                                                <Td>{new Date(e.entryDate).toLocaleDateString()}</Td>
                                                <Td>{e.partyName}</Td>
                                                <Td>{e.variety}</Td>
                                                <Td>₹{Number(data?.fc?.totalAmount || 0).toLocaleString()}</Td>
                                                <Td>₹{Number(data?.fc?.average || 0).toFixed(2)}</Td>
                                                <Td>
                                                    <button onClick={() => handleSelect(e)}>Review & Adjust</button>
                                                </Td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                </Card>
            </Container>
        );
    }

    const data = findFinancialCalculation(selectedEntry);
    const fc = data?.fc;

    if (!fc) {
        return (
            <Container>
                <Title>Error: Calculation Data Missing</Title>
                <Card style={{ textAlign: 'center' }}>
                    <p>Could not find financial calculation details for this entry.</p>
                    <Button onClick={() => setSelectedEntry(null)} style={{ background: '#6b7280', marginTop: '1rem' }}>Back to List</Button>
                </Card>
            </Container>
        );
    }

    return (
        <Container>
            <Title>Reviewing: {selectedEntry.partyName} - {selectedEntry.variety}</Title>
            <Layout>
                <Card>
                    <h4 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Owner Submissions</h4>
                    <Label>Sute</Label><Value>₹{fc.totalSute} ({fc.suteRate} {fc.suteType})</Value>
                    <Label>Base Rate</Label><Value>₹{fc.baseRateTotal} ({fc.baseRateType} at ₹{fc.baseRateValue}/{fc.baseRateUnit})</Value>
                    {fc.customDivisor && <><Label>Custom Divisor</Label><Value>{fc.customDivisor}</Value></>}
                    <Label>Brokerage</Label><Value>₹{Number(fc.brokerageTotal || 0).toLocaleString()}</Value>
                    <Label>EGB</Label><Value>₹{Number(fc.egbTotal || 0).toLocaleString()}</Value>
                    <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                        <Label>Owner Grand Total</Label>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>₹{Number(fc.totalAmount || 0).toLocaleString()}</div>
                    </div>
                </Card>

                <Card>
                    <h4 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Manager Adjustments</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <Label>LF (Freight) Rate</Label>
                            <Input type="number" value={managerData.lfinRate} onChange={e => setManagerData({ ...managerData, lfinRate: Number(e.target.value) })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Label>Unit</Label>
                            <select
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '1rem' }}
                                value={managerData.lfinUnit}
                                onChange={e => setManagerData({ ...managerData, lfinUnit: e.target.value })}
                            >
                                <option value="PER_BAG">Per Bag</option>
                                <option value="PER_QUINTAL">Per Quintal</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 2 }}>
                            <Label>Hamali Rate</Label>
                            <Input type="number" value={managerData.hamaliRate} onChange={e => setManagerData({ ...managerData, hamaliRate: Number(e.target.value) })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Label>Unit</Label>
                            <select
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db', marginBottom: '1rem' }}
                                value={managerData.hamaliUnit}
                                onChange={e => setManagerData({ ...managerData, hamaliUnit: e.target.value })}
                            >
                                <option value="PER_BAG">Per Bag</option>
                                <option value="PER_QUINTAL">Per Quintal</option>
                            </select>
                        </div>
                    </div>

                    {(() => {
                        const inv = selectedEntry?.lotAllotment?.physicalInspections?.[0]?.inventoryData;
                        if (!inv) return null;

                        const lfTotal = managerData.lfinUnit === 'PER_BAG'
                            ? managerData.lfinRate * inv.bags
                            : (inv.netWeight / 100) * managerData.lfinRate;

                        const hamaliTotal = managerData.hamaliUnit === 'PER_BAG'
                            ? managerData.hamaliRate * inv.bags
                            : (inv.netWeight / 100) * managerData.hamaliRate;

                        // owner totals (fixed base)
                        const ownerTotalExclCharges = Number(fc.totalSute) + Number(fc.baseRateTotal) + Number(fc.brokerageTotal) + Number(fc.egbTotal || 0);
                        const finalGrandTotal = ownerTotalExclCharges + lfTotal + hamaliTotal;
                        const finalAverage = finalGrandTotal / Number(fc.suteNetWeight);

                        return (
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f4ff', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '13px' }}>
                                    <span>LF Total:</span> <strong>₹{lfTotal.toFixed(2)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '13px' }}>
                                    <span>Hamali Total:</span> <strong>₹{hamaliTotal.toFixed(2)}</strong>
                                </div>
                                <div style={{ borderTop: '1px solid #c7d2fe', paddingTop: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#1e1b4b' }}>
                                        <span>NEW GRAND TOTAL:</span> <span>₹{finalGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', color: '#4338ca', fontWeight: '600' }}>
                                        <span>NEW AVERAGE:</span> <span>₹{finalAverage.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{ marginTop: '2rem' }}>
                        <Button onClick={handleSubmit}>Update & Move to Final Review</Button>
                        <button onClick={() => setSelectedEntry(null)} style={{ border: 'none', background: 'none', color: '#6b7280', width: '100%', marginTop: '1rem', cursor: 'pointer' }}>Cancel</button>
                    </div>
                </Card>
            </Layout>
        </Container>
    );
};

export default ManagerFinancialPage;
