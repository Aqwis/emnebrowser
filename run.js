var fs = require('fs');
var express = require('express');
var querystring = require('querystring');
var r = require('rethinkdb');
var swig = require('swig');
var request = require('request');
var compression = require('compression');

var jsdom = require('jsdom');
var jquery = require('jquery');

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
    self = this;

    app.use(compression());

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
    app.delete('/1024/:username/:courseId', function(req, page) {
        var username = req.params.username;
        var courseId = req.params.courseId; // different from course code

        request.post("http://ntnu.1024.no/2015/spring/" + username + "/change/", {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring.stringify({
                course_remove: courseId,
                submit_remove: ""
            })
        }, function(err, response, body) {
            if (err || response.statusCode != 302) {
                page.status(500);
                page.send({ status: "failure" });
            } else {
                page.status(200);
                page.send({ status: "success" });
            }
        });
    });

    app.put('/1024/:username/:course', function(req, page) {
        var username = req.params.username;
        var course = req.params.course;
        
        request.post("http://ntnu.1024.no/2015/spring/" + username + "/change/", {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring.stringify({
                course_add: course,
                submit_add: ""
            })
        }, function(err, response, body) {
            if (err || response.statusCode != 302) {
                page.status(500);
                page.send({ status: "failure" });
            } else {
                page.status(200);
                page.send({ status: "success" });
            }
        });
    });

    app.get('/1024/:username', function(req, page) {
        var username = req.params.username;

        request.get("http://ntnu.1024.no/2015/spring/" + username, function(err, response, body) {
            if (err || response.statusCode != 200) {
                page.status(500);
                page.send({ status: "failure" });
            } else {
                var env = jsdom.env;
                
                env(body, function(errors, window) {
                    if (errors) {
                        page.status(500);
                        page.send({ status: "failure" });
                    } else {
                        var $ = jquery(window);
                        
                        var courses = $("table#courses tbody").children().map(function() {
                            return {
                                id: $(this).attr('class').split("-")[1],
                                code: $($(this).children()[0]).text().trim()
                            };
                        }).toArray();

                        page.status(200);
                        page.send({ status: "success", courses: courses });
                    }
                });
            }
        });
    });

    app.get('/api/', function(req, page) {
        var query = req.query;
        var orderBy = null;
        var results = 0;

        // We go through each entry in query and
        // filter for each entry
        var reql = r.db('ntnu_courses').table('courses');

        // In some cases, the required filtering is too complicated
        // to be done in-database.
        var postSelectFilters = [];

        Object.keys(query).forEach(function(key) {
            var type = query[key].type;
            var matching = query[key].matching;

            /* Convert value or value array elements to
            given type */
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

            /* We go through all the keys and filter
            the results for each of them. */
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
                var autumn = false;
                var spring = false
                var engValues = value.map(function(val) {
                    if (val == "Høst") {
                        autumn = true;
                    } else if (val == "Vår") {
                        spring = true;
                    }
                });
                if (autumn && !spring) {
                    reql = reql.filter(r.row("semester")("autumn"));
                } else if (!autumn && spring) {
                    reql = reql.filter(r.row("semester")("spring"));
                }
            } else if (key == "subjectArea") {
                reql = reql.filter(function(doc) {
                    return r.not(r.expr(value).setIntersection(doc("subjectArea")).isEmpty());
                });
            } else if (key == "studyLevelCode") {
                reql = reql.filter(function(doc) {
                    return r.expr(value).contains(doc("studyLevelCode"));
                });
            } else if (key == "credit") {
                reql = reql.filter(function(doc) {
                    return r.expr(value).contains(doc("credit"));
                });
            } else if (key == "mandatoryActivities") {
                reql = reql.filter(function(doc) {
                    return r.expr(value).contains(doc("mandatoryActivity")("text"));
                })
            } else if (key == "assessment") {
                reql = reql.filter(function(doc) {
                    return doc("assessment").contains(function(k) {
                        return r.expr(value).contains(k("short"));
                    });
                });
            } else if (key == "examSupportCode") {
                reql = reql.filter(function(doc) {
                    return r.expr(value).contains(doc("canonicalExaminationSupport"));
                });
            } else {
                console.log("No matching specified for key " + type + "! Skipping...");
            }
        });

        if (orderBy != null) {
            reql = reql.orderBy(orderBy);
        }

        reql = reql.limit(results);
        reql.run(connection, {durability: "soft", useOutdated: true}, function(err, c) {
            if (err) console.log(err);
            if (typeof(c) != "undefined") {
                c.toArray(function(err, result) {
                    // Finally, send the courses to the client
                    page.send(result);
                });
            }
        });
    });

    app.get('/', function(req, page) {
        page.render('index.html');
    });

    // Start the server
    app.listen(5002);
    console.log("Running...");
}

main();
