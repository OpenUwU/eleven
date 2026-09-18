#!/usr/bin/env bash
set -euo pipefail

# Must match TOPGG_WEBHOOK_SECRET in your .env (the "whs_..." value from the dashboard)
SECRET="boombj"
URL="http://localhost:6969/webhooks/topgg"

BODY='{"type":"vote.create","data":{"id":"1517819999723720704","weight":1,"created_at":"2026-07-18T00:47:14.251Z","expires_at":"2026-07-18T12:47:14.251Z","project":{"id":"803190510032756736","type":"bot","platform":"discord","platform_id":"1517819999723720704"},"query":{},"user":{"id":"topgg_id_123","platform_id":"160105994217586689","name":"tester","avatar_url":"https://example.com/avatar.png"}}}'

TS=$(date +%s)
SIG=$(printf '%s' "${TS}.${BODY}" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

curl -i -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-topgg-signature: t=${TS},v1=${SIG}" \
  -H "x-topgg-trace: local-test-$(date +%s)" \
  -d "$BODY"
