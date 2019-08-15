
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const crypto = require('crypto')
const jsqeldb = require('./jsqeldb.js')

const app = express()
app.use(bodyParser.json())

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

var queriesStore = {}
var SECRET


const encrypt = text => {
    var hmac = crypto.createHmac('sha256', SECRET) // Single use
    return hmac.update(text).digest('hex')
}

const checkAuthorization = (query, params, headers ) => {
    if (query.restricted.includes("Public")) return [true, params]

    if (headers.authorization && headers.authorization.split(' ')[0] === 'Bearer') {
        console.log('Authorization : ', headers.authorization)

        let token = headers.authorization.split(' ')[1]
        console.log('token : ', token)

        let decodedToken = token && token.split('.')
        console.log('decodedToken : ', decodedToken)

        // First part is base64 encoded object, which is liable to be a fake one
        let decodedData = JSON.parse(Buffer.from(decodedToken[0], 'base64').toString('utf8')) 
        console.log('decodedData : ', decodedData)

        // So let's sign it and compare the result
        let signedData = encrypt(decodedToken[0])
        console.log('signedData : ', signedData)
        console.log('decodedToken[1] : ', decodedToken[1])

        if (signedData === decodedToken[1]) {
            // This is ok
            console.log('This is ok ')
            console.log('Expiration Checking:', decodedData.exp && Number(decodedData.exp) > Date.now())
            // Is the token still valid and provides an role granted to execute the query ?
            if (decodedData.exp && Number(decodedData.exp) > Date.now() && decodedData.role && query.restricted.includes(decodedData.role) ) {
                return [true, Object.assign({}, params, decodedData ) ]
            }
        }
    }
    return [false, {}]
}

const createApiRoute = (app, apiUrlBase) =>
    app.post(apiUrlBase+'/:namespace/:query',  async (req, res, next) => {
        try {
            // Look for query
            let query = queriesStore[req.params.namespace][req.params.query]
            if (!query) throw "This query does not exist"
            
            // Clone json body request containing parameters, because beforeQueryHook may add some parameters
            let params = Object.assign({}, req.body)
            
            console.log("Controller is processing :", query, params)
            
            // Check if restricted
            const [ authorized, paramsWithCredentials] = checkAuthorization(query, params, req.headers )
            console.log("Authorized ? :", authorized, paramsWithCredentials)

            if (authorized) {
                
                // Is it a direct route ?
                if (query.route) {
                    console.log("Processing direct route")
                    // Add credentials
                    req.paramsWithCredentials = paramsWithCredentials
                    return next()
                }

                // Execute validation tobuild an array like [ {success, key, value, message}, {success, key, value, message} ]
                console.log("query.params :", query.params)
                const paramsValidation = query.params ? Object.keys(query.params).map( key => Object.assign({},query.params[key](paramsWithCredentials[key]),{key}) ) : []
                console.log("paramsValidation :", paramsValidation)

                // If anything wrong, send an error
                const paramsErrors = paramsValidation.filter( result => result.success !== true  )
                if (paramsErrors && paramsErrors.length) {
                    console.log("paramsErrors :", paramsErrors)
                    res.status(400).json(paramsErrors)
                    return
                } else {
                    // update params with their validator function
                    const validatedParams = paramsValidation.reduce( (acc, val) => Object.assign({}, acc, { [val.key] : val.value } ) , {}  )
                    console.log("validatedParams :", validatedParams)

                    // Process params if there is any beforeQuery hook
                    const paramsProcessedByBeforeQuery = query.beforeQuery ? query.beforeQuery(query, validatedParams, { jsqeldb, encrypt }) : validatedParams
                    console.log("paramsProcessedByBeforeQuery :", paramsProcessedByBeforeQuery)

                    // Alter query if there is alterQuery hook
                    const sqlQuery = query.alterQuery ? query.alterQuery(query, validatedParams, { jsqeldb, encrypt }) : query.sql

                    // Compute the query
                    const queryResult = await jsqeldb.executeQuery(sqlQuery, paramsProcessedByBeforeQuery)
                    console.log("queryResult :", queryResult)

                    // Process results if there is any beforeQuery hook
                    const resultsProcessedByAfterQuery = query.afterQuery ? query.afterQuery(query, validatedParams, queryResult, { jsqeldb, encrypt }) : queryResult
                    console.log("resultsProcessedByAfterQuery :", resultsProcessedByAfterQuery)

                    // And send, taking an optional status in the results 
                    // If the query includes a template file : send the render. If not, send the json
                    if (query.template) {
                            res.setHeader('Content-Type', 'text/html');
                            res.status(resultsProcessedByAfterQuery.status || 200).render(query.template, resultsProcessedByAfterQuery)
                    } else res.status(resultsProcessedByAfterQuery.status || 200).json(resultsProcessedByAfterQuery)

                    return
                }
            }
            res.status(401).send('Unauthorized')
        }
        catch(error) {
            console.log(error)
            res.status(400).send(error)
        }
    })

// TODO : add a configuration object to queries
const registerQuery = (namespace, query) => {
    console.log("registering ", namespace, query.name) 
    if (!queriesStore[namespace]) queriesStore[namespace] = {}
    queriesStore[namespace][query.name] = Object.assign( {}, query)
    // Is it a direct route ?
    if (query.route) query.route(app)
}

module.exports = (dbUri , secret , debug, apiUrlBase='', staticPath = '') => {
    
    console.log('staticPath:', staticPath)
    if (Array.isArray(staticPath)) {
        staticPath.forEach( s => app.use(s.route, express.static(s.path)))
    } else {
        if (staticPath) app.use(staticPath.route || '/', express.static(staticPath.path))
    }

    SECRET = secret

    jsqeldb.connect(dbUri, debug)
    createApiRoute(app, apiUrlBase)

    return {
        encrypt : text => encrypt(text),
        migrate :  name => jsqeldb.migrate(name),
        register : (namespace, endpoints) => endpoints.forEach( e => registerQuery(namespace, e) ),
        migrateAndRegister : (namespace, { migrations, queries }) => jsqeldb.migrate(migrations).then(queries.forEach( e => registerQuery(namespace, e) ) ) ,
        run : (port=5000) => app.listen(port, () => console.log('Running on port :', port)),
     }

}


