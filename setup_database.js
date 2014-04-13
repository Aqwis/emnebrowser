var r = require('rethinkdb');
var fs = require('fs');
var async = require('async');

function main() {
    async.waterfall([
        connectToServer,
        createDatabase,
        createTable,
        insertCourseData
    ]);
}

function handleError(err, msg) {
    if (err) {
        if (err.name === "RqlRuntimeError") {
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
    r.dbCreate("ntnu_courses").run(connection, function(err, res) {
        handleError(err, "Could not create database! Database may already exist.");
        console.log("Created database...");
        callback(null, connection);
    });
}

function createTable(connection, callback) {
    // Create table
    r.db("ntnu_courses").tableCreate("courses", {primaryKey: "code"}).run(connection, function(err, res) {
        handleError(err, "Could not create table! Table may already exist.");
        console.log("Created table...");
        callback(null, connection);
    });
}

function insertCourseData(connection, callback) {
    // Insert course data into database
    var json = null;
    var filenames = fs.readdirSync('courses/');
    filenames.forEach(function (filename) {
        try {
            json = require('./courses/' + filename);
        } catch (err) {
            console.log("Could not open " + filename + "!");
            return;
        }
        r.db("ntnu_courses").table("courses").insert(json.course, {upsert: true}).run(connection, function(err, res) {
            if (err) {
                console.log(err);
            }
            //console.log("Created table for " + filename + "...");
        });
    });
    callback(null, "finished");
}

main();
