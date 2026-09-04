import { money, runFacts, SAMPLE_ALLOCATIONS, sampleRows, type WorkflowKind, type WorkflowRun } from './workflow-model';

export function WorkflowPreview({ kind, run, page = 0, compact = false }: {
  kind: WorkflowKind; run?: WorkflowRun; page?: number; compact?: boolean;
}) {
  const facts = run ? runFacts(run) : null;
  const newsletter = kind === 'newsletter';
  const commentary = run?.commentary.replace(/\s+/g, ' ').trim();
  const overviewText = newsletter && commentary && commentary.length > 140 ? `${commentary.slice(0, 137).trimEnd()}…` : commentary;
  const allocationTotal = SAMPLE_ALLOCATIONS.reduce((sum, item) => sum + item.millions, 0);
  const assetManagerShare = Math.round(SAMPLE_ALLOCATIONS[0].millions / allocationTotal * 100);
  const issuers = facts?.issuers || sampleRows(kind).map(row => ({ name: String(row.Issuer), size: Number(row.Size_mm) }));
  const maxSize = Math.max(...issuers.map(issuer => issuer.size));
  const bars = newsletter ? issuers.map(issuer => ({ label: issuer.name.split(' ')[0], width: issuer.size / maxSize * 100, value: money(issuer.size) }))
    : SAMPLE_ALLOCATIONS.map(item => ({ label: item.label, width: item.millions / SAMPLE_ALLOCATIONS[0].millions * 100, value: `${Math.round(item.millions / allocationTotal * 100)}%` }));
  return (
    <article className={`wf-slide ${compact ? 'wf-slide--compact' : ''}`} aria-label={`${newsletter ? 'Newsletter' : 'Deal flash'} slide preview`}>
      <div className="wf-slide-brand"><span>PRIMARY FLOW <b>/</b> {newsletter ? 'WEEKLY' : 'DEAL FLASH'}</span><span>SAMPLE</span></div>
      <div className="wf-slide-rule" />
      <div className="wf-slide-kicker">{run?.period || (newsletter ? 'WEEK ENDING 4 SEPTEMBER 2026' : 'EUR INVESTMENT GRADE')}</div>
      <h3>{newsletter ? (page === 1 ? 'The week’s transactions' : page === 2 ? 'The desk’s perspective' : 'A week in primary.') : (facts?.issuer || 'Northstar Energy')}</h3>
      <p className="wf-slide-subtitle">{newsletter ? 'EUR credit · Primary market update' : 'EUR senior unsecured · Transaction summary'}</p>
      {page === 1 && newsletter && run ? (
        <div className="wf-slide-transactions">
          <div><b>ISSUER</b><b>SIZE</b><b>SPREAD</b></div>
          {run.rows.map((row, i) => <div key={i}><span>{String(row[run.config.mapping.issuer])}</span><span>{money(Number(row[run.config.mapping.size]))}</span><span>{String(row[run.config.mapping.spread])} bps</span></div>)}
        </div>
      ) : page === 2 && newsletter ? (
        <div className="wf-slide-editorial"><span>TEAM COMMENTARY</span><p>{commentary}</p><div>For team review · Based on the sample source pack</div></div>
      ) : (
        <>
          <div className="wf-slide-stats">
            <div><strong>{money(facts?.total ?? (newsletter ? 5000 : 750))}</strong><span>{newsletter ? 'Total issuance' : 'Issue size'}</span></div>
            <div><strong>{newsletter ? (facts?.count ?? 6) : (facts?.spread ?? 105)}{!newsletter && <small> bps</small>}</strong><span>{newsletter ? 'Transactions' : 'Final spread'}</span></div>
            <div><strong>{newsletter ? (facts?.currency || 'EUR') : `${assetManagerShare}%`}</strong><span>{newsletter ? 'Currency' : 'Asset managers'}</span></div>
          </div>
          <div className="wf-slide-bottom">
            <div className="wf-slide-chart" role="img" aria-label={newsletter ? 'Sample issue sizes: Northstar 750 million, Calder 1000 million, Helix 500 million, Meridian 1250 million, Atlas 750 million, Westhaven 750 million euros.' : 'Sample allocation by investor type: asset managers 56%, insurance 24%, banks 12%, other 8%.'}>
              <span>{newsletter ? 'ISSUANCE BY TRANSACTION' : 'FINAL ALLOCATION'}</span>
              {bars.map(({ label, width, value }) => (
                <div className="wf-slide-bar" key={label}><span>{label}</span><i><b style={{ width: `${width}%` }} /></i><em>{value}</em></div>
              ))}
            </div>
            <div className="wf-slide-note"><span>{newsletter && run ? 'COMMENTARY EXCERPT · FULL TEXT ON SLIDE 3' : 'AT A GLANCE'}</span><p>{overviewText || (newsletter ? 'Six transactions. One consistent view of the market, ready for your team’s perspective.' : 'Pricing, allocation and commentary brought together in your team’s template.')}</p></div>
          </div>
        </>
      )}
      <footer><span>{run?.config.team || 'EUR IG Syndicate'} · Illustrative data</span><span>{String(page + 1).padStart(2, '0')}</span></footer>
    </article>
  );
}

export function downloadPreview(run: WorkflowRun) {
  const facts = runFacts(run);
  const escape = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  const rows = run.rows.map(row => `<tr><td>${escape(String(row[run.config.mapping.issuer]))}</td><td>${escape(String(row[run.config.mapping.currency]))}</td><td>${escape(money(Number(row[run.config.mapping.size])))}</td><td>${escape(String(row[run.config.mapping.spread]))} bps</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(run.config.name)} — sample preview</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#233e35;max-width:900px;margin:64px auto;padding:0 24px}header{border-bottom:4px solid #233e35;padding-bottom:16px}h1{font-size:36px;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{text-align:left;border-bottom:1px solid #dcded9;padding:12px}small{color:#66736c}.note{white-space:pre-wrap}footer{border-top:1px solid #dcded9;margin-top:40px;padding-top:16px}</style><header>PRIMARY FLOW · SAMPLE PREVIEW</header><h1>${escape(run.config.name)}</h1><p>${escape(run.period)} · ${escape(run.config.team)}</p><h2>${escape(money(facts.total))} · ${facts.count} transaction${facts.count > 1 ? 's' : ''}</h2><p class="note">${escape(run.commentary)}</p><table><thead><tr><th>Issuer</th><th>Currency</th><th>Size</th><th>Final spread</th></tr></thead><tbody>${rows}</tbody></table><footer><p>Source pack: ${WORKFLOW_FILES(run)}</p><small>Fictional sample data. This HTML preview is not a PowerPoint export. Reviewed: ${escape(run.reviewedAt || 'Not yet reviewed')}. No live data connections or AI generation were used.</small></footer></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${run.config.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-sample.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function WORKFLOW_FILES(run: WorkflowRun) {
  return run.config.kind === 'flash' ? 'Deal terms.xlsx; Final allocations.csv; Deal commentary.docx' : 'Weekly issuance.xlsx; Market context.xlsx; Team commentary.docx';
}
