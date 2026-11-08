import assert from "node:assert/strict";
import { io } from "socket.io-client";

const apiUrl = process.env.API_URL ?? "http://localhost:3000/api";
const apiOrigin = new URL(apiUrl).origin;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const memberEmail = process.env.TEST_MEMBER_EMAIL;
const memberPassword = process.env.TEST_MEMBER_PASSWORD;

if (!adminEmail || !adminPassword || !memberEmail || !memberPassword) {
  throw new Error("Set admin and member test credentials before running the realtime test.");
}

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${result.message ?? "request failed"}`);
  }
  return result;
}

function waitForEvent(socket, event, timeout = 6000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`${event} was not received before timeout`));
    }, timeout);
    const onEvent = (...args) => {
      clearTimeout(timer);
      resolve(args);
    };
    socket.once(event, onEvent);
  });
}

function connect(socket) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      reject(new Error("Socket connection timed out"));
    }, 6000);
    const onConnect = () => {
      clearTimeout(timer);
      socket.off("connect_error", onError);
      resolve();
    };
    const onError = (error) => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      reject(error);
    };
    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
  });
}

function emitAck(socket, event, data) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out`)), 5000);
    socket.emit(event, data, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

const [admin, member] = await Promise.all([
  request("/auth/login", { method: "POST", body: { email: adminEmail, password: adminPassword } }),
  request("/auth/login", { method: "POST", body: { email: memberEmail, password: memberPassword } }),
]);
const teams = await request("/teams", { token: admin.accessToken });
const frontOfHouse = teams.find((team) => team.name === "Front of House");
const deli = teams.find((team) => team.name === "Deli");
assert.ok(frontOfHouse && deli, "Seeded teams must be available");

const socket = io(apiOrigin, {
  auth: { token: admin.accessToken },
  transports: ["websocket"],
  timeout: 5000,
});
const memberSocket = io(apiOrigin, {
  auth: { token: member.accessToken },
  transports: ["websocket"],
  timeout: 5000,
});
let messageId;

try {
  await Promise.all([connect(socket), connect(memberSocket)]);
  const joined = await emitAck(socket, "team.join", frontOfHouse.id);
  assert.equal(joined.joined, true, "Authorized team member should join the team room");
  const denied = await emitAck(memberSocket, "team.join", deli.id);
  assert.equal(denied.joined, false, "Nonmember must not join another team's room");

  const received = waitForEvent(socket, "message.created");
  const sent = await request(`/teams/${frontOfHouse.id}/messages`, {
    method: "POST",
    token: member.accessToken,
    body: { content: `Realtime test ${Date.now()}` },
  });
  messageId = sent.id;
  const [event] = await received;
  assert.equal(event.message.id, sent.id, "Broadcast message must match the persisted message");
  console.log("PASS: authorized team room receives persisted message; nonmember room join is denied.");
} finally {
  if (messageId) {
    await request(`/messages/${messageId}`, {
      method: "DELETE",
      token: admin.accessToken,
    });
  }
  socket.disconnect();
  memberSocket.disconnect();
}
