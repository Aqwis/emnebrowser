var r = require('rethinkdbdash')({
      pool: false,
      cursor: true
});
var fs = require('fs');
var async = require('async');
var http = require('http');

var util = require('../util/util.js');
var arrayUnique = util.arrayUnique;
var sortByOrder = util.sortByOrder;

var DatabaseLogic = function() {
	this.prefix = "ntnu";

	this.retrieveCourses = function () {
		var self = this;
	    this.getCourseDict(function(courseDict) {
	        self.getAllCourses(courseDict);
	    });
	}

	this.getCourseDict = function (callback) {
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

	this.getAllCourses = function (courseDict) {
		var self = this;
	    var courseCodeList = [];
	    var i = 0;

	    courseDict.course.forEach(function(course) {
	        course.code = course.code.replace('/', ''); // sanitize course codes
	        if (fs.existsSync('ntnu_courses/' + course.code + ".json")) {
	            console.log(course.code + " already fetched!");
	            return;
	        }
	        setTimeout(function() {
	            console.log(course);
	            courseCodeList.push(course.code);
	            self.getAndSaveCourseInfo(course.code);
	        }, 500*i);
	        i++;
	    });
	}

	this.getAndSaveCourseInfo = function (courseCode) {
	    var courseDataRaw = "";

	    console.log("Fetching " + courseCode + "...")

	    http.get(encodeURI("http://www.ime.ntnu.no/api/course/" + courseCode), function(res) {
	        res.setEncoding('utf8');
	        res.on('data', function(data) {
	            courseDataRaw += data;
	        }).on('end', function() {
	            fs.writeFile('ntnu_courses/' + courseCode + ".json", courseDataRaw, function(err) {
	                if (err) {
	                    throw err;
	                }
	                console.log("Fetched " + courseCode + "!");
	            });
	        });
	    });
	}

	this.mungeLanguage = function (course) {
	    if (course.taughtInEnglish) {
	        return "Engelsk";
	    } else {
	        return "Norsk";
	    }
	}

	this.mungeLecturer = function (course) {
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
	                if (coordinator == undefined) {
	                	coordinator = person.person.firstName + " " + person.person.lastName;
	                }
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

	this.mungeExamDate = function (course) {
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
	        return "Flere";
	    } else if (dates.length == 1) {
	        return dates[0];
	    } else {
	        return "";
	    }
	}

	this.mungeMandatoryActivity = function (course) {
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

	this.mungeSemester = function (course) {
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

	this.mungeSubjectArea = function (course) {
	    if (typeof(course.subjectArea) != "undefined") {
	        return course.subjectArea.map(function(a) {
	            return a.name;
	        });
	    } else {
	        return [];
	    }
	}

	this.mungeAssessment = function (course) {
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

	/* Blatantly copied from client-side JavaScript,
	fix someday! */
	this.mungeCanonicalExaminationSupport = function (course) {
	    var assessment = this.mungeAssessment(course);
	    var supportOrder = ["A", "B", "C", "D"].reverse();
	    var supportArray = assessment.map(function(a) {
	        return a.support;
	    }).filter(function(s) {
	        if (s != "") {
	            return true;
	        }
	    });
	    if (supportArray.length > 0) {
	        return sortByOrder(supportArray, supportOrder)[0];
	    } else {
	        var written_exams = assessment.filter(function(a) {
	            if (a.short == "Skriftlig") {
	                return true;
	            } else {
	                return false;
	            }
	        });
	        var oral_exams = assessment.filter(function(a) {
	            if (a.short == "Muntlig") {
	                return true;
	            } else {
	                return false;
	            }
	        });
	        if (oral_exams.length > 0 && written_exams.length == 0) {
	            return "D";
	        } else {
	            return "-";
	        }
	    }
	}

	this.mungeName = function (course) {
		return course.name.trim();
	}

    this.mungeLocation = function (course) {
        return course.location.trim();
    }

	this.mungeCourse = function (course) {
	    // Calculate aggregate course properties to avoid
	    // massive filtering complexity and workload
	    // in production.
	    //
	    // We also remove unused keys to remove overhead.
	    munged_course = {}

	    keys_to_keep = [
	        "credit",
	        "code",
	        "studyLevelName",
	        "studyLevelCode"
	    ];

	    munged_course = {}
	    munged_course.name = this.mungeName(course);
	    munged_course.language = this.mungeLanguage(course);
	    munged_course.lecturer = this.mungeLecturer(course);
	    munged_course.mandatoryActivity = this.mungeMandatoryActivity(course);
	    munged_course.semester = this.mungeSemester(course);
	    munged_course.examDate = this.mungeExamDate(course);
	    munged_course.assessment = this.mungeAssessment(course);
	    munged_course.subjectArea = this.mungeSubjectArea(course);
	    munged_course.canonicalExaminationSupport = this.mungeCanonicalExaminationSupport(course);
        munged_course.location = this.mungeLocation(course);

	    for (var i = 0; i < keys_to_keep.length; i++) {
	        munged_course[keys_to_keep[i]] = course[keys_to_keep[i]];
	    }

	    return munged_course;
	}

	this.insertCourseData = function (connection, callback) {
	    // Insert course data into database
	    var self = this;
	    var prefix = this.prefix;
	    var json = null;
	    var filenames = fs.readdirSync(prefix + '_courses/');

	    var inserted = 0;
	    var toBeInserted = filenames.length;

	    filenames.forEach(function (filename) {
	        try {
	            json = require('../ntnu_courses/' + filename);
	        } catch (err) {
	        	console.log(err);
	            console.log("Could not open " + filename + "!");
	            inserted = inserted + 1;
	            return;
	        }
	        if (json.course == null) {
	        	console.log("Course object was null for " + filename);
	        	inserted = inserted + 1;
	        } else {
		        r.db("courses").table(prefix + "_courses").insert(self.mungeCourse(json.course), {conflict: "replace"}).run(connection, function(err, res) {
		            if (err) {
		                console.log(err);
		            }
		            inserted = inserted + 1;
		            if (inserted == toBeInserted) {
		            	callback(null, connection);
		            }
		        });
	    	}
	    });
	    return;
	}
}

module.exports = {
	"database_logic": DatabaseLogic
}
