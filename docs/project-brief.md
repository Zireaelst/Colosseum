# Pactlet Project Brief

## Overview

Pactlet is a task-scoped payment guard for AI agents. It lets a manager delegate smaller budgets, approved services, and expiration times to specialist agents, then checks those constraints when an agent attempts a paid request. Agents never receive wallet keys; they can only request a payment through Pactlet's backend purchase service.

## Problem

AI agents are beginning to purchase APIs, data, and other digital services autonomously. Giving an agent unrestricted access to a wallet creates unnecessary financial risk, while relying on model instructions alone does not provide a dependable security boundary. Teams need a way to define exactly which agent may spend, how much it may spend, which service it may use, and how long that authority remains valid.

## Solution

Pactlet places deterministic policy enforcement directly in the payment path. Before a request can be signed or broadcast, the backend checks the agent's runtime identity, delegated budget, service allowlist, expiration, cancellation status, payment details, and idempotency key. Requests that exceed authority are rejected before a transaction is created.

The Solana chain proves token transfers and transaction signatures. Budget, hierarchy, service, expiry, and cancellation rules are enforced by the trusted Pactlet backend. The MVP is therefore a custodial devnet prototype, not an onchain policy protocol or production custody system.

## Intended Users

Pactlet is designed for developers and teams building autonomous agents that need controlled access to paid APIs or other machine-readable services. The initial use case is a manager agent coordinating research and analysis specialists with separate task budgets and permissions.

## Why Now

Agent frameworks can already coordinate specialized models, while x402 provides a standard payment flow for machine-accessible services. Solana offers inexpensive and observable settlement suitable for demonstrating small agent payments. Pactlet connects these developments by enforcing task authority at the moment an agent attempts to pay.

## Solana Integration

Pactlet targets Solana devnet only. A connected wallet authenticates the user and funds a task, while each task receives a disposable backend-controlled devnet payment account. A completed live payment should expose its Solana transaction signature and Explorer link. Mainnet and real user funds are outside the MVP scope.

## Technology

- Next.js, React, TypeScript, and Node.js
- OpenAI Agents SDK
- An OpenAI-compatible AI provider, currently configured for a free-tier model
- TypeSafe Jev integration point with a clearly labeled deterministic fallback
- Solana Wallet Standard and Solana Kit
- SPL Token on Solana devnet
- x402 V2 packages for core, Express, fetch, and SVM integration
- SQLite with `better-sqlite3` for the local single-process ledger
- Vitest for policy, concurrency, idempotency, and UI tests
- Vercel for the public website and simulated walkthrough

## Current Demonstration

The public walkthrough demonstrates hierarchical delegation, an allowed service request, an over-budget rejection, authority cancellation, a rejected retry, remaining balances, and audit events. This mode is deterministic and explicitly labeled `SIMULATED`; it does not fabricate a transaction signature.

The hosted workflow now has durable Supabase state, signed authentication
sessions, and a public HTTPS merchant. It still requires complete server-only
production configuration, provisioned devnet token accounts, a user-approved
funding transaction, and a verified x402 V2 `exact` settlement. The backend
signer remains a custodial encrypted prototype rather than production key
management.

## Business Model

Pactlet can be offered as payment-policy infrastructure for teams operating autonomous agents. Revenue could combine a hosted subscription for policy management and audit tooling with usage-based fees for protected payment attempts or settled transactions. Larger customers could pay for dedicated deployment, signer integrations, compliance controls, and service-level support.

## Public Links

- Website: <https://pactlet-colosseum.vercel.app>
- Demo: <https://pactlet-colosseum.vercel.app/app>
