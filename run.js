var express = require('express');
var r = require('rethinkdb');
var swig = require('swig');
var app = express();

function stringToType(string, type) {
    if (type == "boolean") {
        if (string == "false" || string == "FALSE") {
            return false;
        } else {
            return true;
        }
    } else if (type == "number") {
        return Number(string);
    } else if (type == "string") {
        return string;
    } else {
        throw new Error("Incorrect type specified");
    }
}

function main() {
    app.engine('html', swig.renderFile);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');

    // Caching temporarily turned off
    app.set('view cache', false);
    swig.setDefaults({ cache: false });

    // Connect to database
    var connection = null;
    r.connect({host: 'localhost', port: 28015}, function(err, conn) {
        if (err) throw err;
        connection = conn;
    });

    // Static files
    app.use('/static', express.static(__dirname + '/static'));

    // Routing
    app.get('/api/', function(req, page) {
        var query = req.query;
        var orderBy = null;
        var results = 0;

        // We go through each entry in query and
        // filter for each entry
        var reql = r.db('ntnu_courses').table('courses');

        Object.keys(query).forEach(function(key) {
            var type = query[key].type;
            var matching = query[key].matching;
            var value = stringToType(query[key].value, type);
            if (!value) {
                return;
            }
            // Special cases
            if (key == "orderBy") {
                orderBy = value;
                return;
            }
            if (key == "results") {
                if (Number(value) > 1000) {
                    results = 1000;
                } else {
                    results = Number(value);
                }
                return;
            }
            if (key == "search") {
                reql = reql.filter(function(doc) {
                    return doc("name").match("(?i)" + value).or(doc("code").match("(?i)" + value))
                });
                return;
            }
            // Ordinary case handling -- for when the key is a field
            // on the course objects
            if (matching == "exact") {
                reql = reql.filter(r.row(key).eq(value));
            } else if (matching == "inexact") {
                reql = reql.filter(function(doc) {
                    return doc(key).match("(?i)" + value);
                });
            } else {
                console.log("No matching specified for key " + type + "! Skipping...");
                return;
            }
        });

        if (orderBy != null) {
            reql = reql.orderBy(orderBy);
        }

        reql = reql.limit(results);
        reql.run(connection, function(err, c) {
            if (err) console.log(err);
            c.toArray(function(err, result) {
                page.send(result);
            });
        });
    });

    app.get('/', function(req, page) {
        page.render('index.html');
    });

    // Start the server
    app.listen(5000);
    console.log("Running...");
}

main();
