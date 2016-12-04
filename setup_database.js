var r = require('rethinkdbdash')({
      pool: false,
      cursor: true
});
var fs = require('fs');
var async = require('async');

var ntnu = require('./logic/ntnu.js');
var uio = require('./logic/uio.js');

function main() {
    var arguments = process.argv;

    if (arguments.length < 4) {
        console.log('Not enough arguments! nodejs setup_database.js <university> <command>, where <command> may be\n   retrieve\n   insert');
        return;
    }

    var university = arguments[2];
    var command = arguments[3];

    var possible_commands = {
        "retrieve": retrieve,
        "insert": insert
    };

    var possible_universities = {
        "ntnu": ntnu.database_logic,
        "uio": uio.database_logic
    };

    if (!(command in possible_commands) || !(university in possible_universities)) {
        console.log('Invalid command or university.');
        return;
    }

    possible_commands[command](possible_universities[university]);
}

function retrieve(database_logic) {
    var logic = new database_logic();

    logic.retrieveCourses();
}

function insert(database_logic) {
    var logic = new database_logic();

    console.log(logic.prefix);

    async.waterfall([
        connectToServer,
        createDatabase,
        createTable.bind(undefined, logic.prefix),
        logic.insertCourseData.bind(logic)
    ], function(err, status) {
        console.log(status);
        process.exit();
    });
}

function handleError(err, msg) {
    if (err) {
        if (err.name === "ReqlOpFailedError") {
            console.log(msg);
        } else {
            throw err;
        }
    }
}

function connectToServer(callback) {
    // Connect to database server
    r.connect({host: 'localhost', port: 28015}, function(err, conn) {
        if (err) throw err;
        console.log("Connected to database server...");
        callback(null, conn);
    });
}

function createDatabase(connection, callback) {
    try {
        r.dbCreate("courses").run(connection, function(err, res) {
            if (!err) {
                console.log("Created database...");
            }
            callback(null, connection);
        });
    } catch (e) {
        handleError(err, "Could not create database! Database may already exist.");
        callback(null, connection);
    }
}

function createTable(prefix, connection, callback) {
    // Create table
    try {
        r.db("courses").tableCreate(prefix + "_courses", {primaryKey: "code"}).run(connection, function(err, res) {
            if (!err) {
                console.log("Created table...");
            }
            callback(null, connection);
        });
    } catch (e) {
        handleError(err, "Could not create table! Table may already exist.");
        callback(null, connection);
    }
}

function disconnectFromDatabase(connection, callback) {
    connection.close(function(err) {
        callback(true, 'Done.');
    });
}

main();
