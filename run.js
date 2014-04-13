var express = require('express');
var r = require('rethinkdb');
var swig = require('swig');
var app = express();

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
        var raw_queries = req.query;
        var queries = {};
        var sortby = null;

        var reql = r.db('ntnu_courses').table('courses');

        Object.keys(raw_queries).forEach(function(field) {
            /* All this is very ugly,
               fix it someday. */
            var value = raw_queries[field];
            var neq = false; // not equal to instead of equal to?
            if (value[0] === "!") {
                neq = true;
                value = value.slice(1);
            }
            if (field == "sortby") {
                sortby = raw_queries[field];
                return;
            }
            if (field.indexOf("@") != -1) {
                /* Arrays of objects:
                 {
                   one: [
                          {
                           field: value,
                           foo: bar
                          },
                          {
                           field: value2
                          }
                        ]
                 }
                */
                var split_field = field.split("@");
                console.log(split_field);
                console.log(value);
                reql = reql.filter(function(tb) {
                    return tb(split_field[0]).contains(function(k) {
                        var preliminary_expr = null;
                        if (field.indexOf("$") != -1) {
                            // If the field contains another object,
                            // we use double indexing
                            preliminary_expr = k(split_field[1].split("$")[0])(split_field[1].split("$")[1]);
                        } else if (split_field.length == 2) {
                            preliminary_expr = k(split_field[1]);
                        } else if (split_field.length == 3) {
                            // If the field is another array, we go
                            // another level down
                            return k(split_field[1]).contains(function(j) {
                                return j(split_field[2]).eq(value);
                            });
                        } else {
                            res.status(404);
                        }
                        if (neq) {
                            return preliminary_expr.ne(value);
                        } else {
                            return preliminary_expr.eq(value);
                        }
                    });
                });
                return;
            }
            if (!isNaN(value)) {
                queries[field] = Number(value);
            } else if (value == "true") {
                queries[field] = true;
            } else if (value == "false") {
                queries[field] = false;
            } else {
                queries[field] = value;
            }
        });

        console.log(queries);

        reql = reql.filter(queries).limit(50);
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
