import Koa from "koa";
import { createClient } from "redis";
import { getStatus } from "http-response-text";

const dbUrl = "redis://localhost:6379";

// Languages supported by http-response-text, anything else falls back to English
const languages = ["en", "zh", "ja"];

const detectLanguage = () => {
  const locale =
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    Intl.DateTimeFormat().resolvedOptions().locale;
  const language = locale.split(/[-_.]/)[0].toLowerCase();

  return languages.find((item) => item === language) ?? "en";
};

const language = detectLanguage();

const initDB = async (url = process.env.REDIS_URL ?? dbUrl) => {
  const client = createClient({ url });

  try {
    await client.connect();

    const connected = await getStatus(200, language);
    console.log(`Connect (${connected.code} ${connected.message}) => ${url}`);

    return client;
  } catch (error) {
    const failure = await getStatus(500, language);
    console.error(
      `Connect (${failure.code} ${failure.message}) => ${url}`,
      error,
    );
  }
};

const app = new Koa();

const client = await initDB();
app.context.db = client;

app.use(async (ctx) => {
  const keyName = "sample-key:lastRequestedAt";
  const keyValue = Date.now();

  await ctx.db.set(keyName, keyValue);
  const created = await getStatus(201, language);
  console.log(`Set (${created.code} ${created.message}) =>`, {
    key: keyName,
    value: keyValue,
  });

  const value = await ctx.db.get(keyName);
  const found = await getStatus(value === null ? 404 : 200, language);
  console.log(`Get (${found.code} ${found.message}) =>`, {
    key: keyName,
    value,
  });

  ctx.body = { key: keyName, value };
});

app.listen(3000);
