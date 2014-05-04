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

function arrayUnique(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

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

// 
// MUNGING
// 

function mungeLanguage(course) {
    if (course.taughtInEnglish) {
        return "Engelsk";
    } else {
        return "Norsk";
    }
}

function mungeLecturer(course) {
    var people = course.educationalRole;
    if (typeof(people) == "undefined") {
        return "?";
    }

    var coordinator = "";
    var names = [];
    people.forEach(function(person) {
        if (typeof(person.person) != "undefined") {
            if (person.code == "Coordinator") {
                coordinator = person.person.displayName;
            }
            names.push(person.person.displayName);
        }
    });

    names = arrayUnique(names);
    if (coordinator != "") {
        if (names.length > 1) {
            return coordinator + " m.fl.";
        } else {
            return coordinator;
        }
    } else if (names.length > 0) {
        if (names.length > 1) {
            return names[0] + " m.fl.";
        } else {
            return names[0];
        }
    } else {
        return "?";
    }
}

function mungeExamDate(course, semester) {
    var assessment = course.assessment;
    if (typeof(assessment) == "undefined") {
        return "-";
    }

    var dates = [];
    assessment.forEach(function(a) {
        if (typeof(a.date) != "undefined") {
            dates.push(a.date);
        }
    });

    if (dates.length > 1) {
        if (semester.autumn && !semester.spring) {
            return dates.filter(function(date) {
                var month_str = date.slice(5,7);
                var month = Number(month_str);
                if (month > 7) {
                    return true;
                } else {
                    return false;
                }
            })[0];
        } else if (semester.spring && !semester.autumn) {
            return dates.filter(function(date) {
                var month_str = date.slice(5,7);
                var month = Number(month_str);
                if (month <= 7) {
                    return true;
                } else {
                    return false;
                }
            })[0];
        } else {
            return "Flere";
        }
    } else if (dates.length == 1) {
        return dates[0];
    } else {
        return "";
    }
}

function mungeMandatoryActivity(course) {
    var mandatoryActivities = [];
    var mandatoryActivityText = "";
    var hasGradedProject = false;
    // Check if the grade is based on non-exam work
    if (typeof course.assessment != "undefined") {
        if (course.assessment[0].code != "S" && course.assessment[0].code != "M") {
            hasGradedProject = true;
        }
    }
    if (typeof course.mandatoryActivity != "undefined") {
        for (var i = 0; i < course.mandatoryActivity.length; i++) {
            mandatoryActivities.push(course.mandatoryActivity[i].name);
        }
        mandatoryActivities.sort()
    }
    if (mandatoryActivities.length === 0) {
        if (hasGradedProject) {
            mandatoryActivityText = "Kun tellende";
        } else {
            mandatoryActivityText = "";
        }
    } else {
        mandatoryActivityText = mandatoryActivities.join(", ");
    }

    if (mandatoryActivityText == "Kun tellende") {
        return {activities: "", text: "Kun tellende"};
    } else if (mandatoryActivityText == "") {
        return {activities: "", text: "Nei"};
    } else {
        return {activities: mandatoryActivityText, text: "Ja"};
    }
}

function mungeSemester(course) {
    var taughtInAutumn = false;
    var taughtInSpring = false;

    if (typeof(course.educationTerm) != "undefined") {
        course.educationTerm.forEach(function(val) {
            if (val.startTerm == "Autumn") {
                taughtInAutumn = true;
            } else if (val.startTerm == "Spring") {
                taughtInSpring = true;
            }
        });

        if (taughtInAutumn && taughtInSpring) {
            return {autumn: true, spring: true};
        } else if (taughtInAutumn) {
            return {autumn: true, spring: false};
        } else if (taughtInSpring) {
            return {autumn: false, spring: true};
        } else {
            return {autumn: false, spring: false}
        }
    } else {
        return {autumn: false, spring: false};
    }
}

function mungeSubjectArea(course) {
    if (typeof(course.subjectArea) != "undefined") {
        return course.subjectArea.map(function(a) {
            return a.name;
        });
    } else {
        return [];
    }
}

function mungeAssessment(course) {
    /*var assessment = {
        hasWrittenExam: false,
        hasOralExam: false,
        hasSemesterTest: false,
        hasGradedWork: false,
        hasThesis: false,
        hasOther: false,
        methods: []
    };*/

    assessment = [];

    if (typeof(course.assessment) == 'undefined') {
        return assessment;
    }

    course.assessment.forEach(function(a) {
        var shortname = "";
        if (a.assessmentFormCode == "S") {
            /*assessment.hasWrittenExam = true; // skriftlig eksamen*/
            shortname = "Skriftlig";
        } else if (a.assessmentFormCode == "M") {
            /*assessment.hasOralExam = true; // muntlig eksamen*/
            shortname = "Muntlig";
        } else if (a.assessmentFormCode == "H") {
            shortname = "Hjemmeeks."
        } else if (a.assessmentFormCode == "I") {
            /*assessment.hasSemesterTest = true; // semesterprøve*/
            shortname = "Semesterprøve";
        } else if (a.assessmentFormCode == "B" || a.assessmentFormCode == "Ø" || a.assessmentFormCode == "R" || a.assessmentFormCode == "O") {
            /*assessment.hasGradedWork = true; // arbeider*/
            shortname = "Arbeider";
        } else if (a.assessmentFormCode == "A") {
            /*assessment.hasThesis = true; // avhandling*/
            shortname = "Avhandling";
        } else {
            /*assessment.hasOther = true; // annet, f.eks. praksis*/
            shortname = "Annet";
        }

        if (typeof(a.examinationSupport) != "undefined") {
            var examinationSupport = a.examinationSupport[0].code
        } else {
            var examinationSupport = "";
        }

        assessment.push({
            long: a.assessmentFormDescription,
            short: shortname,
            support: examinationSupport
        });
    });

    return assessment;
}

function mungeCourse(course) {
    // Calculate aggregate course properties to avoid
    // massive filtering complexity and workload
    // in production.
    //
    // We also remove unused keys to remove overhead.
    munged_course = {}

    keys_to_keep = [
        "name",
        "credit",
        "code",
        "studyLevelName",
        "studyLevelCode"
    ];

    munged_course = {}
    munged_course.language = mungeLanguage(course);
    munged_course.lecturer = mungeLecturer(course);
    munged_course.mandatoryActivity = mungeMandatoryActivity(course);
    munged_course.semester = mungeSemester(course);
    munged_course.examDate = mungeExamDate(course, munged_course.semester);
    munged_course.assessment = mungeAssessment(course);
    munged_course.subjectArea = mungeSubjectArea(course);

    for (var i = 0; i < keys_to_keep.length; i++) {
        munged_course[keys_to_keep[i]] = course[keys_to_keep[i]];
    }

    return munged_course;
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
        r.db("ntnu_courses").table("courses").insert(mungeCourse(json.course), {upsert: true}).run(connection, function(err, res) {
            if (err) {
                console.log(err);
            }
            //console.log("Created table for " + filename + "...");
        });
    });
    callback(null, "finished");
}

main();
