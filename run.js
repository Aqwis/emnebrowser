var fs = require('fs');
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

function saveListOfSubjectAreas(connection) {
    var reql = r.db('ntnu_courses').table('courses').pluck({subjectArea: {name: true}})("subjectArea").reduce(function(l, r) { return l.setUnion(r); })("name");
    reql.run(connection, {
        durability: "soft",
        useOutdated: true
    }, function(err, c) {
        if (err) console.log(err);
        c.toArray(function(err, result) {
            fs.writeFile("subject_areas", result, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("Saved.");
                }
            })
        });
    });
}

function main() {
    app.use(express.compress());

    app.engine('html', swig.renderFile);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');

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

            // Convert value or value array elements to
            // given type
            var value = query[key].value;
            if (!value) {
                return;
            } else if (value instanceof Array) {
                value = value.map(function(v) {
                    return stringToType(v, type);
                });
            } else {
                value = stringToType(value, type);
            }

            // Special keys
            if (key == "orderBy") {
                orderBy = value;
            } else if (key == "results") {
                if (Number(value) > 1000) {
                    results = 1000;
                } else {
                    results = Number(value);
                }
                return;
            } else if (key == "search") {
                reql = reql.filter(function(doc) {
                    return doc("name").match("(?i)" + value).or(doc("code").match("(?i)" + value))
                });
                return;
            } else if (key == "semester") {
                if (value == "Høst") {
                    var engVal = "Autumn"
                } else if (value == "Vår") {
                    var engVal = "Spring";
                }
                reql = reql.filter(function(doc) {
                    return doc("educationTerm").contains(function(k) {
                        return k("startTerm").eq(engVal);
                    });
                });
            } else if (key == "studyLevelCode") {
                reql = reql.filter(function(doc) {
                    return r.expr(value).contains(doc("studyLevelCode"));
                });
            } else if (key == "credit") {
                reql = reql.filter(function(doc) {
                    return r.expr(value).contains(doc("credit"));
                });
            } else if (key == "subjectArea") {
                reql = reql.filter(function(doc) {
                    return doc("subjectArea").contains(function(k) {
                        return r.expr(value).contains(k("name"));
                    });
                });
            } else {
                console.log("No matching specified for key " + type + "! Skipping...");
            }

            // Normal case -- for when the key is a field
            // on the course objects

        });

        if (orderBy != null) {
            reql = reql.orderBy(orderBy);
        }

        reql = reql.limit(results);
        reql.run(connection, {durability: "soft", useOutdated: true}, function(err, c) {
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
