var http = require('http');
var fs = require('fs');

function retrieveCourses() {
    getCourseDict(function(courseDict) {
        getAllCourses(courseDict);
    });
}

function getCourseDict(callback) {
    var coursesRaw = "";
    var courseDict = {}

    http.get("http://www.ime.ntnu.no/api/course/-", function(res) {
        res.setEncoding('utf8');
        res.on('data', function(data) {
            coursesRaw += data;
        }).on('end', function() {
            courseDict = JSON.parse(coursesRaw);
            fs.writeFile('ntnu_course_list.json', coursesRaw, function(err) {
                if(err) {
                    throw err;
                }
            });
            callback(courseDict);
        });
    });
}

function getAllCourses(courseDict) {
    var courseCodeList = [];
    var i = 0;

    courseDict.course.forEach(function(course) {
        course.code = course.code.replace('/', ''); // sanitize course codes
        if (fs.existsSync('../courses/' + course.code + ".json")) {
            console.log(course.code + " already fetched!");
            return;
        }
        setTimeout(function() {
            console.log(course);
            courseCodeList.push(course.code);
            getAndSaveCourseInfo(course.code);
        }, 500*i);
        i++;
    });
}

function getAndSaveCourseInfo(courseCode) {
    var courseDataRaw = "";

    console.log("Fetching " + courseCode + "...")

    http.get("http://www.ime.ntnu.no/api/course/" + courseCode, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(data) {
            courseDataRaw += data;
        }).on('end', function() {
            fs.writeFile('../courses/' + courseCode + ".json", courseDataRaw, function(err) {
                if (err) {
                    throw err;
                }
                console.log("Fetched " + courseCode + "!");
            });
        });
    });
}

main();
