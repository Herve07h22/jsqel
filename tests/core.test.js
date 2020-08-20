// To run a container with a Postgresql DB :
// docker run --rm  --name pg-docker -e POSTGRES_PASSWORD=docker -d -p 5432:5432 postgres
// then export DATABASE_URI env variable :
// export DATABASE_URI=postgresql://postgres:docker@localhost:5432/postgres
// or (if you run this test inside a docker container)
// export DATABASE_URI=postgresql://postgres:docker@host.docker.internal:5432/postgres

const launchJsqelServer = async () => {
  const { spawn } = require("child_process");
  return new Promise((resolve, reject) => {
    const testinstance = spawn("node", ["./tests/testinstance.js"]);
    var curlInstance = null;
    var dataReturnedByJsqel = "";

    testinstance.on("close", (data) => {
      resolve(dataReturnedByJsqel);
    });

    testinstance.stdout.on("data", (data) => {
      console.log(`testinstance: ${data}`);
      if (!curlInstance) {
        curlInstance = spawn("curl", ["-X", "POST", "http://localhost:5000/test/hello"]);

        curlInstance.stdout.on("data", (data) => {
          dataReturnedByJsqel = data;
        });

        curlInstance.on("close", (code) => {
          testinstance.kill();
        });
      }
    });
  });
};

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

test("A basic API returns a correct answer", async () => {
  const dataReturnedByJsqel = await launchJsqelServer();
  expect(dataReturnedByJsqel.toString()).toMatch(/\[*\]/);
});
