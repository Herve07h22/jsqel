// APIs for react-admin provider 

const checkAscOrDesc = value => value && ['ASC', 'DESC'].includes(value) ? ({success: true, value}) : ({success: false, message: "asc_or_desc should be ASC or DESC" })
const checkNonEmptyString = message => value => !isNaN(value) || (value && value.length) ? ({success: true, value}) : ({success: false, message: message })
const checkValidInterger = message => value => !isNaN(value) ? ({success: true, value}) : ({success: false, message: message })
const checkIsArray = message => value => Array.isArray(value) ? ({success: true, value}) : ({success: false, message: message })

const get_list_with_filter = {
    name : 'get_list_with_filter',
    sql : 'SELECT * FROM ${table:name} WHERE ALL_FILTERS ORDER BY ${filter_sort:name} ${asc_or_desc:value} LIMIT ${perPage} OFFSET ${page};',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        asc_or_desc : checkAscOrDesc ,
        table       : checkNonEmptyString("table cannot be empty"),
        filter      : value => value ? ({success: true, value}) : ({success: false, message: "filter should be a valid object" }),
        filter_sort : checkNonEmptyString("filter_sort cannot be empty"),
        perPage     : checkValidInterger("perPage should be a valid integer"),
        page        : checkValidInterger("page should be a valid integer"),
    },
    beforeQuery : (query, params ) => Object.assign( {}, params, params.filter ),
    alterQuery : (query, params) => {
        const props = Object.keys(params.filter)
        const formattedSet = props.map( (m,i) =>  m.startsWith('_') ? m.slice(1) + ' LIKE ${' + m + '}' : m+'=${' + m + '}'   ) // creating the formatting parameters; 
        const joinedSet = formattedSet.join(' AND ')
        return query.sql.replace('ALL_FILTERS', joinedSet)
    }
}

const count_list_with_filter = {
    name : 'count_list_with_filter',
    sql : 'SELECT COUNT(id) as total FROM ${table:name} WHERE ALL_FILTERS ;',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        asc_or_desc : checkAscOrDesc ,
        table       : checkNonEmptyString("table cannot be empty"),
        filter      : value => value ? ({success: true, value}) : ({success: false, message: "filter should be a valid object" }),
        filter_sort : checkNonEmptyString("filter_sort cannot be empty"),
    },
    beforeQuery : (query, params ) => Object.assign( {}, params, params.filter ),
    alterQuery : (query, params) => {
        const props = Object.keys(params.filter)
        const formattedSet = props.map( (m,i) =>  m.startsWith('_') ? m.slice(1) + ' LIKE ${' + m + '}' : m+'=${' + m + '}'   ) // creating the formatting parameters; 
        const joinedSet = formattedSet.join(' AND ')
        return query.sql.replace('ALL_FILTERS', joinedSet)
    }
}

const get_list = {
    name : 'get_list',
    sql : 'SELECT * FROM ${table:name} ORDER BY ${filter_sort:name} ${asc_or_desc:value} LIMIT ${perPage} OFFSET ${page};',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        asc_or_desc : checkAscOrDesc ,
        table       : checkNonEmptyString("table cannot be empty"),
        filter_sort : checkNonEmptyString("filter_sort cannot be empty"),
        perPage     : checkValidInterger("perPage should be a valid integer"),
        page        : checkValidInterger("page should be a valid integer"),
    },
}

const count_list = {
    name : 'count_list',
    sql : 'SELECT COUNT(id) as total FROM ${table:name}',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table       : checkNonEmptyString("table cannot be empty"),
    },
}

const get_one = {
    name : 'get_one',
    sql : 'SELECT * FROM ${table:name} WHERE ${filter_field:name} = ${filter} LIMIT 1 ;',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table       : checkNonEmptyString("table cannot be empty"),
        filter_field : checkNonEmptyString("filter_field cannot be empty"),
        filter      : checkNonEmptyString("filter cannot be empty"),
    },
}

const get_many = {
    name : 'get_many',
    sql : 'SELECT * FROM ${table:name} WHERE ${filter_field:name} IN ( ${filter:csv} ) ;',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table       : checkNonEmptyString("table cannot be empty"),
        filter_field : checkNonEmptyString("filter_field cannot be empty"),
        filter      : checkIsArray("filter should be an array"),
    },
}


const create = {
    name : 'create',
    sql : 'INSERT INTO ${table:name} ( ${data:name} ) VALUES ( ${data:csv} ) RETURNING *;',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table   : checkNonEmptyString("table cannot be empty"),
        data    : value => value ? ({success: true, value}) : ({success: false, message: "data should be a valid object" })
    },
}


const update_one = {
    name : 'update_one',
    sql : 'UPDATE  ${table:name} SET ALL_DATA WHERE ${filter_field:name} = ${filter} RETURNING *;',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table   : checkNonEmptyString("table cannot be empty"),
        data    : value => value ? ({success: true, value}) : ({success: false, message: "data should be a valid object" }),
        filter_field : checkNonEmptyString("filter_field cannot be empty"),
        filter      : checkNonEmptyString("filter cannot be empty"),
    },
    beforeQuery : (query, params ) => Object.assign( {}, params, params.data ),
    alterQuery : (query, params) => {
        const props = Object.keys(params.data)
        const formattedSet = props.map( m => m + '=${' + m + '}' ) // creating the formatting parameters;
        return query.sql.replace('ALL_DATA', formattedSet)
    }
}

const delete_one = {
    name : 'delete_one',
    sql : 'DELETE FROM ${table:name} WHERE ${filter_field:name} = ${filter} RETURNING *;',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table       : checkNonEmptyString("table cannot be empty"),
        filter_field : checkNonEmptyString("filter_field cannot be empty"),
        filter      : checkNonEmptyString("filter cannot be empty"),
    },
}

const delete_many = {
    name : 'delete_many',
    sql : 'DELETE FROM ${table:name} WHERE ${filter_field:name} IN ( ${filter:csv} ) RETURNING *;',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table       : checkNonEmptyString("table cannot be empty"),
        filter_field : checkNonEmptyString("filter_field cannot be empty"),
        filter      : checkIsArray("filter should be an array"),
    },
}

const get_reference_with_filter = {
    name : 'get_reference_with_filter',
    sql : 'SELECT * FROM ${table:name} WHERE ALL_FILTERS AND ${target:name}={target_id} ORDER BY ${filter_sort:name} ${asc_or_desc:value} LIMIT ${perPage} OFFSET ${page};',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        asc_or_desc : checkAscOrDesc ,
        table       : checkNonEmptyString("table cannot be empty"),
        filter      : value => value ? ({success: true, value}) : ({success: false, message: "filter should be a valid object" }),
        target      : checkNonEmptyString("target cannot be empty"),
        target_id   : checkNonEmptyString("target_id cannot be empty"),
        filter_sort : checkNonEmptyString("filter_sort cannot be empty"),
        perPage     : checkValidInterger("perPage should be a valid integer"),
        page        : checkValidInterger("page should be a valid integer"),
    },
    beforeQuery : (query, params ) => Object.assign( {}, params, params.filter ),
    alterQuery : (query, params) => {
        const props = Object.keys(params.filter)
        const formattedSet = props.map( (m,i) => m + '=${' + m + '}') // creating the formatting parameters; 
        const joinedSet = formattedSet.join(' AND ')
        return query.sql.replace('ALL_FILTERS', joinedSet)
    }
}

const get_reference = {
    name : 'get_reference',
    sql : 'SELECT * FROM ${table:name} WHERE ${target:name}=${target_id} LIMIT ${perPage} OFFSET ${page};',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table       : checkNonEmptyString("table cannot be empty"),
        target      : checkNonEmptyString("target cannot be empty"),
        target_id   : checkNonEmptyString("target_id cannot be empty"),
        perPage     : checkValidInterger("perPage should be a valid integer"),
        page        : checkValidInterger("page should be a valid integer"),
    },
}

const count_reference = {
    name : 'count_reference',
    sql : 'SELECT COUNT(id) as total FROM ${table:name} WHERE ${target:name}=${target_id};',
    restricted : ['Admin'],    // Mind the Capital
    params : {
        table       : checkNonEmptyString("table cannot be empty"),
        target      : checkNonEmptyString("target cannot be empty"),
        target_id   : checkNonEmptyString("target_id cannot be empty"),
    },
}

module.exports = { queries : [ get_list_with_filter, get_list, get_one, create, update_one, delete_one, get_reference_with_filter, get_reference, count_list_with_filter, count_list, get_many, delete_many, count_reference ]}