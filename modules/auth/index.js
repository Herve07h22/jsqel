
const EXPIRATION_IN_SECONDS = 3600  // 1 hour

const migrations = __dirname+'/migrations.sql'

const checkLength = errorMessage => value => value && value.length && value.length>4 ? ({success: true, value}) : ({success: false, message: errorMessage })

const signin = {
    name : 'signin',
    sql : 'INSERT INTO Users (username, password, role_id) VALUES (${username}, ${password}, (SELECT id FROM Roles where name=${role}) );',
    restricted : ['Public'],    // Mind the Capital
    params : {
        username : checkLength("username should be longer") ,
        password : checkLength("password should be longer") ,
        role     : value => value && ['Admin', 'Member'].includes(value) ? ({success: true, value}) : ({success: false, message: "role should be Admin or Member" }) ,
    },
    beforeQuery : (query, params, {encrypt} ) => Object.assign( {}, params, { password : encrypt(params.password) }) ,
}

const deleteUser = {
    name : 'delete_user',
    sql : 'DELETE FROM Users WHERE id=${id};',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        id : value => value && !isNaN(value) ? ({success: true, value}) : ({success: false, message: "id is not valid" }),
    },
}

const buildToken = (query, params, results, encrypt) => {
    if (results.length && results[0].user_id && results[0].username && results[0].role ) {
        // Build a token
        let decodedToken = Object.assign( {} , results[0], {exp : Date.now() + 1000 * EXPIRATION_IN_SECONDS})
        let data = Buffer.from(JSON.stringify(decodedToken)).toString("base64")
        let token = data + "." + encrypt(data)
        // Send back the token
       return {token, username:results[0].username, role:results[0].role}
    }
    // If the result contains a "status" filled, it will be used to built the response status
    return { status:401 }
}

const login = {
    name : 'login',
    sql : 'SELECT Users.id as user_id, Users.username as username, Roles.name as role FROM Users, Roles where username=${username} and password=${password} and Users.role_id = Roles.id;',
    restricted : ['Public'],    // Mind the Capital
    params : {
        username : checkLength("username should be longer") ,
        password : checkLength("password should be longer") ,
    },
    beforeQuery : (query, params, {encrypt}) => Object.assign( {}, params, { password : encrypt(params.password) }) ,
    afterQuery :  (query, params, results, {encrypt}) => buildToken(query, params, results, encrypt) ,
}

const islogged = {
    name : 'islogged',
    sql : 'SELECT Users.username as username, Roles.name as role FROM Users, Roles where user_id=${user_id};',
    restricted : ['Member', 'Admin'], 
    params : {
        user_id : value => ({success: true, value }) ,  // Injected parameter for an authenticated query
    },
    beforeQuery : (query, params) => params,
    afterQuery  : (query, params, results) => results , 
}


module.exports = { migrations, queries : [ signin, login, islogged, deleteUser ]}