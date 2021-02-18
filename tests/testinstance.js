const jsqel = require("../index");

var jsqelArgs = process.argv.slice(2);
if (jsqelArgs.length !== 2) {
  console.log(
    "Error : this test instance expect 2 parameters : the database URI and the name of a table."
  );
  console.log("Received :", jsqelArgs);
  throw new Error("Cannot start the test instance");
}
const databaseUri = jsqelArgs[0];
const testTable = jsqelArgs[1];

const hello = {
  name: "hello",
  sql: `SELECT * FROM ${testTable};`,
  restricted: ["Public"],
};

const hello_js = {
  name: "hello_js",
  sql: `SELECT 'Should be ignored;`,
  js: () => ({ success: true }),
  restricted: ["Public"],
};

const hello_parameter = {
  name: "hello_parameter",
  js: (parameters) => ({ success: true, results: parameters.test_id }),
  restricted: ["Public"],
  params: {
    test_id: (value) =>
      value
        ? { success: true, value }
        : { success: false, message: "test_id is missing or is zero" },
  },
};

const app = jsqel({
  dbUri: databaseUri,
  secret: "anysecretkeyyouwant",
  debug: true,
  apiUrlBase: "",
});

app.register((namespace = "test"), [hello, hello_js, hello_parameter]);
app.run(5000);
