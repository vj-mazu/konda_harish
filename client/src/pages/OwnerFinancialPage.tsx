import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { sampleEntryApi } from '../utils/sampleEntryApi';
import { SuteType, BaseRateType, CalculationUnit } from '../types/sampleEntry';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
  background-color: #f8fafc;
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #1e293b;
  font-weight: 800;
  font-size: 1.75rem;
  letter-spacing: -0.025em;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e2e8f0;
`;

const SectionTitle = styled.h4`
  color: #334155;
  margin-bottom: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 0.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    ring: 2px solid #3b82f6;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
`;

const Td = styled.td`
  padding: 1rem;
  text-align: center;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
`;

const ResultCard = styled.div`
  background: #f1f5f9;
  padding: 1rem;
  border-radius: 12px;
  margin-top: 1rem;
`;

const ResultRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 0.25rem;
  
  &.total {
    border-top: 1px solid #cbd5e1;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    font-weight: 800;
    font-size: 15px;
    color: #0f172a;
  }
`;

const ActionButton = styled.button`
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  margin-top: 2rem;
  transition: all 0.2s;
  
  &:hover {
    background: #1d4ed8;
  }
  
  &:disabled {
    background: #94a3b8;
    cursor: not-allowed;
  }
`;

const OwnerFinancialPage: React.FC = () => {
    const { showNotification } = useNotification();
    const [entries, setEntries] = useState<any[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [data, setData] = useState({
        suteRate: 0,
        suteType: 'PER_BAG' as SuteType,
        baseRateType: 'PD_LOOSE' as BaseRateType,
        baseRateUnit: 'PER_BAG' as CalculationUnit,
        baseRateValue: 0,
        customDivisor: 100,
        brokerageRate: 0,
        brokerageUnit: 'PER_BAG' as CalculationUnit,
        egbRate: 0,
        lfinRate: 0,
        lfinUnit: 'PER_BAG' as CalculationUnit,
        hamaliRate: 0,
        hamaliUnit: 'PER_BAG' as CalculationUnit
    });

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        try {
            setLoading(true);
            const response = await sampleEntryApi.getSampleEntriesByRole({ status: 'INVENTORY_ENTRY' });
            setEntries(response.data.entries || []);
        } catch (error) {
            showNotification('Failed to load pending lots', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const inv = selectedEntry?.lotAllotment?.physicalInspections?.[0]?.inventoryData;
            await sampleEntryApi.createFinancialCalculation(selectedEntry.id, {
                ...data,
                baseRate: data.baseRateValue,
                inventoryDataId: inv?.id,
                lfinRate: 0,
                lfinUnit: 'PER_BAG',
                hamaliRate: 0,
                hamaliUnit: 'PER_BAG'
            });
            showNotification('Financial calculations saved', 'success');
            setSelectedEntry(null);
            loadEntries();
        } catch (error: any) {
            showNotification(error.response?.data?.error || 'Failed to save', 'error');
        }
    };

    const calculateTotals = () => {
        if (!selectedEntry) return null;
        const inv = selectedEntry?.lotAllotment?.physicalInspections?.[0]?.inventoryData;
        if (!inv) return null;
        const bags = inv.bags;
        const netWeight = inv.netWeight;

        // Sute
        let totalSute = data.suteType === 'PER_BAG' ? data.suteRate * bags : (netWeight / 1000) * data.suteRate;
        const suteNetWeight = netWeight - totalSute;

        // Base Rate
        let divisor = 100;
        if (data.baseRateType === 'MD_LOOSE') divisor = data.customDivisor;
        else if (data.baseRateUnit === 'PER_BAG') divisor = 75;
        const baseRateTotal = (suteNetWeight / divisor) * data.baseRateValue;

        // Brokerage
        const broDivisor = (data.baseRateType === 'MD_LOOSE' ? data.customDivisor : 100);
        const brokerageTotal = data.brokerageUnit === 'PER_BAG' ? data.brokerageRate * bags : (netWeight / broDivisor) * data.brokerageRate;

        // EGB
        const isLoose = data.baseRateType === 'PD_LOOSE' || data.baseRateType === 'MD_LOOSE';
        const egbTotal = isLoose ? data.egbRate * bags : 0;

        // LF and Hamali = 0 (will be set by Manager)
        const lfinTotal = 0;
        const hamaliTotal = 0;

        const grandTotal = totalSute + baseRateTotal + brokerageTotal + egbTotal + lfinTotal + hamaliTotal;
        const average = grandTotal / suteNetWeight;

        return { totalSute, baseRateTotal, brokerageTotal, egbTotal, lfinTotal, hamaliTotal, grandTotal, average };
    };

    const totals = calculateTotals();

    return (
        <Container>
            <Header>
                <Title>💰 Owner Financial Calculations</Title>
            </Header>

            {!selectedEntry ? (
                <Card>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'center', background: '#f1f5f9' }}>
                                <th style={{ padding: '12px' }}>Date</th>
                                <th style={{ padding: '12px' }}>Party</th>
                                <th style={{ padding: '12px' }}>Variety</th>
                                <th style={{ padding: '12px' }}>Net Weight (kg)</th>
                                <th style={{ padding: '12px' }}>Option</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr> :
                                entries.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No entries pending financial setup</td></tr> :
                                    entries.map(e => (
                                        <tr key={e.id} style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                            <Td>{new Date(e.entryDate).toLocaleDateString()}</Td>
                                            <Td>{e.partyName}</Td>
                                            <Td>{e.variety}</Td>
                                            <Td>{e?.lotAllotment?.physicalInspections?.[0]?.inventoryData?.netWeight || '-'}</Td>
                                            <Td>
                                                <ActionButton onClick={() => setSelectedEntry(e)} style={{ margin: 0, padding: '6px 12px', fontSize: '12px' }}>
                                                    Calculate
                                                </ActionButton>
                                            </Td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </Card>
            ) : (
                <>
                    <div style={{ marginBottom: '1rem' }}>
                        <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>
                            ← Back to list
                        </button>
                    </div>

                    <Grid>
                        <Card>
                            <SectionTitle>⚖️ Sute & Base Rate</SectionTitle>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <FormGroup style={{ flex: 1 }}>
                                    <Label>Sute Rate</Label>
                                    <Input type="number" value={data.suteRate} onChange={e => setData({ ...data, suteRate: Number(e.target.value) })} />
                                </FormGroup>
                                <FormGroup style={{ flex: 1 }}>
                                    <Label>Sute Type</Label>
                                    <Select value={data.suteType} onChange={e => setData({ ...data, suteType: e.target.value as any })}>
                                        <option value="PER_BAG">Per Bag</option>
                                        <option value="PER_TON">Per Ton</option>
                                    </Select>
                                </FormGroup>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <FormGroup style={{ flex: 2 }}>
                                    <Label>Base Rate Type</Label>
                                    <Select value={data.baseRateType} onChange={e => setData({ ...data, baseRateType: e.target.value as any })}>
                                        <option value="PD_LOOSE">PD Loose</option>
                                        <option value="PD_WB">PD WB</option>
                                        <option value="MD_WB">MD WB</option>
                                        <option value="MD_LOOSE">MD Loose (Custom)</option>
                                    </Select>
                                </FormGroup>
                                {data.baseRateType === 'MD_LOOSE' && (
                                    <FormGroup style={{ flex: 1 }}>
                                        <Label>Custom Divisor</Label>
                                        <Input type="number" value={data.customDivisor} onChange={e => setData({ ...data, customDivisor: Number(e.target.value) })} />
                                    </FormGroup>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <FormGroup style={{ flex: 1 }}>
                                    <Label>Rate Value</Label>
                                    <Input type="number" value={data.baseRateValue} onChange={e => setData({ ...data, baseRateValue: Number(e.target.value) })} />
                                </FormGroup>
                                <FormGroup style={{ flex: 1 }}>
                                    <Label>Rate Unit</Label>
                                    <Select value={data.baseRateUnit} onChange={e => setData({ ...data, baseRateUnit: e.target.value as any })}>
                                        <option value="PER_BAG">Per Bag (75)</option>
                                        <option value="PER_QUINTAL">Per Quintal (100)</option>
                                    </Select>
                                </FormGroup>
                            </div>
                        </Card>

                        <Card>
                            <SectionTitle>🤝 Brokerage & EGB</SectionTitle>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <FormGroup style={{ flex: 1 }}>
                                    <Label>Brokerage Rate</Label>
                                    <Input type="number" value={data.brokerageRate} onChange={e => setData({ ...data, brokerageRate: Number(e.target.value) })} />
                                </FormGroup>
                                <FormGroup style={{ flex: 1 }}>
                                    <Label>Unit</Label>
                                    <Select value={data.brokerageUnit} onChange={e => setData({ ...data, brokerageUnit: e.target.value as any })}>
                                        <option value="PER_BAG">Per Bag</option>
                                        <option value="PER_QUINTAL">Per Quintal</option>
                                    </Select>
                                </FormGroup>
                            </div>

                            {(data.baseRateType === 'PD_LOOSE' || data.baseRateType === 'MD_LOOSE') && (
                                <FormGroup>
                                    <Label>EGB Rate (per bag)</Label>
                                    <Input type="number" value={data.egbRate} onChange={e => setData({ ...data, egbRate: Number(e.target.value) })} />
                                </FormGroup>
                            )}
                        </Card>

                        <Card>
                            <SectionTitle>📝 Note</SectionTitle>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>
                                LF (Loading/Freight) and Hamali (Labour) charges will be added by the <strong>Manager</strong> in the next step.
                            </p>
                        </Card>

                        {totals && (
                            <Card style={{ background: '#0f172a', color: 'white' }}>
                                <SectionTitle style={{ color: 'white', borderBottomColor: '#334155' }}>📈 Final Preview</SectionTitle>
                                <ResultRow><span>Sute Deduction:</span> <span>₹{totals.totalSute.toFixed(2)}</span></ResultRow>
                                <ResultRow><span>Base Value:</span> <span>₹{totals.baseRateTotal.toFixed(2)}</span></ResultRow>
                                <ResultRow><span>Brokerage:</span> <span>₹{totals.brokerageTotal.toFixed(2)}</span></ResultRow>
                                <ResultRow><span>EGB:</span> <span>₹{totals.egbTotal.toFixed(2)}</span></ResultRow>

                                <ResultRow className="total" style={{ color: '#fbbf24' }}>
                                    <span>GRAND TOTAL:</span>
                                    <span>₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </ResultRow>
                                <div style={{ textAlign: 'center', marginTop: '0.5rem', color: '#94a3b8', fontSize: '12px' }}>
                                    (LF + Hamali will be added by Manager)
                                </div>
                                <div style={{ textAlign: 'center', marginTop: '1rem', background: '#334155', padding: '0.5rem', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '12px' }}>AVERAGE NET RATE: </span>
                                    <span style={{ fontSize: '20px', fontWeight: '800' }}>₹{totals.average.toFixed(2)}</span>
                                </div>

                                <ActionButton onClick={handleSave} style={{ marginTop: '1.5rem', background: '#10b981' }}>
                                    Submit Owner Financials
                                </ActionButton>
                            </Card>
                        )}
                    </Grid>
                </>
            )}
        </Container>
    );
};

export default OwnerFinancialPage;
