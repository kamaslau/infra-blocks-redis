import Koa from "koa";
import { createClient } from "redis";
import { getStatus, listLanguages } from "http-response-text";

const dbUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const port = Number(process.env.APP_PORT ?? 3000);

// Whatever the installed version ships, anything else falls back to English
const languages = await listLanguages();

const detectLanguage = () => {
  const locale =
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    Intl.DateTimeFormat().resolvedOptions().locale;
  const language = locale.split(/[-_.]/)[0].toLowerCase();

  return [...languages].find((item) => item === language) ?? "en";
};

const language = detectLanguage();

const report = async (code, label, payload) => {
  const { message } = await getStatus(code, language);
  const line = `${label} (${code} ${message})`;
  // AggregateError from the socket layer carries no message, only a code
  const detail =
    payload instanceof Error
      ? payload.message || payload.code || payload.name
      : payload;

  if (code < 400) console.log(line, detail ?? "");
  else console.error(line, detail ?? "");
};

const initDB = async (url) => {
  const client = createClient({
    url,
    socket: {
      // Unbounded retries leave connect() unsettled and the process logging forever
      reconnectStrategy: (retries) =>
        retries > 3 ? new Error(`redis unreachable: ${url}`) : 300,
    },
  });

  // Startup failures are reported by the caller; this covers a connection dropped later
  let ready = false;
  client.on("error", (error) => {
    if (ready) report(503, "Client", error);
  });

  await client.connect();
  await client.ping();
  ready = true;

  return client;
};

const app = new Koa();

let db;
try {
  db = await initDB(dbUrl);
  await report(200, "Connect", dbUrl);
} catch (error) {
  // No store, no demo: fail fast and let the supervisor restart us
  await report(503, "Connect", error);
  process.exit(1);
}

app.context.db = db;

app.use(async (ctx) => {
  const keyName = "sample-key:lastRequestedAt";
  const keyValue = Date.now();

  try {
    // Write
    await ctx.db.set(keyName, keyValue);
    await report(201, "Set", { key: keyName, value: keyValue });

    // Read
    const value = await ctx.db.get(keyName);
    await report(value === null ? 404 : 200, "Get", { key: keyName, value });

    ctx.body = { key: keyName, value };
  } catch (error) {
    // 503 while the client is not ready to talk, 500 when it refused the command
    ctx.status = ctx.db.isReady ? 500 : 503;
    ctx.body = { error: (await getStatus(ctx.status, language)).message };
    await report(ctx.status, "Read/Write", error);
  }
});

const server = app.listen(port, () =>
  report(200, "Listen", `http://127.0.0.1:${port}`),
);

server.on("error", async (error) => {
  // EADDRINUSE: another process already owns the port
  await report(error.code === "EADDRINUSE" ? 409 : 500, "Listen", error);
  process.exit(1);
});
