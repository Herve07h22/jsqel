# Build webapps with Jsqel

Jsqel is a lightweight framework that helps you to build APIs connected to a postegresql database.

## Why Jsqel ?

As a [full-stack freelance developer](https://camilab.co), I code webapps for companies : CRM, ERP, B2B e-commerce, automation, ... My favourite stack to build them is NodeJS / Express / postgresql for the back-end, and React for the front-end.

There are [many nodeJS frameworks](https://expressjs.com/en/resources/frameworks.html) : FeatherJS, Sails, LoopBack, NestJS, ...
It is hard to choose the one that fit all our projects, and it is usually painfull to work with several frameworks beacause of their learning curve.

And I don't like ORMs. I think they turn the databases engines into powerless softwares. I prefer to take advantages of the amazing built-in features of Postgresql, rather than encapulating them in an ORM.

I've searched a lightweight Express framework, that could simply expose API endpoints based on SQL queries. I did not find it.

## Jsqel in a nutshell

To create an API that returns the results of a SQL query, just write this :

```javascript
const hello = {
    name : 'hello',
    sql : 'SELECT * FROM Users',
    restricted : ['Public'],
}
```

Register your query and launch your server :
```javascript
const app = jsqel({ dbUri : 'postgresql://user:pwd@postgresql.host.com:5432/db_name',
                    secret :'anysecretkeyyouwant',
                    debug  : process.env.NODE_ENV !== 'production',
                    staticPath : '../frontend/build',
                    apiUrlBase : ''
                })
app.register(namespace="test", [hello])
app.run(5000)
// Now API is available at : http://localhost:5000/test/hello
```

## Modules and namespace

TODO

## Parameters validation

TODO

## HTTP POST only

An API endpoint made with Jsqel accepts only POST reques, with :
- An authorization header "Bearer : token"
- A json body containing parameters

## Hooks

You can add hooks functions to a query :
- *beforeQuery* : to pre-process the parameters and returns a new set of parameters
- *alterQuery* :  to compute a new query
- *afterQuery* : to post-process the results and returns a new set of results

Theses hooks must be pure functions without side-effects nor mutations.

## Authentication

Each query that is restricted to an authenticated role has 2 additionnal parameters injected by Jsqel : 
- user_id
- role
You can use theses parameters in your query.

```javascript
const private_hello = {
    name : 'private_hello',
    sql : "SELECT * FROM Hello where (user_id=${user_id} or ${role}='Admin') and message like ${filter}", // Auto inject user_id and role
    restricted : ['Member', 'Admin'], // private query, request need authentication bearer
    params : {
        filter  : value => ({success: true, value }) ,
        user_id : value => ({success: true, value }) ,  // Injected paramter for an authenticated query (which does not contains 'Public' in restricted)
        role    : value => ({success: true, value }) ,  // Injected paramter for an authenticated query (which does not contains 'Public' in restricted)
    },
    beforeQuery : (query, params) => { console.log('Filter : ', params.filter); return params; },
    afterQuery  : (query, params, results) => { console.log("Got the result !"); return results; }, 
}
```

## Direct routes

Sometimes you need to implement something different from a SQL query. An upload controller for example. 
In this case, you can configure a diret route :
```javascript
// Adding upload route
const directRoute = (app, namespace, apiUrlBase) => {
    console.log('Registering direct route : ', apiUrlBase + '/' + namespace + '/upload')
    app.post(apiUrlBase + '/' + namespace + '/upload', (req, res, next) => {
        // Credentials are injected in req.paramsWithCredentials if needed
        console.log('directRoute with credentials :', req.paramsWithCredentials)
        res.send("This is my response")
        })
}

const direct = {
  name : 'direct',
  route : directRoute,
  restricted : ['Admin'],    // Mind the Capital
}

module.exports = { queries :[ direct ] }
```

## Boilerplate

A full boilerplate is available [here](https://github.com/Herve07h22/jsqel_boilerplate), including :
- backend with auth and admin modules
- a sample front-end with react hook
- a react-admin back-office

