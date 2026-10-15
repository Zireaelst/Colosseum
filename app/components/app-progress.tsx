export type AppFundingState = "idle" | "signing" | "confirming" | "confirmed";

export interface AppProgressState {
  walletVerified: boolean;
  taskCreated: boolean;
  fundingState: AppFundingState;
}

export function getAppProgress(state: AppProgressState): {
  activeStep: 1 | 2 | 3;
  completedSteps: number[];
} {
  if (!state.walletVerified) return { activeStep: 1, completedSteps: [] };
  if (!state.taskCreated || state.fundingState !== "confirmed") {
    return { activeStep: 2, completedSteps: [1] };
  }
  return { activeStep: 3, completedSteps: [1, 2] };
}

const steps = [
  [1, "Connect", "Verify wallet ownership"],
  [2, "Create & fund", "Scope a disposable task"],
  [3, "Run & inspect", "Execute bounded authority"],
] as const;

export function AppProgress(props: AppProgressState) {
  const progress = getAppProgress(props);

  return (
    <ol aria-label="Application progress" className="app-progress">
      {steps.map(([number, title, description]) => {
        const complete = progress.completedSteps.includes(number);
        const active = progress.activeStep === number;
        return (
          <li className={`${complete ? "complete" : ""} ${active ? "active" : ""}`} key={number}>
            <span>{complete ? "✓" : number}</span>
            <div><strong>{title}</strong><small>{description}</small></div>
          </li>
        );
      })}
    </ol>
  );
}
