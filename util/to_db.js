#!/usr/bin/nodejs

var DATABASE = 'ntnufag';
var USERNAME = 'trygvwii';
var PASSWORD = 'egg123egg';

var cradle = require('cradle');
var db = new (cradle.Connection)('http://127.0.0.1', 6001, {
        auth: { username: USERNAME, password: PASSWORD }
        }).database(DATABASE);
var course_list = require('../course_list.json').course;

function main() {
    console.log("Inserting all courses into database " + DATABASE + "...");

    try {
        db.exists(function(err, exists) {
            if (err) {
                console.log("Error while checking if database " + DATABASE + " exists.");
                throw "Database error!";
            } else if (!exists) {
                console.log("Database " + DATABASE + " does not exist, creating...");
                db.create(insert);
            } else {
                insert();
            }
        });
    } catch (e) {
        console.log("Terminating.");
        return 1;
    }
}

function insert() {
    course_list.forEach(function(course) {
        course.code = course.code.replace('/', '');
        try {
            var course_json = require('../courses/' + course.code + ".json");
        } catch (e) {
            console.log("Could not open JSON file \"../courses/" + course.code + "\"!");
            return;
        }

        db.save(course.code, course_json, function(err, res) {
            if (err) {
                console.log("Error when saving JSON for " + course.code + " into the database!");
                console.log(err);
                return;
            }
        });
    });

    console.log("Finished.");
    return;
}

main();
