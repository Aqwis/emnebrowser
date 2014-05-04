function isObservableArray(obj) {
    return ko.isObservable(obj) && !(obj.destroyAll === undefined);
}

function arrayUnique(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
};

function firstLetterCaps(str) {
    return (str.substr(0,1).toUpperCase() + str.substr(1).toLowerCase());
}

function sortByOrder(arr, order) {
    return arr.sort(function(a,b) {
        var i = order.indexOf(a);
        var j = order.indexOf(b);
        return (i < j) ? -1 : (i > j) ? 1 : 0;
    });
}

function ViewModel() {
    var self = this;

    self.loaded = ko.observable(false); // False until we have loaded courses for the first time.
    self.clickedMore = ko.observable(false); // When the user clicks more, we do not replace view with spinner.

    self.courses = ko.observableArray([]);
    self.ongoingRequests = [];
    self.getCourses = ko.computed(function() {
        if (!self.clickedMore.peek()) {
            self.loaded(false);
        }
        console.log("Fetching courses...");
        var req = $.getJSON("/api/?" + self.queryString(), function(data) {
            self.courses(data);
            self.loaded(true);
            self.clickedMore(false);
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
       self.clickedMore(true);
       vm.numberOfResults(vm.numberOfResults() + 50);
    }

    self.uncheckEverything = function(selectedOptionsContainer) {
        if (isObservableArray(self[selectedOptionsContainer])) {
            self[selectedOptionsContainer].removeAll();
        } else {
            self[selectedOptionsContainer]('');
        }
    }

    // Table field values
    self.valLanguage = function(course) {
        return course.language;
    }

    self.valLecturer = function(course) {
        return course.lecturer;
    }

    self.valExamDate = function(course) {
        if (course.examDate != "") {
            return course.examDate;
        } else {
            return "-"
        }
    }

    self.valSemester = function(course) {
        if (course.semester.autumn && course.semester.spring) {
            return "Begge";
        } else if (course.semester.autumn) {
            return "Høst";
        } else if (course.semester.spring) {
            return "Vår";
        } else {
            return "";
        }
    }

    self.valMandatoryActivity = function(course, truncate) {
        if (truncate) {
            return course.mandatoryActivity.text;
        } else {
            return course.mandatoryActivity.activities;
        }
    }

    self.valAssessment = function(course, truncate) {
        var assessmentOrder = ["Avhandling", "Skriftlig", "Muntlig", "Hjemmeeks.", "Arbeider", "Semesterprøve", "Annet"];

        /* 1) Get short/long names,
        /* 2) Sort in the above order,
        /* 3) Remove duplicates,
        /* 4) Capitalise only the first letter. */
        if (truncate) {
            return firstLetterCaps(
                arrayUnique(
                    sortByOrder(course.assessment.map(function(el) { return el.short; }), assessmentOrder)
                ).join("/")
            );
        } else {
            return firstLetterCaps(
                arrayUnique(
                    sortByOrder(course.assessment.map(function(el) { return el.long; }), assessmentOrder)
                ).join(", ")
            );
        }
    }

    self.valExamSupport = function(course) {
        var supportOrder = ["A", "B", "C", "D"].reverse();
        var supportArray = course.assessment.map(function(a) {
            return a.support;
        }).filter(function(s) {
            if (s != "" && s != "-") {
                return true;
            }
        });
        if (supportArray.length > 0) {
            return sortByOrder(supportArray, supportOrder)[0];
        } else {
            var written_exams = course.assessment.filter(function(a) {
                if (a.short == "Skriftlig") {
                    return true;
                } else {
                    return false;
                }
            });
            var oral_exams = course.assessment.filter(function(a) {
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

    self.valExamSupportDescription = function(course) {
        var code = self.valExamSupport(course);
        var options = self.examSupportOptions.peek();
        if (code != "-") {
            return options.filter(function(opt) {
                return (opt.code == code);
            })[0].text;
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
    self.examSupportOptions = ko.observableArray([
        {code: "A", text: "A: Alle trykte og håndskrevne hjelpemidler tillatt. Alle kalkulatorer tillatt."},
        {code: "B", text: "B: Alle trykte og håndskrevne hjelpemidler tillatt. Bestemt, enkel kalkulator tillatt."},
        {code: "C", text: "C: Spesifiserte trykte og håndskrevne hjelpemidler tillatt. Bestemt, enkel kalkulator tillatt."},
        {code: "D", text: "D: Ingen trykte eller håndskrevne hjelpemidler tillatt. Bestemt, enkel kalkulator tillatt."}
        ]);
    self.studyLevelOptions = ko.observableArray([
            {code: "50", name: "Norsk for utenlandske studenter", shortname: "NFU"},
            {code: "70", name: "Examen philosophicum", shortname: "EXP"},
            {code: "71", name: "Examen facultatum", shortname: "EXF"},
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
    self.examSupportOptionsProxy = ko.computed(function() {
        var options = self.examSupportOptions.peek();
        return options.map(function(opt) {
            return opt.text;
        });
    });
    self.studyLevelOptionsProxy = ko.computed(function() {
        var options = self.studyLevelOptions.peek();
        return options.map(function(opt) {
            return opt.name;
        });
    });
    self.semesterOptions = ko.observableArray(["Høst", "Vår"]);
    self.subjectAreaOptions = ko.observableArray(subject_areas);
    self.mandatoryActivitiesOptions = ko.observableArray(["Ja", "Kun tellende", "Nei"]);
    self.assessmentOptions = ko.observableArray(["Skriftlig", "Muntlig", "Hjemmeeks.", "Semesterprøve", "Arbeider", "Avhandling", "Annet"]);

    // Reset numberOfResults each time the filter is changed
    self.resetNumberOfResults = function() {
        // Stop all previous requests
        for (var i = 0; i < self.ongoingRequests.length; i++) {
            self.ongoingRequests[i].abort();
        }
        self.numberOfResults(50);
    }

    // Filter state
    self.orderBy = ko.observable("name");
    self.numberOfResults = ko.observable(50);
    self.searchString = ko.observable("").extend({ rateLimit: {timeout: 750, method: "notifyWhenChangesStop"} });
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
    self.examSupport = ko.observableArray();
    self.examSupport.subscribe(self.resetNumberOfResults);
    self.examSupportCode = ko.computed(function() {
        // Reverse proxy for studyLevelOptionsProxy
        if (self.examSupport()) {
            var options = self.examSupportOptions.peek();
            var selectedNames = self.examSupport();
            var selectedCodes = [];
            options.forEach(function(opt) {
                if (selectedNames.indexOf(opt.text) > -1) {
                    selectedCodes.push(opt.code);
                }
            });
            return selectedCodes;
        } else {
            return []
        }
    });
    self.semester = ko.observableArray();
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
            },
            examSupportCode: {
                value: self.examSupportCode(),
                type: "string"
            }
        });
    }, this);
}

$(function() {
    vm = new ViewModel();
    ko.applyBindings(vm);
    vm.getCourses();
});