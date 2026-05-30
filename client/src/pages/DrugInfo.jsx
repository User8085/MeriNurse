import { useState } from 'react';
import { drugAPI } from '../services/api';
import { FiSearch, FiAlertCircle, FiInfo } from 'react-icons/fi';

export default function DrugInfo() {
  const [search, setSearch] = useState('');
  const [drugInfo, setDrugInfo] = useState(null);
  const [adverseEvents, setAdverseEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interactionDrugs, setInteractionDrugs] = useState(['', '']);
  const [interactions, setInteractions] = useState(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);

  const searchDrug = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setDrugInfo(null);
    try {
      const [infoRes, aeRes] = await Promise.all([
        drugAPI.search(search),
        drugAPI.adverseEvents(search)
      ]);
      if (infoRes.data.success) setDrugInfo(infoRes.data.data);
      if (aeRes.data.success) setAdverseEvents(aeRes.data.data || []);
    } catch { }
    finally { setLoading(false); }
  };

  const checkInteractions = async () => {
    const drugs = interactionDrugs.filter(d => d.trim());
    if (drugs.length < 2) { alert('Enter at least 2 drug names'); return; }
    setCheckingInteractions(true);
    setInteractions(null);
    try {
      const res = await drugAPI.checkInteractions(drugs);
      setInteractions(res.data);
    } catch { }
    finally { setCheckingInteractions(false); }
  };

  return (
    <div style={{ padding: '28px 0' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>Drug Information</h2>

      {/* Drug Search */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🔍 Search Drug Information</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="form-input" placeholder="Enter drug name (e.g., Ibuprofen)" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchDrug()} style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={searchDrug} disabled={loading}>
            {loading ? 'Searching...' : <><FiSearch /> Search</>}
          </button>
        </div>

        {drugInfo && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h4 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--primary-400)', margin: 0 }}>{drugInfo.brandName}</h4>
              {drugInfo.isIndianMedicine && (
                <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>Local Indian Medicine</span>
              )}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}><span className="text-muted" style={{ minWidth: 120 }}>Generic Name:</span><span>{drugInfo.genericName}</span></div>
              <div style={{ display: 'flex', gap: 8 }}><span className="text-muted" style={{ minWidth: 120 }}>Manufacturer:</span><span>{drugInfo.manufacturer}</span></div>
              {drugInfo.isIndianMedicine && drugInfo.price !== undefined && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="text-muted" style={{ minWidth: 120 }}>Price:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{drugInfo.price}</span>
                </div>
              )}
              <div><span className="text-muted">Purpose:</span><p style={{ marginTop: 4, lineHeight: 1.6 }}>{drugInfo.purpose}</p></div>
              {!drugInfo.isIndianMedicine && (
                <div><span className="text-muted">Dosage:</span><p style={{ marginTop: 4, lineHeight: 1.6 }}>{drugInfo.dosage}</p></div>
              )}
              <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                <FiAlertCircle /> <div><strong>Warnings:</strong><p style={{ marginTop: 4 }}>{drugInfo.warnings}</p></div>
              </div>
              {drugInfo.sideEffects !== 'Consult package insert' && (
                <div><span className="text-muted">Side Effects:</span><p style={{ marginTop: 4, lineHeight: 1.6 }}>{drugInfo.sideEffects}</p></div>
              )}
            </div>

            {adverseEvents.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontWeight: 600, marginBottom: 12 }}>Most Reported Adverse Events</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {adverseEvents.slice(0, 8).map((ae, i) => (
                    <span key={i} className="badge badge-rose">{ae.reaction} ({ae.count})</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drug Interactions */}
      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16 }}>⚠️ Check Drug Interactions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {interactionDrugs.map((drug, i) => (
            <input key={i} className="form-input" placeholder={`Drug ${i + 1} name`} value={drug}
              onChange={(e) => {
                const updated = [...interactionDrugs];
                updated[i] = e.target.value;
                setInteractionDrugs(updated);
              }} />
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setInteractionDrugs([...interactionDrugs, ''])}>+ Add Drug</button>
            <button className="btn btn-primary" onClick={checkInteractions} disabled={checkingInteractions}>
              {checkingInteractions ? 'Checking...' : 'Check Interactions'}
            </button>
          </div>
        </div>

        {interactions && (
          <div style={{ marginTop: 20 }}>
            {interactions.data?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {interactions.data.map((int, i) => (
                  <div key={i} className="alert alert-warning" style={{ marginBottom: 0 }}>
                    <FiAlertCircle />
                    <div>
                      <strong>{int.drug1} ↔ {int.drug2}</strong>
                      <span className={`badge badge-${int.severity === 'severe' ? 'rose' : 'amber'}`} style={{ marginLeft: 8 }}>{int.severity}</span>
                      <p style={{ marginTop: 4, fontSize: '0.875rem' }}>{int.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-success" style={{ marginBottom: 0 }}>
                <FiInfo /> No known interactions found between these drugs.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
