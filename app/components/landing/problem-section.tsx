const problems = [
  { number: "01", title: "A cap is not intent", text: "A wallet limit says how much an agent may spend. It does not say what the task actually authorized." },
  { number: "02", title: "Delegation compounds risk", text: "When one agent delegates work, every child needs narrower authority—not a copy of the parent wallet." },
  { number: "03", title: "Checks must happen before signing", text: "A warning after settlement is too late. The payment path must fail closed before credentials leave the backend." },
] as const;

export function ProblemSection() {
  return (
    <section className="landing-section landing-problem" id="problem">
      <div className="landing-section-heading">
        <span className="eyebrow">The problem</span>
        <h2>Agents can pay.<br />Authority is still missing.</h2>
        <p>Autonomous checkout needs more than a balance. It needs a task-specific answer to who may pay, for which service, how much, and until when.</p>
      </div>
      <div className="landing-problem-grid">
        {problems.map((problem) => <article key={problem.number}><span>{problem.number}</span><h3>{problem.title}</h3><p>{problem.text}</p></article>)}
      </div>
    </section>
  );
}
