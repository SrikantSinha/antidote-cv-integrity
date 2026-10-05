import React, { useEffect, useRef, useState } from 'react'

const NAV_ITEMS = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'data', num: '02', label: 'Data Integrity' },
  { id: 'model', num: '03', label: 'Model Integrity' },
  { id: 'provenance', num: '04', label: 'Provenance' },
  { id: 'drift', num: '05', label: 'Distribution Shift' },
  { id: 'source', num: '06', label: 'Data Source' },
  { id: 'report', num: '07', label: 'Assurance Report' },
]

const DATA_FINDINGS = [
  { id: 'DI-0041', sample: 'IMG_008721', contributor: 'Contributor C-17', indicator: 'Near-duplicate cluster · 19x', confidence: '98.2%', status: 'warn' },
  { id: 'DI-0038', sample: 'BATCH_091', contributor: 'Contributor C-09', indicator: 'Label flip pattern · 7 labels', confidence: '91.4%', status: 'warn' },
  { id: 'DI-0032', sample: 'BATCH_087', contributor: 'Contributor C-12', indicator: 'OOD insertion', confidence: '88.7%', status: 'ok' },
  { id: 'DI-0027', sample: 'BATCH_081', contributor: 'Contributor C-04', indicator: 'Clean distribution', confidence: '97.9%', status: 'ok' },
]

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes, i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i > 0 && n < 10 ? 1 : 0)} ${units[i]}`
}

export default function App() {
  const [view, setView] = useState('overview')
  const [statusText, setStatusText] = useState('READY')
  const [score, setScore] = useState(86)
  const [running, setRunning] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalText, setModalText] = useState('')

  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const toastTimer = useRef(null)

  const [searchQuery, setSearchQuery] = useState('')

  // --- Data Source: backend dataset connection ---
  const [datasetUrl, setDatasetUrl] = useState('')
  const [datasetToken, setDatasetToken] = useState('')
  const [datasetLoading, setDatasetLoading] = useState(false)
  const [datasetError, setDatasetError] = useState('')
  const [datasetSummary, setDatasetSummary] = useState(null)

  // --- Data Source: upload a file to check ---
  const [dragOver, setDragOver] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadHash, setUploadHash] = useState('')
  const [uploadStatus, setUploadStatus] = useState('idle') // idle | hashing | done | error
  const [uploadVerdict, setUploadVerdict] = useState(null)

  function toast(msg) {
    setToastMsg(msg)
    setToastShow(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 2400)
  }
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), [])

  function showView(v) {
    setView(v)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function runCheck() {
    setStatusText('RUNNING')
    setRunning(true)
    toast('Assurance run started · scanning demo evidence ledger')
    setTimeout(() => {
      setStatusText('COMPLETE')
      setScore(89)
      setRunning(false)
      toast('Run complete · 16 checks resolved · 3 review signals')
    }, 1300)
  }

  function openModal(text) {
    setModalText(text)
    setModalOpen(true)
  }

  function simulatePoison() {
    openModal('A synthetic near-duplicate burst has been inserted into the demo ledger. The UI is showing how the assurance layer surfaces evidence; it is not claiming a real attack.')
  }
  function tamperTest() {
    openModal('A synthetic replay/tamper event was tested. The chain would reject the altered record because its nonce/hash relationship no longer matches the protected sequence.')
  }
  function modelDetails() {
    showView('model')
    toast('Controlled test evidence: 12 trigger probes · 1 material delta')
  }

  function downloadReport() {
    const liveScore = datasetSummary?.score ?? score
    const text = `ASSURECORE / AC-26228-041
INTEGRITY ASSURANCE ASSESSMENT
Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}

ASSURANCE INDEX: ${liveScore}/100
DATA: REVIEW — 2 contributor-linked findings
MODEL: REVIEW — behavioural delta under black-box access
PROVENANCE: VERIFIED — 8,216 chained records
SHIFT: WITHIN BAND — PSI 0.071

NEXT ACTION
Quarantine affected contributor batch; repeat model battery with weight-level access if available.

LIMITATIONS
Demo signals are simulated. Prototype thresholds and methods require validation before operational use.`
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'assurecore-assurance-report.txt'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Report exported')
  }

  // --- Backend dataset load: fetch the user's own API and map fields onto the live stats ---
  async function loadDataset(e) {
    e.preventDefault()
    setDatasetError('')
    setDatasetSummary(null)
    setDatasetLoading(true)
    try {
      const headers = {}
      if (datasetToken) headers['Authorization'] = datasetToken.startsWith('Bearer') ? datasetToken : `Bearer ${datasetToken}`
      const res = await fetch(datasetUrl, { headers })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const json = await res.json()
      setDatasetSummary(json)
      toast('Dataset connected · live stats updated')
    } catch (err) {
      setDatasetError(
        err.message === 'Failed to fetch'
          ? 'Could not reach that endpoint. Check the URL and that the API allows cross-origin requests (CORS).'
          : err.message
      )
    } finally {
      setDatasetLoading(false)
    }
  }

  // --- File upload check: real SHA-256 hash, plus a clearly-labelled prototype heuristic ---
  async function handleFile(file) {
    setDragOver(false)
    setUploadFile(file)
    setUploadHash('')
    setUploadVerdict(null)
    setUploadStatus('hashing')
    try {
      const buf = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buf)
      const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
      setUploadHash(hex)
      const flagged = parseInt(hex.slice(0, 2), 16) % 5 === 0
      setUploadVerdict(
        flagged
          ? { level: 'warn', label: 'REVIEW', detail: 'Prototype heuristic flagged this file for manual review. This is a demo signal only — not a real detection result.' }
          : { level: 'ok', label: 'VERIFIED', detail: 'No anomaly signature matched against the demo ledger. This is a prototype check, not a production verdict.' }
      )
      setUploadStatus('done')
      toast('File hashed and logged to the demo evidence ledger')
    } catch (err) {
      setUploadStatus('error')
      toast('Could not read that file in this browser')
    }
  }
  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const filteredRows = DATA_FINDINGS.filter(r =>
    `${r.id} ${r.sample} ${r.contributor} ${r.indicator} ${r.confidence}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const samples = datasetSummary?.samples?.toLocaleString?.() ?? datasetSummary?.samples ?? '12,480'
  const modelVersion = datasetSummary?.model ?? 'v2.7.1'
  const inferences = datasetSummary?.inferences?.toLocaleString?.() ?? datasetSummary?.inferences ?? '8,216'
  const liveScore = datasetSummary?.score ?? score

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark">AC</div>
          <div>
            <div className="brand-name">ASSURECORE</div>
            <div className="brand-sub">COMPUTER VISION INTEGRITY ASSURANCE</div>
          </div>
        </div>
        <div className="top-meta">
          <span className="sim-dot"></span><span>DEMO ENVIRONMENT</span><span className="sep">|</span><span>CASE AC-26228-041</span>
        </div>
        <button className="run-btn" onClick={runCheck} disabled={running}>
          {running ? 'RUNNING…' : <>RUN ASSURANCE CHECK <span>↗</span></>}
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="side-label">ASSURANCE CONSOLE</div>
          {NAV_ITEMS.map(n => (
            <button key={n.id} className={`nav${view === n.id ? ' active' : ''}`} onClick={() => showView(n.id)}>
              <span>{n.num}</span> {n.label}
            </button>
          ))}
          <div className="sidebar-foot">
            <div className="smallcaps">SCOPE</div>
            <p>Model-agnostic<br />Evidence-first<br />Reproducible</p>
            <div className="build">BUILD 0.9.4 / SIH26</div>
          </div>
        </aside>

        <main className="main">
          {/* 01 — OVERVIEW */}
          <section className={`view${view === 'overview' ? ' active' : ''}`}>
            <div className="page-head">
              <div>
                <div className="eyebrow">MISSION VIEW / PS SIH26228</div>
                <h1>Pipeline assurance<br /><em>without blind trust.</em></h1>
                <p className="lede">A single evidence layer for contributed data, supplied models and inference records.</p>
              </div>
              <div className="case-card">
                <span>ASSESSMENT STATUS</span>
                <strong>{statusText}</strong>
                <small>Last run: 03 Oct 2026 · 14:42 IST</small>
              </div>
            </div>

            <div className="score-row">
              <div className="score-card primary">
                <div className="score-top"><span>ASSURANCE INDEX</span><b>{datasetSummary ? 'LIVE · BACKEND' : 'LIVE'}</b></div>
                <div className="score"><strong>{liveScore}</strong><span>/100</span></div>
                <div className="meter"><i style={{ width: `${liveScore}%` }}></i></div>
                <p>Evidence-weighted confidence across four assurance surfaces.</p>
              </div>
              <div className="mini-stat"><span>DATASET</span><strong>{samples}</strong><small>samples scanned</small></div>
              <div className="mini-stat"><span>MODEL</span><strong>{modelVersion}</strong><small>digest pinned</small></div>
              <div className="mini-stat"><span>INFERENCES</span><strong>{inferences}</strong><small>records chained</small></div>
            </div>

            <div className="section-head">
              <div><span className="eyebrow">ASSURANCE SURFACES</span><h2>What the system can prove</h2></div>
              <span className="muted">Click a surface to inspect evidence</span>
            </div>
            <div className="surface-grid">
              <button className="surface" onClick={() => showView('data')}>
                <span className="surface-num">01</span><div className="surface-icon">◫</div>
                <h3>Training-data integrity</h3><p>Poisoning, label anomalies, duplicates and OOD insertion.</p>
                <div className="surface-foot"><b>2 findings</b><span className="warn">REVIEW</span></div>
              </button>
              <button className="surface" onClick={() => showView('model')}>
                <span className="surface-num">02</span><div className="surface-icon">⌬</div>
                <h3>Model integrity</h3><p>Behavioural fingerprinting and trigger-oriented checks.</p>
                <div className="surface-foot"><b>1 finding</b><span className="warn">REVIEW</span></div>
              </button>
              <button className="surface" onClick={() => showView('provenance')}>
                <span className="surface-num">03</span><div className="surface-icon">⛓</div>
                <h3>Inference provenance</h3><p>Cryptographic binding of input, model, config and output.</p>
                <div className="surface-foot"><b>8,216 chained</b><span className="ok">VERIFIED</span></div>
              </button>
              <button className="surface" onClick={() => showView('drift')}>
                <span className="surface-num">04</span><div className="surface-icon">⌁</div>
                <h3>Distribution shift</h3><p>Reference deviation across sensor, season and illumination.</p>
                <div className="surface-foot"><b>3 segments</b><span className="ok">WITHIN BAND</span></div>
              </button>
              <button className="surface" onClick={() => showView('source')}>
                <span className="surface-num">06</span><div className="surface-icon">⇄</div>
                <h3>Data source<span className="new-badge">NEW</span></h3><p>Connect a live backend dataset or upload a file for an on-demand check.</p>
                <div className="surface-foot"><b>{datasetSummary ? 'Connected' : 'Not connected'}</b><span className={datasetSummary ? 'ok' : 'warn'}>{datasetSummary ? 'LIVE' : 'SET UP'}</span></div>
              </button>
            </div>

            <div className="evidence-strip">
              <div><span className="eyebrow">EVIDENCE LEDGER</span><strong>Every finding is traceable.</strong></div>
              <div className="ledger-items">
                <span><i className="dot ok-dot"></i> 14 verified</span>
                <span><i className="dot warn-dot"></i> 3 review</span>
                <span><i className="dot neutral-dot"></i> 2 unavailable</span>
              </div>
              <button className="text-btn" onClick={() => showView('report')}>OPEN REPORT →</button>
            </div>
          </section>

          {/* 02 — DATA INTEGRITY */}
          <section className={`view${view === 'data' ? ' active' : ''}`}>
            <div className="page-title">
              <div><span className="eyebrow">02 / TRAINING-DATA INTEGRITY</span><h1>Sample-level evidence,<br /><em>source-level accountability.</em></h1></div>
              <span className="pill warn-pill">2 ITEMS FOR REVIEW</span>
            </div>
            <div className="data-toolbar">
              <div className="search">⌕ <input placeholder="Filter samples, contributors or finding IDs" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
              <button className="ghost" onClick={simulatePoison}>SIMULATE POISONING</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>FINDING</th><th>SAMPLE / BATCH</th><th>CONTRIBUTOR</th><th>INDICATOR</th><th>CONFIDENCE</th><th>STATUS</th></tr></thead>
                <tbody>
                  {filteredRows.map(r => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}</td>
                      <td>{r.sample}</td>
                      <td>{r.contributor}</td>
                      <td>{r.indicator}</td>
                      <td>{r.confidence}</td>
                      <td><span className={`status ${r.status}`}>{r.status === 'warn' ? 'REVIEW' : 'VERIFIED'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="insight">
              <div className="insight-mark">!</div>
              <div><b>Source aggregation matters.</b><p>Multiple weak sample signals are consolidated into contributor-level evidence rather than treating every anomaly as an isolated incident.</p></div>
            </div>
          </section>

          {/* 03 — MODEL INTEGRITY */}
          <section className={`view${view === 'model' ? ' active' : ''}`}>
            <div className="page-title">
              <div><span className="eyebrow">03 / MODEL INTEGRITY</span><h1>Fingerprint the behaviour,<br /><em>not just the weights.</em></h1></div>
              <span className="pill warn-pill">1 ITEM FOR REVIEW</span>
            </div>
            <div className="model-grid">
              <div className="panel fingerprint">
                <div className="panel-head"><span>BEHAVIOURAL FINGERPRINT</span><span className="mono">REF-2.7.0 → SUP-2.7.1</span></div>
                <div className="radar">
                  <div className="radar-ring r1"></div><div className="radar-ring r2"></div><div className="radar-ring r3"></div>
                  <div className="axis a1">CONFIDENCE</div><div className="axis a2">ROBUSTNESS</div><div className="axis a3">CALIBRATION</div><div className="axis a4">TRIGGER SENSITIVITY</div>
                  <div className="poly"></div>
                </div>
                <div className="metric-list">
                  <div><span>Confidence alignment</span><b>94.1%</b></div>
                  <div><span>Calibration delta</span><b>+1.8%</b></div>
                  <div><span>Trigger sensitivity</span><b className="warning-text">+6.4%</b></div>
                </div>
              </div>
              <div className="panel finding">
                <span className="eyebrow">FINDING MI-0017</span>
                <h2>Behavioural delta detected</h2>
                <p>Supplied model diverges from the declared reference on a controlled trigger battery. This is an assurance signal, not proof of a backdoor.</p>
                <div className="finding-box"><span>ACCESS ASSUMPTION</span><b>BLACK-BOX</b><small>Weights unavailable · behavioural tests only</small></div>
                <div className="confidence"><span>ASSESSMENT CONFIDENCE</span><strong>78%</strong><div className="meter"><i style={{ width: '78%' }}></i></div></div>
                <button className="outline-btn" onClick={modelDetails}>VIEW TEST EVIDENCE →</button>
              </div>
            </div>
          </section>

          {/* 04 — PROVENANCE */}
          <section className={`view${view === 'provenance' ? ' active' : ''}`}>
            <div className="page-title">
              <div><span className="eyebrow">04 / INFERENCE PROVENANCE</span><h1>Every output carries<br /><em>its own chain of custody.</em></h1></div>
              <span className="pill ok-pill">CHAIN VERIFIED</span>
            </div>
            <div className="chain">
              <div className="chain-node"><span>INPUT</span><b>IMG_008721</b><small>SHA-256<br />8c2a…71de</small></div>
              <div className="connector"><i></i></div>
              <div className="chain-node"><span>MODEL</span><b>CV-2.7.1</b><small>digest<br />41be…9f02</small></div>
              <div className="connector"><i></i></div>
              <div className="chain-node"><span>CONFIG</span><b>CFG-119</b><small>preprocess<br />v4.2</small></div>
              <div className="connector"><i></i></div>
              <div className="chain-node result"><span>OUTPUT</span><b>CLASS: ROAD</b><small>score 0.94<br />record #8216</small></div>
            </div>
            <div className="verify-card">
              <div><span className="eyebrow">VERIFICATION RESULT</span><h2>Cryptographic binding intact</h2><p>Input hash, model digest, preprocessing configuration and output record resolve to the same protected event.</p></div>
              <div className="seal">✓<small>VALID</small></div>
            </div>
            <div className="tamper-row">
              <div><b>Replay / tamper detection</b><span>Nonce sequence 8216 → 8217 is continuous.</span></div>
              <button className="ghost" onClick={tamperTest}>TEST TAMPER</button>
            </div>
          </section>

          {/* 05 — DISTRIBUTION SHIFT */}
          <section className={`view${view === 'drift' ? ' active' : ''}`}>
            <div className="page-title">
              <div><span className="eyebrow">05 / DISTRIBUTION-SHIFT ASSESSMENT</span><h1>Know when the<br /><em>reference no longer fits.</em></h1></div>
              <span className="pill ok-pill">WITHIN BAND</span>
            </div>
            <div className="drift-grid">
              <div className="panel chart-panel">
                <div className="panel-head"><span>REFERENCE VS CURRENT</span><span className="mono">7D WINDOW</span></div>
                <div className="chart">
                  <div className="chart-grid"></div>
                  <svg viewBox="0 0 700 260" preserveAspectRatio="none">
                    <path className="ref-line" d="M0 120 C80 105 120 135 190 118 S300 90 370 112 S480 128 540 106 S630 96 700 108" />
                    <path className="cur-line" d="M0 126 C80 114 120 142 190 123 S300 98 370 120 S480 138 540 112 S630 105 700 116" />
                  </svg>
                  <div className="chart-label l1">REF</div>
                  <div className="chart-label l2">CURRENT</div>
                </div>
                <div className="legend"><span><i className="line ref"></i> reference</span><span><i className="line cur"></i> current</span><b>PSI 0.071</b></div>
              </div>
              <div className="segment-list">
                <div className="segment"><span>Terrain</span><b>0.04</b><i></i><small>stable</small></div>
                <div className="segment"><span>Illumination</span><b>0.11</b><i></i><small>watch</small></div>
                <div className="segment"><span>Sensor</span><b>0.06</b><i></i><small>stable</small></div>
                <div className="segment"><span>Season</span><b>0.08</b><i></i><small>stable</small></div>
              </div>
            </div>
          </section>

          {/* 06 — DATA SOURCE (new) */}
          <section className={`view${view === 'source' ? ' active' : ''}`}>
            <div className="page-title">
              <div><span className="eyebrow">06 / DATA SOURCE</span><h1>Bring your own<br /><em>dataset and files.</em></h1></div>
              <span className="pill ok-pill">LIVE CONNECT</span>
            </div>
            <div className="source-grid">
              <div className="panel connect-panel">
                <div className="panel-head"><span>BACKEND DATASET</span><span className="mono">{datasetSummary ? 'CONNECTED' : datasetLoading ? 'LOADING' : 'NOT CONNECTED'}</span></div>
                <p className="panel-desc">Point the console at your own data or evaluation API. The response is parsed and mapped onto the live stats on the Overview page.</p>
                <form className="connect-form" onSubmit={loadDataset}>
                  <label>API ENDPOINT
                    <input type="url" required placeholder="https://your-api.example.com/dataset-summary" value={datasetUrl} onChange={e => setDatasetUrl(e.target.value)} />
                  </label>
                  <label>AUTH TOKEN (optional)
                    <input type="text" placeholder="Bearer token" value={datasetToken} onChange={e => setDatasetToken(e.target.value)} />
                  </label>
                  <button className="run-btn" type="submit" disabled={datasetLoading}>{datasetLoading ? 'LOADING…' : 'LOAD DATASET'}</button>
                </form>
                {datasetError && <div className="connect-msg error">{datasetError}</div>}
                {datasetSummary && <div className="connect-msg ok">Connected. Response mapped onto {Object.keys(datasetSummary).length} field(s).</div>}
                <div className="hint">Expected JSON shape (any subset of these keys):<code>{'{ "samples": 12480, "score": 86, "model": "v2.7.1", "inferences": 8216 }'}</code></div>
              </div>

              <div
                className={`panel upload-panel${dragOver ? ' drag' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="panel-head"><span>UPLOAD A FILE TO CHECK</span><span className="mono">{uploadStatus.toUpperCase()}</span></div>
                <p className="panel-desc">Drop a file or browse. AssureCore hashes it locally and runs a quick prototype check against the demo ledger.</p>
                <label className="dropzone">
                  <input type="file" hidden onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                  <span className="dz-icon">⇪</span>
                  <span>{uploadFile ? uploadFile.name : 'Click or drop a file here'}</span>
                </label>
                {uploadFile && (
                  <div className="upload-result">
                    <div><span>FILE</span><b>{uploadFile.name}</b></div>
                    <div><span>SIZE</span><b>{formatBytes(uploadFile.size)}</b></div>
                    <div><span>SHA-256</span><b className="mono small">{uploadStatus === 'hashing' ? 'computing…' : uploadHash}</b></div>
                    {uploadVerdict && (
                      <div className="verdict">
                        <span className={`status ${uploadVerdict.level}`}>{uploadVerdict.label}</span>
                        <p>{uploadVerdict.detail}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 07 — REPORT */}
          <section className={`view${view === 'report' ? ' active' : ''}`}>
            <div className="page-title">
              <div><span className="eyebrow">07 / ASSURANCE REPORT</span><h1>A decision-ready<br /><em>evidence packet.</em></h1></div>
              <button className="run-btn" onClick={downloadReport}>EXPORT REPORT ↓</button>
            </div>
            <div className="report-card">
              <div className="report-head">
                <div><span className="eyebrow">ASSURECORE / AC-26228-041</span><h2>Integrity Assurance Assessment</h2><p>Generated 03 Oct 2026 · Demo dataset · Reproducible audit run</p></div>
                <div className="report-score"><strong>{liveScore}</strong><span>/100</span></div>
              </div>
              <div className="report-grid">
                <div><span>DATA</span><b>REVIEW</b><p>2 contributor-linked findings require inspection.</p></div>
                <div><span>MODEL</span><b>REVIEW</b><p>Behavioural delta observed under black-box access.</p></div>
                <div><span>PROVENANCE</span><b className="green">VERIFIED</b><p>8,216 inference records cryptographically chained.</p></div>
                <div><span>SHIFT</span><b className="green">WITHIN BAND</b><p>PSI remains below configured review threshold.</p></div>
              </div>
              <div className="recommend"><span>NEXT ACTION</span><strong>Quarantine affected contributor batch; repeat model battery with weight-level access if available.</strong></div>
              <div className="limitations"><b>Coverage &amp; limitations</b><span>Demo signals are simulated. Behavioural assessment cannot establish model internals without appropriate access. Thresholds are prototype configuration and must be validated before operational use.</span></div>
            </div>
          </section>
        </main>
      </div>

      <div className={`toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>

      <div className={`modal${modalOpen ? ' open' : ''}`}>
        <div className="modal-box">
          <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
          <span className="eyebrow">CONTROLLED TEST</span>
          <h2>Integrity event simulated</h2>
          <p>{modalText}</p>
          <div className="modal-code">EVENT: SIM-POISON-041<br />HASH: 6f2c…a19d<br />CHAIN: preserved</div>
          <button className="run-btn" onClick={() => setModalOpen(false)}>ACKNOWLEDGE</button>
        </div>
      </div>
    </div>
  )
}
