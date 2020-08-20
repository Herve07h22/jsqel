const jsqel = require("../index");
const databaseUri = process.env.DATABASE_URI;
const testTable = process.env.TEST_TABLE;

const hello = {
  name: "hello",
  sql: `SELECT * FROM ${testTable};`,
  restricted: ["Public"],
};

const app = jsqel({
  dbUri: databaseUri,
  secret: "anysecretkeyyouwant",
  debug: true,
  apiUrlBase: "",
});

app.register((namespace = "test"), [hello]);
app.run(5000);
