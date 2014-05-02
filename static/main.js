function ViewModel() {
    var self = this;

    self.courses = ko.observableArray([]);
    self.ongoingRequests = [];
    self.getCourses = ko.computed(function() {
        console.log("Fetching courses...");
        var req = $.getJSON("/api/?" + self.queryString(), function(data) {
            self.courses(data);
        });
        self.ongoingRequests.push(req);
    }, this, { deferEvaluation: true });

    self.multiSelectInitOptions = {
        buttonText: function(op, select) {
            return (op.context.title + ' <b class="caret"></b>');
        }
    }

    self.multiSelectInitSearchOptions = {
        enableFiltering: true,
        filterPlaceholder: 'Søk',
        maxHeight: 300,
        enableCaseInsensitiveFiltering: true,
        buttonText: function(op, select) {
            return (op.context.title + ' <b class="caret"></b>');
        }
    }

    // Course info pane
    self.curentInfoPane = ko.observable("");
    self.onHeaderClick = function(course, event) {
        self.orderBy(event.currentTarget.id.split("-")[1]);
    }

    self.onMoreClick = function() {
       console.log("clicked!");
       vm.numberOfResults(vm.numberOfResults() + 50);
    }

    // Table field values
    self.valLanguage = function(course) {
        if (course.taughtInEnglish) {
            return "Engelsk";
        } else {
            return "Norsk";
        }
    }

    self.valLecturer = function(course) {
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

    self.valExamDate = function(course) {
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
            return "-";
        }
    }

    self.valSemester = function(course) {
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
                return "Begge";
            } else if (taughtInAutumn) {
                return "Høst";
            } else if (taughtInSpring) {
                return "Vår";
            }
        } else {
            return "-";
        }
    }

    self.valMandatoryActivity = function(course, truncate) {
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
        if (truncate) {
            if (mandatoryActivityText == "Kun tellende") {
                return "Kun tellende";
            } else if (mandatoryActivityText == "") {
                return "Nei";
            } else {
                return "Ja";
            }
        } else {
            if (mandatoryActivityText == "Kun tellende") {
                return "";
            } else {
                return mandatoryActivityText;
            }
        }
    }

    self.valStudyLevelShortname = function(course) {
        var levelCode = course.studyLevelCode;
        var studyLevelObj = self.studyLevelOptions().filter(function(obj) {
            return obj.code == levelCode;
        })[0];
        return studyLevelObj.shortname;
    }

    // Filter variables 
    self.creditOptions = ko.observableArray([0.0, 7.5, 10, 15, 22.5, 30, 45, 52.5, 60]);
    self.studyLevelOptions = ko.observableArray([
            {code: "50", name: "Norsk for utenlandske studenter", shortname: "NFU"},
            {code: "70", name: "Examen philosophicum", shortname: "EXP"},
            {code: "90", name: "Lavere grad, redskapskurs", shortname: "LAV"},
            {code: "100", name: "Grunnleggende emner, nivå I", shortname: "&nbsp;1&nbsp;"},
            {code: "200", name: "Videregående emner, nivå II", shortname: "&nbsp;2&nbsp;"},
            {code: "300", name: "Tredjeårsemner, nivå III", shortname: "&nbsp;3&nbsp;"},
            {code: "350", name: "Praktisk pedagogisk utdanning", shortname: "PPU"},
            {code: "400", name: "Fjerdeårsemner, nivå IV", shortname: "&nbsp;4&nbsp;"},
            {code: "500", name: "Høyere grads nivå", shortname: "HØY"},
            {code: "900", name: "Doktorgrads nivå", shortname: "DOK"}
            ]);
    /* bootstrap-multiselect DOES NOT work properly with observableArrays containing objects.
    See this bug: https://github.com/davidstutz/bootstrap-multiselect/issues/149
    Because of this, a proxy and a reverse proxy are needed to make things work. */
    self.studyLevelOptionsProxy = ko.computed(function() {
        var options = self.studyLevelOptions.peek();
        return options.map(function(opt) {
            return opt.name;
        });
    });
    self.semesterOptions = ko.observableArray(["Høst", "Vår"]);
    self.subjectAreaOptions = ko.observableArray(subject_areas);
    self.mandatoryActivitiesOptions = ko.observableArray(["Ja", "Kun tellende", "Nei"]);
    self.assessmentOptions = ko.observableArray(["Skriftlig eksamen", "Muntlig eksamen", "Arbeider", "Annet"]);

    // Reset numberOfResults each time the filter is changed
    self.resetNumberOfResults = function() {
        // Stop all previous requests
        for (var i = 0; i < self.ongoingRequests.length; i++) {
            self.ongoingRequests[i].abort();
            console.log("Stopped request!");
        }
        self.numberOfResults(50);
    }

    // Filter state
    self.orderBy = ko.observable("name");
    self.numberOfResults = ko.observable(50);
    self.searchString = ko.observable("");
    self.searchString.subscribe(self.resetNumberOfResults);

    self.credit = ko.observableArray();
    self.credit.subscribe(self.resetNumberOfResults);
    self.studyLevel = ko.observableArray();
    self.studyLevel.subscribe(self.resetNumberOfResults);
    self.studyLevelCode = ko.computed(function() {
        // Reverse proxy for studyLevelOptionsProxy
        if (self.studyLevel()) {
            var options = self.studyLevelOptions.peek();
            var selectedNames = self.studyLevel();
            var selectedCodes = [];
            options.forEach(function(opt) {
                if (selectedNames.indexOf(opt.name) > -1) {
                    selectedCodes.push(opt.code);
                }
            });
            return selectedCodes;
        } else {
            return []
        }
    });
    self.semester = ko.observable();
    self.semester.subscribe(self.resetNumberOfResults);
    self.subjectArea = ko.observableArray();
    self.subjectArea.subscribe(self.resetNumberOfResults);
    self.mandatoryActivities = ko.observableArray();
    self.mandatoryActivities.subscribe(self.resetNumberOfResults);
    self.assessment = ko.observableArray();
    self.assessment.subscribe(self.resetNumberOfResults);

    self.queryString = ko.computed(function() {
        return $.param({
            /* example: {
                value: self.example(), // mandatory
                type: "string", // mandatory; can also be "boolean" or "number"
            } */
            orderBy: {
                value: self.orderBy(),
                type: "string"
            },
            results: {
                value: self.numberOfResults(),
                type: "number"
            },
            search: {
                value: self.searchString(),
                type: "string"
            },
            credit: {
                value: self.credit(),
                type: "number"
            },
            studyLevelCode: {
                value: self.studyLevelCode(),
                type: "string"
            },
            semester: {
                value: self.semester(),
                type: "string"
            },
            subjectArea: {
                value: self.subjectArea(),
                type: "string"
            },
            mandatoryActivities: {
                value: self.mandatoryActivities(),
                type: "string"
            },
            assessment: {
                value: self.assessment(),
                type: "string"
            }
        });
    }, this);
}

$(function() {
    /* $('.multiselect').multiselect(); */
    vm = new ViewModel();
    ko.applyBindings(vm);
    vm.getCourses();
});
