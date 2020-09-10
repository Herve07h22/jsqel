// Test API server
const { spawn } = require("child_process");

const TEST_INSTANCE_NOT_STARTED = 0;
const TEST_INSTANCE_STARTED = 1;
const TEST_INSTANCE_TERMINATED = 2;

var testinstanceIsready = TEST_INSTANCE_NOT_STARTED;
var message = "";
const testinstance = spawn("node", [
  "./tests/testinstance.js",
  "postgresql://postgres:docker@localhost:5432/wrong",
  "TEST",
]);
testinstance.stdout.on("data", (data) => {
  testinstanceIsready = TEST_INSTANCE_STARTED;
  message += data;
});
testinstance.stdout.on("close", (code, signal) => {
  testinstanceIsready = TEST_INSTANCE_TERMINATED;
});

// Launch the server before the tests, and shut it down after
const waitForTestInstanceToBe = (expectedState) =>
  new Promise((resolve, reject) => {
    if (testinstanceIsready >= expectedState) {
      resolve();
    } else {
      setTimeout(
        () =>
          testinstanceIsready >= expectedState
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
  return waitForTestInstanceToBe(TEST_INSTANCE_STARTED);
});

afterAll(() => {
  console.log("Killing test instance");
  testinstance.kill();
  return waitForTestInstanceToBe(TEST_INSTANCE_TERMINATED);
});

test("DATABASE_URI env variable is set", () => {
  const databaseUri = process.env.DATABASE_URI || "not set";
  expect(databaseUri).not.toBe("not set");
  const databaseUriStartsWithPostgresql = databaseUri.startsWith("postgresql://");
  expect(databaseUriStartsWithPostgresql).toBe(true);
});

test("A wrong DATABASE_URI leads to a clear error message", () => {
  expect(message).toEqual(expect.stringContaining('Database connexion error : database "wrong" does not exist'));
});
