var r = require('rethinkdb');

function main() {
    r.connect({host: 'localhost', port: 28015}, function(err, connection) {
        if (err) throw err;
        createIndices(connection);
    });
}

function createIndices(connection) {
	createIndex(connection, "credit");
	createIndex(connection, "name");
	//reql = reql.indexCreate("subjectArea", { multi: true });
	createFunctionIndex(connection, "autumn", function(doc) {
		return doc("semester")("autumn");
	});
	createFunctionIndex(connection, "spring", function(doc) {
		return doc("semester")("spring");
	});
}

function createIndex(connection, key) {
	var reql = r.db('ntnu_courses').table('courses');
	reql = reql.indexCreate(key);
	reql.run(connection, function(err, res) {
		console.log(err);
		console.log(res);
		console.log("Done.")
	});
}

function createFunctionIndex(connection, name, callback) {
	var reql = r.db('ntnu_courses').table('courses');
	reql = reql.indexCreate(name, callback);
	reql.run(connection, function(err, res) {
		console.log(err);
		console.log(res);
		console.log("Done.")
	});
}

main();