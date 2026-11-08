import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const apiUrl = process.env.API_URL ?? "http://localhost:3000/api";
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to run this integration test.");
}

async function request(path, { method = "GET", token, idempotencyKey, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${result.message ?? "request failed"}`);
  }
  return result;
}

const session = await request("/auth/login", {
  method: "POST",
  body: { email, password },
});
const teams = await request("/teams", { token: session.accessToken });
assert.ok(teams.length, "At least one seeded team is required");

let itemId;
try {
  const teamId = teams.find((team) => team.name === "Front of House")?.id ?? teams[0].id;
  const item = await request("/inventory", {
    method: "POST",
    token: session.accessToken,
    body: { name: `Concurrency test ${randomUUID()}`, unit: "Each", teamIds: [teamId] },
  });
  itemId = item.id;
  assert.equal(item.quantity, null, "Omitted quantity must remain NULL");

  const initialKey = randomUUID();
  await request(`/inventory/${itemId}/set-quantity`, {
    method: "POST",
    token: session.accessToken,
    idempotencyKey: initialKey,
    body: { teamId, quantity: 20 },
  });

  const addKey = randomUUID();
  const removeKey = randomUUID();
  await Promise.all([
    request(`/inventory/${itemId}/adjust`, {
      method: "POST",
      token: session.accessToken,
      idempotencyKey: addKey,
      body: { teamId, amount: 5 },
    }),
    request(`/inventory/${itemId}/adjust`, {
      method: "POST",
      token: session.accessToken,
      idempotencyKey: removeKey,
      body: { teamId, amount: -2 },
    }),
  ]);
  const finalItem = await request(`/inventory/${itemId}`, { token: session.accessToken });
  assert.equal(Number(finalItem.quantity), 23, "Concurrent +5 and -2 adjustments must both apply");

  await request(`/inventory/${itemId}/adjust`, {
    method: "POST",
    token: session.accessToken,
    idempotencyKey: addKey,
    body: { teamId, amount: 5 },
  });
  const replayedItem = await request(`/inventory/${itemId}`, { token: session.accessToken });
  assert.equal(Number(replayedItem.quantity), 23, "Idempotent retries must not adjust quantity twice");
  console.log("PASS: NULL initial quantity, concurrent adjustments, and idempotent retry.");
} finally {
  if (itemId) {
    await request(`/inventory/${itemId}`, {
      method: "DELETE",
      token: session.accessToken,
    });
  }
}
