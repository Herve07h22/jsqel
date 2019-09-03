const sqlite3 = require('sqlite3').verbose()
const pgp = require('pg-promise')()

var fs = require("fs")

var sqliteConnexion = null
var pgConnexion     = null

const connect = (uri='', debug=false) => {
    // SQLite3 or Postgres ?
    if (uri && uri.slice(0,9)==='sqlite://') {
        console.log("Creating SQLite3 connexion :", uri.slice(9))
        sqliteConnexion = new sqlite3.Database(uri.slice(9))
        console.log("Connexion OK :", sqliteConnexion)
    }

    if (uri && uri.slice(0,13)==='postgresql://') {
        console.log("Creating Postgresql connexion :", uri.slice(13))
        // Connection string should be like : postgres://john:pass123@localhost:5432/products
        pgConnexion = pgp(uri);
    }

}

const getDbConnexion = () => pgConnexion ? pgConnexion : sqliteConnexion

const close = () => {
    if (sqliteConnexion) sqliteConnexion.close()
}

const isEmpty = val => (val === undefined ) ? true : false // null or zero may be relevant

const paramsReducer = ( query, params={} ) => {
    // Remove unnecessary params
    console.log("Reducing params :", params)
    var reducedParams = {}
    const listeOfParameters = query.match(/\$\{(\w+)(:name)?(:csv)?(:value)?\}/g)
    console.log("listeOfParameters :", listeOfParameters)
    if (listeOfParameters && listeOfParameters.length) {
        let expectedParams = listeOfParameters.map( p => p.slice(2, -1).replace(':name','').replace(':csv','').replace(':value','') )
        console.log("expectedParams :", expectedParams)
        reducedParams = expectedParams.reduce( (acc, val) => isEmpty(params[val]) ? acc : Object.assign(acc, {[val]:params[val]}) , {} )
    }
    console.log("reducedParams :", reducedParams)
    return reducedParams
}

const executeQuery = (query, params={} ) => {
    console.log("Executing :", query, params)
    try {
        const reducedParams = paramsReducer(query, params)

        if (sqliteConnexion) {
            // SQLite named parameters : SELECT * FROM my_table WHERE id=$param 
            // Replace ${xxx} by $xxx
            let queryClone  = query.slice(0)
            var listeOfParameters = query.match(/\$\{(\w+)\}/g)
            if (listeOfParameters) {
                queryClone  = listeOfParameters.reduce( (acc, val) => acc.replace(val, '$'+val.slice(2, -1)), queryClone)
            }
            // Replace xxx by $xxx
            let paramsClone = Object.entries(reducedParams).reduce((acc, val) => Object.assign(acc, { ['$'+val[0]]: val[1] }), {} )

            console.log("Executing modified query :", queryClone, paramsClone) 
            return new Promise( (resolve, reject) => sqliteConnexion.all(queryClone, paramsClone, (err,rows) => err ? reject(err) : resolve(rows)) )
        }

        // pg-promise PostGresql named parameters : SELECT * FROM my_table WHERE id=${param} and num=${num} ORDER BY num
        if (pgConnexion) {
            console.log("Executing query :", query, reducedParams)
            // Encapsulate the query in a transaction.
            return pgConnexion.tx(t => t.any( query, reducedParams))
        }
        return new Promise( (resolve, reject) => reject(`The query ${query} cannot be executed because there is no db connection available`) )
    }
    catch (e) {
        console.log(e)
        return new Promise( (resolve, reject) => reject(`The query ${query} cannot be executed`) )
    }
}

const migrate = name => {
    if (!name) return new Promise( (resolve, reject) => resolve() )

    console.log('Migrating : ', name)

    return new Promise( (resolve, reject) => {
        fs.readFile(name, (err, buf) => {
            if (err) {
                console.log("Error reading file ", name)
                reject(err)
            }
            else {
                if (sqliteConnexion) return sqliteConnexion.exec( buf.toString() , err => err ? reject(err) : resolve() )
                if (pgConnexion) return pgConnexion.result(buf.toString()).then( result => resolve(result) ).catch( error => reject(error))
            }
        })
    })
}

module.exports = { connect, close, migrate, executeQuery, getDbConnexion }

