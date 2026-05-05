# TenantFit — Available Skills Reference
# ─────────────────────────────────────────
# These are Claude Code skills available in this project.
# Read this before deciding how to implement payment or LLM features.

## stripe-best-practices
**When to use:** Any time you are building, modifying, or reviewing
Stripe integration — creating payment links, setting up Checkout
Sessions, handling webhooks, or reviewing pricing model implementation.

**TenantFit context:**
- Current phase: Stripe payment link only (no code integration needed yet)
  The founding member offer is collected manually via a Stripe payment link.
  No webhook, no subscription, no Connect needed at this stage.
- Future phase: When self-serve intake goes live, use Checkout Sessions
  (not PaymentIntents directly) for single report purchases. Use
  subscription billing for any recurring plan.
- Invoke with: /stripe-best-practices

## claude-api
**When to use:** Building the named tenant LLM layer (P2 backlog).
This is the feature that replaces hardcoded `targets` arrays in
`server.js` with Claude-generated franchise candidates based on
the trade area demographic profile.

**TenantFit context:**
- The LLM layer takes: median income, population, traffic count,
  void analysis results, property SF, leasing objective
- It returns: named franchise concepts that match the trade area,
  framed as "concepts that match this profile" not confirmed expansions
- Hallucination mitigation: prompt must explicitly instruct the model
  to frame all recommendations as demographic matches, never as
  confirmed expansion plans
- Invoke with: /claude-api

## simplify
**When to use:** After completing a significant feature block,
if the code feels over-engineered relative to the task.
Do not invoke mid-task. Only after a working version exists.
- Invoke with: /simplify
