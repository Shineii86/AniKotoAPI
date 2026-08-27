# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.4.x   | ✅        |
| < 2.4   | ❌        |

Fixes land on the latest release. If you are running an older version, upgrade before reporting — the issue may already be resolved.

## Reporting a vulnerability

**Please do not open a public issue or pull request for a security problem.** Public reports expose every running instance until a fix ships.

Report privately instead:

1. **Preferred — GitHub private vulnerability reporting.** Use the **Report a vulnerability** button on the [Security tab](https://github.com/Shineii86/AniKotoAPI/security). This keeps the discussion private until an advisory is published.
2. **Fallback — Telegram.** If private reporting is unavailable, message [@Shineii86](https://telegram.me/Shineii86) asking for a private channel. Send only a one-line description there, not the full details.

## What to include

The more of this you can provide, the faster a fix can be confirmed:

- The affected endpoint or module, and the version or commit you tested.
- What an attacker can achieve — reading data, changing state, exhausting resources.
- Minimal steps to reproduce, ideally a single request.
- Whether authentication or any particular deployment setup is required.
- A suggested fix, if you have one.

## What happens next

- Reports are acknowledged as soon as the maintainer sees them.
- Once confirmed, a fix is prepared privately and released, and a GitHub advisory is published crediting the reporter unless anonymity is requested.
- Reporters are asked to hold public details until the fix is released.

This project is maintained by one person as unpaid work. Please read the timing above as intent rather than a guaranteed schedule.

## Scope

In scope — anything that lets someone abuse a deployed instance:

- Server-side request forgery, or any way to make the server fetch or reach destinations it should not.
- Injection, path traversal, or unsafe handling of caller-supplied input.
- Leakage of environment variables, credentials, or internal configuration.
- Denial of service reachable through a single unauthenticated request.
- Vulnerable dependencies with a practical path to exploitation in this codebase.

Out of scope:

- Availability, downtime, or changes to the upstream anime sites this API scrapes.
- Rate limiting or abuse controls on those upstream sites.
- Findings that require an already-compromised host or shell access to the server.
- Reports produced by automated scanners with no demonstrated impact.

## Operator note

This API ships with proxy endpoints that fetch caller-supplied URLs. If you deploy it publicly, review the allowlist in your configuration and restrict it to the hosts you actually need.
