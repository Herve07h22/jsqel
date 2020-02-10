const uuidv4 = require('uuid/v4')

const EXPIRATION_IN_SECONDS = 3600  // 1 hour

const migrations = __dirname+'/migrations.sql'

const checkLength = errorMessage => value => value && value.length && value.length>4 ? ({success: true, value}) : ({success: false, message: errorMessage })

// API to add new registered user. You should probably add some data.
// To register new Admin user : await app.jsqeldb.executeQuery("INSERT INTO users (id, username, password, role_id) VALUES ( ${id}, ${username}, ${password}, 2) ON CONFLICT DO NOTHING;", {id:uuidv4(), username:"Admin", password:app.encrypt("pwdpwd")} )
const signin = {
    name : 'signin',
    sql : "INSERT INTO Users (id, username, password, role_id) VALUES ( ${id}, ${username}, ${password}, (SELECT id FROM Roles where name='Member') );",
    restricted : ['Public'],    // Mind the Capital
    params : {
        username : checkLength("username should be longer") ,
        password : checkLength("password should be longer") ,
    },
    beforeQuery : (query, params, {encrypt} ) => Object.assign( {}, params, { password : encrypt(params.password), id:uuidv4() }) ,
}

const deleteUser = {
    name : 'delete_user',
    sql : 'DELETE FROM Users WHERE id=${id};',
    restricted : ['Admin'],    
    params : {
        id : checkLength("Invalid user id"),
    },
}

const listUsers = {
    name : 'list_users',
    sql : 'SELECT * FROM Users;',
    restricted : ['Admin'],    
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
    sql : 'SELECT Users.username as username, Roles.name as role FROM Users, Roles WHERE Users.role_id = Roles.id AND Users.id=${user_id};',
    restricted : ['Member', 'Admin'], 
    params : {
        user_id : value => ({success: true, value }) ,  // Injected parameter for an authenticated query
    },
}


module.exports = { migrations, queries : [ signin, login, islogged, deleteUser, listUsers ]}