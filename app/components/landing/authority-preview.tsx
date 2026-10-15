import Link from "next/link";

export function AuthorityPreview() {
  return (
    <section className="authority-preview-section" aria-labelledby="authority-preview-title">
      <div className="authority-preview-intro"><span className="eyebrow">A clear chain of responsibility</span><h2 id="authority-preview-title">One task.<br />Every permission in view.</h2><p>See who can spend, what they can buy, and where the budget goes. Each specialist works within the authority you delegate.</p><Link href="/demo">Walk through a sample task <span aria-hidden="true">→</span></Link></div>
      <div className="authority-preview">
        <div className="authority-preview-toolbar"><span><i /> Task overview</span><span>Illustrative example</span></div>
        <div className="authority-preview-title"><span className="authority-preview-icon" aria-hidden="true">↳</span><div><strong>Research a market opportunity</strong><small>Owner → Manager → Specialists</small></div><span className="authority-preview-status">Scoped</span></div>
        <div className="authority-preview-budget"><div><span>Task budget</span><strong>10.00 <small>test USDC</small></strong></div><div className="authority-budget-track" aria-label="4 USDC allocated to research, 3 to analysis, 3 unallocated"><span /><span /><span /></div><div className="authority-budget-legend"><span><i /> Research · 4</span><span><i /> Analysis · 3</span><span><i /> Unallocated · 3</span></div></div>
        <div className="authority-preview-agent"><span className="authority-agent-avatar" aria-hidden="true">R</span><div><strong>Research specialist</strong><small>Paid research brief · 45-minute window</small></div><strong>4.00 <small>test USDC</small></strong></div>
        <div className="authority-preview-agent analysis"><span className="authority-agent-avatar" aria-hidden="true">A</span><div><strong>Analysis specialist</strong><small>Analysis service · narrower permissions</small></div><strong>3.00 <small>test USDC</small></strong></div>
        <div className="authority-preview-bottom"><span aria-hidden="true">◇</span> Each payment is checked before signing.<Link href="/docs#trust">View policy model ↗</Link></div>
      </div>
    </section>
  );
}
