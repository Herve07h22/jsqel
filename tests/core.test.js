// To run a container with a Postgresql DB :
// docker run --rm  --name pg-docker -e POSTGRES_PASSWORD=docker -d -p 5432:5432 postgres
// then export DATABASE_URI env variable :
// export DATABASE_URI=postgresql://postgres:docker@localhost:5432/postgres
// or (if you run this test inside a docker container)
// export DATABASE_URI=postgresql://postgres:docker@host.docker.internal:5432/postgres

// Test API server
const { spawn } = require("child_process");
var testinstanceIsready = false;
const testinstance = spawn("node", ["./tests/testinstance.js"]);
testinstance.stdout.on("data", (data) => {
  testinstanceIsready = true;
});
testinstance.stdout.on("close", (code, signal) => {
  testinstanceIsready = false;
});

// Client
const axios = require("axios");
const sendHttpPostRequestToJsqel = async (endpoint = "hello", parameters) => {
  //await waitForTestInstance();
  return axios
    .post(`http://localhost:5000/test/${endpoint}`, parameters)
    .then(function (response) {
      return response.data;
    })
    .catch(function (error) {
      if (error.response && error.response.data && error.response.data.detail) return error.response.data.detail;
      if (error.response && error.response.data && typeof error.response.data === "string") return error.response.data;
      if (error.response && error.response.data && Array.isArray(error.response.data) && error.response.data.length)
        return error.response.data[0];
      return error.message;
    });
};

// Launch the server before the tests, and shut it down after
const waitForTestInstanceToBe = (expectedState) =>
  new Promise((resolve, reject) => {
    if (testinstanceIsready === expectedState) {
      resolve();
    } else {
      setTimeout(
        () =>
          testinstanceIsready === expectedState
            ? resolve()
            : reject(
                `Cannot reach the expected state ${expectedState} for the test instance in less than 2 sec (still ${testinstanceIsready} )`
              ),
        2000
      );
    }
  });

beforeAll(() => {
  console.log("Waiting for instance");
  return waitForTestInstanceToBe(true);
});

afterAll(() => {
  console.log("Killing test instance");
  testinstance.kill();
  return waitForTestInstanceToBe(false);
});

test("DATABASE_URI env variable is set", () => {
  const databaseUri = process.env.DATABASE_URI || "not set";
  expect(databaseUri).not.toBe("not set");
  const databaseUriStartsWithPostgresql = databaseUri.startsWith("postgresql://");
  expect(databaseUriStartsWithPostgresql).toBe(true);
});

test("TEST_TABLE env variable is set", () => {
  const testTable = process.env.TEST_TABLE || "not set";
  expect(testTable).not.toBe("not set");
});

test("A postgresql database is available and contains a table $TEST_TABLE", async () => {
  const pgp = require("pg-promise")();
  const db = pgp(process.env.DATABASE_URI);
  const tables = await db.any(
    "SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'"
  );
  expect(tables).not.toBe(null);
  expect(tables.length).toBeGreaterThan(0);
  expect(tables.map((table) => table.tablename).includes(process.env.TEST_TABLE)).toBe(true);
});

test("A basic API with a SQL query returns a correct answer", async () => {
  // const dataReturnedByJsqel = await launchJsqelServer();
  const dataReturnedByJsqel = await sendHttpPostRequestToJsqel();
  expect(dataReturnedByJsqel.length).toBeGreaterThan(0);
});

test("A basic API with a JS function returns a correct answer", async () => {
  //const dataReturnedByJsqel = await launchJsqelServer("hello_js");
  const dataReturnedByJsqel = await sendHttpPostRequestToJsqel("hello_js");
  expect(dataReturnedByJsqel.success).toBe(true);
});

test("An API with a parameter returns an error if the parameter is missing", async () => {
  const dataReturnedByJsqel = await sendHttpPostRequestToJsqel("hello_parameter");
  expect(dataReturnedByJsqel.success).toBe(false);
  expect(dataReturnedByJsqel.message).toBe("test_id is missing or is zero");
});

test("An API with a parameter returns a correct answer if the parameter is OK", async () => {
  const dataReturnedByJsqel = await sendHttpPostRequestToJsqel("hello_parameter", { test_id: 12 });
  expect(dataReturnedByJsqel.success).toBe(true);
  expect(dataReturnedByJsqel.results).toBe(12);
});
