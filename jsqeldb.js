const pgp = require("pg-promise")();

var fs = require("fs");
const { exit } = require("process");

var pgConnexion = null;
var dbLogger = console.log;

const connect = (uri = "", debug = false) => {
  dbLogger = debug ? console.log : () => null;

  if (uri && uri.slice(0, 13) === "postgresql://") {
    dbLogger("Creating Postgresql connexion :", uri.slice(13));
    // Connection string should be like : postgres://john:pass123@localhost:5432/products
    pgConnexion = pgp(uri);
    // Try to connect to check this is a valid connection string
    pgConnexion
      .connect()
      .then((obj) => {
        // Can check the server version here
        const serverVersion = obj.client.serverVersion;
        dbLogger("Using pg-promise version ", serverVersion);
        obj.done();
      })
      .catch((error) => {
        dbLogger("Database connexion error :", error.message || error);
        dbLogger("Fatal error. Exiting...");
        exit(-1);
      });
  } else {
    throw new Error("This does not look like a valid Postgresql URI :", uri);
  }
};

const getDbConnexion = () => pgConnexion;

const isEmpty = (val) => (val === undefined ? true : false); // null or zero may be relevant

const paramsReducer = (query, params = {}) => {
  // Remove unnecessary params
  dbLogger("Reducing params :", params);
  var reducedParams = {};
  const listeOfParameters = query.match(/\$\{(\w+)(:name)?(:csv)?(:value)?(:json)?\}/g);
  dbLogger("listeOfParameters :", listeOfParameters);
  if (listeOfParameters && listeOfParameters.length) {
    let expectedParams = listeOfParameters.map((p) =>
      p.slice(2, -1).replace(":name", "").replace(":csv", "").replace(":value", "").replace(":json", "")
    );
    dbLogger("expectedParams :", expectedParams);
    reducedParams = expectedParams.reduce(
      (acc, val) => (isEmpty(params[val]) ? acc : Object.assign(acc, { [val]: params[val] })),
      {}
    );
  }
  dbLogger("reducedParams :", reducedParams);
  return reducedParams;
};

const executeQuery = (query, params = {}) => {
  dbLogger("Executing :", query, params);
  try {
    const reducedParams = paramsReducer(query, params);

    // pg-promise PostGresql named parameters : SELECT * FROM my_table WHERE id=${param} and num=${num} ORDER BY num
    if (pgConnexion) {
      dbLogger("Executing query :", query, reducedParams);
      // Encapsulate the query in a transaction.
      return pgConnexion.tx((t) => t.any(query, reducedParams));
    }
    return new Promise((resolve, reject) =>
      reject(`The query ${query} cannot be executed because there is no db connection available`)
    );
  } catch (e) {
    dbLogger(e);
    return new Promise((resolve, reject) => reject(`The query ${query} cannot be executed`));
  }
};

const migrate = (name) => {
  if (!name) return new Promise((resolve, reject) => resolve());

  dbLogger("Migrating : ", name);

  return new Promise((resolve, reject) => {
    fs.readFile(name, (err, buf) => {
      if (err) {
        dbLogger("Error reading file ", name);
        reject(err);
      } else {
        if (pgConnexion)
          return pgConnexion
            .result(buf.toString())
            .then((result) => resolve(result))
            .catch((error) => reject(error));
      }
    });
  });
};

module.exports = { connect, migrate, executeQuery, getDbConnexion };
