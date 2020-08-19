Jsqel is a lightweight framework that helps you to build APIs connected to a postgresql database.

# Why Jsqel ?

As a [full-stack freelance developer](https://camilab.co), I code webapps for companies : CRM, ERP, B2B e-commerce, automation.

My favourite stack to build them is NodeJS / Express / postgresql for the back-end, and React for the front-end.

There are [many nodeJS frameworks](https://expressjs.com/en/resources/frameworks.html) : FeatherJS, Sails, LoopBack, NestJS, ...
It is hard to choose the one that fit all our projects, and it is usually painfull to work with several frameworks beacause of their learning curve.

And I don't like ORMs. **I think they turn the database engines into powerless softwares**. I prefer to take advantages of the amazing built-in features of Postgresql, rather than encapsulating them in an ORM.

I've searched a lightweight Express framework, that **simply exposes API endpoints based on parameterized SQL queries, with a build-in authentication process**. I did not find it. That's the reason why I made `jsqel`.

# Jsqel in a nutshell

You must have a Postgresl instance running. For this example, let's consider that your postgresql database schema has a `users` table.

Install jsqel :

```sh
yarn add jsqel
```

To create an API that returns the rows of `users`, just write an `index.js` file :

```javascript
const jsqel = require("jsqel");

// Declare an API 'hello' that returns the rows of the Users table
// with a 'Public' access (no login required)
const hello = {
  name: "hello",
  sql: "SELECT * FROM users;",
  restricted: ["Public"],
};

// Configure your database URI
const app = jsqel({
  dbUri: "postgresql://user:pwd@postgresqlhost:5432/mydatabase",
  secret: "anysecretkeyyouwant",
  debug: process.env.NODE_ENV !== "production",
  apiUrlBase: "",
});

app.register((namespace = "test"), [hello]);
app.run(5000);
```

Run `node index.js`.

Now the API is available at : http://localhost:5000/test/hello :

```sh
curl -X POST http://localhost:5000/test/hello
```

# Modules and namespace

Each route looks like :

```
https://<your host>/<apiUrlBase>/<namespace>/<api name>
```

- `<your host>` is the server that hosts the jsqel node process
- `<apiUrlBase>` is the additionnal prefix you set in the `jsqel` declaration
- `<namespace>` is the name you've passed in the `register` call
- `<api name>` is the name you've set in the `name` attribute of the api object.

To keep all you APIs well organized, you may :

- have 1 javascript file for all the APIs of 1 domain (or 1 SQL table)
- set the `apiUrlBase` according to the configuration of your `nginx.conf` file

Here is a sample :

```javascript
// File backend/endpoints/faqs.js
// Get the list of the faqs
const faqs = {
  name: "faqs",
  sql:
    "SELECT faqs.question, faqs.answer, category.label, category.id \
            FROM faqs,category \
            WHERE faqs.category_id=category.id ORDER by faqs.id ASC ;",
  restricted: ["Public"],
};

const categories = {
  name: "categories",
  sql: "SELECT label, id FROM category ORDER by id ASC ;",
  restricted: ["Public"],
};

module.exports = { queries: [faqs, categories] };
```

```javascript
// File backend/index.js
const jsqel = require("jsqel");
const dbUri = "postgresql://user:pwd@postgresqlhost:5432/mydatabase";

const app = jsqel({
  dbUri,
  secret: "anysecretkeyyouwant",
  debug: false,
  apiUrlBase: process.env.NODE_ENV === "production" ? "/api" : "",
});

const auth = require("jsqel/modules/auth");
const faqs = require("./endpoints/faqs");

const initBackend = async () => {
  // Init DB when backend is launched like : node index.js init
  if (process.argv.length === 3 && process.argv[2] === "init") {
    await app.migrate(__dirname + "/sql/schema.sql");
    await app.migrate(__dirname + "/sql/functions.sql");
    await app.migrate(__dirname + "/sql/triggers.sql");
  }

  // Migrate & register built-in modules
  await app.migrateAndRegister("auth", auth);

  // Migrate user-defined modules
  await app.migrateAndRegister("faqs", faqs);
};

// Build the endpoints then launch server
initBackend()
  .then(() => app.run())
  .catch((e) => console.log("Something went wrong : ", e));
```

# Parameters validation

Usually you want to pass some parameters to the SQL queries.
You also expect to prevent any SQL injection.

You can add a `params` object to the endpoint declaration. It contains the expected parameters by the API, and a function to validate them.

The validation function must look like :

```javascript
const validationFunction = value => { 
    if (everythingIsOkWith(value)) {
        return {success: true, value})
    } else {
        return {success: false, message: "Error" })
    }

}
```

Example :

```javascript
const check = {
  name: "check",
  sql: "SELECT * from users WHERE username=${username};",
  restricted: ["Admin"],
  params: {
    username: (value) =>
      value && value.length && value.length > 4
        ? { success: true, value }
        : { success: false, message: "username should be longer" },
  },
};
```

# HTTP POST only

An API endpoint made with Jsqel accepts **only POST requests**, with :

- An authorization header "Bearer : token"
- A json body containing parameters

This is not compliant with the REST architectural style. No GET, nor PATCH or DELETE. The idea is to have a simplified way of using the APIs in the front-end (see "Connect to front-end" below).

# Hooks

You can add hooks functions to a query :

- _beforeQuery_ : to pre-process the parameters and returns a new set of parameters
- _alterQuery_ : to compute a new query
- _afterQuery_ : to post-process the results and returns a new set of results

Theses hooks must be pure functions without side-effects nor mutations.

# Authentication

Each query that is restricted to an authenticated role has 2 additionnal parameters injected by Jsqel :

- user_id
- role

  You can use theses parameters in your query.

```javascript
const private_hello = {
  name: "private_hello",
  sql: "SELECT * FROM Hello where (user_id=${user_id} or ${role}='Admin') and message like ${filter}", // Auto inject user_id and role
  restricted: ["Member", "Admin"], // private query, request need authentication bearer
  params: {
    filter: (value) => ({ success: true, value }),
    user_id: (value) => ({ success: true, value }), // Injected paramter for an authenticated query (which does not contains 'Public' in restricted)
    role: (value) => ({ success: true, value }), // Injected paramter for an authenticated query (which does not contains 'Public' in restricted)
  },
  beforeQuery: (query, params) => {
    console.log("Filter : ", params.filter);
    return params;
  },
  afterQuery: (query, params, results) => {
    console.log("Got the result !");
    return results;
  },
};
```

Theses `user_id` and `role` are encoded and signed in the authentication token of the HTTP header.
You can use them to :

- restrict the API access. If the `restricted` array of the API description contains `['Admin']` , the API reject with a 401 code any request with a `role` that is not `Admin` in the token.
- add a WHERE CLAUSE or anything else in the query. You may want to return all the rows for an Admin profile, but only 1 row where the user id matches the `user_id` injected by Jsqel.

# Direct routes

Sometimes you need to implement something different from a SQL query. An upload controller for example.
In this case, you can configure a direct route :

```javascript
// Adding upload route
const directRoute = (app, namespace, apiUrlBase) => {
  console.log("Registering direct route : ", apiUrlBase + "/" + namespace + "/upload");
  app.post(apiUrlBase + "/" + namespace + "/upload", (req, res, next) => {
    // Credentials are injected in req.paramsWithCredentials if needed
    console.log("directRoute with credentials :", req.paramsWithCredentials);
    res.send("This is my response");
  });
};

const direct = {
  name: "direct",
  route: directRoute,
  restricted: ["Admin"], // Mind the Capital
};

module.exports = { queries: [direct] };
```

# Connect to front-end

In your React components, just use a custom hook to call you API :

```javascript
const [{ results, error, loading }, refresh] = useJsqel("test/hello", { sendItNow: true });
```

A full boilerplate is available [here](https://github.com/Herve07h22/jsqel_boilerplate), including :

- backend with auth and admin modules
- a sample front-end with react hook
- a react-admin back-office

# Contributions

Feel free to open issues and submit PR !
