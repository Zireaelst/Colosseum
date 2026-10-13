import { WalletConnect } from "./wallet-connect";

export default function Home() {
  return (
    <main>
      <header>
        <span className="eyebrow">beeple / devnet-only MVP</span>
        <h1>Bounded authority at the moment an agent pays.</h1>
        <p>
          Wallet proof and approved payments use Solana devnet. Delegation policy is
          enforced by this trusted backend—not onchain.
        </p>
      </header>

      <section>
        <div className="step">01</div>
        <div>
          <h2>Connect and prove wallet ownership</h2>
          <p>A short-lived, origin-bound nonce is signed without sending a transaction.</p>
          <WalletConnect />
        </div>
      </section>

      <section>
        <div className="step">02</div>
        <div>
          <h2>Task funding preview</h2>
          <p>The exact signer, mint, base-unit amount, and recipient ATA appear above after task creation.</p>
          <small>The funding action appears only after wallet proof and requires an explicit wallet approval.</small>
        </div>
      </section>

      <section>
        <div className="step">03</div>
        <div>
          <h2>Policy & settlement</h2>
          <p>Automated tests protect wallet proof, task accounts, funding construction, routing, delegation, reservation, rejection, and settlement state.</p>
        </div>
      </section>
    </main>
  );
}
