function ViewModel() {
    var self = this;

    self.courses = ko.observableArray([]);
    self.ongoingRequests = [];
    self.getCourses = ko.computed(function() {
        console.log("Fetching courses...");
        var req = $.getJSON("http://horda.land:5000/api/?" + self.queryString(), function(data) {
            self.courses(data);
        });
        self.ongoingRequests.push(req);
    }, this, { deferEvaluation: true });

    // Course info pane
    self.curentInfoPane = ko.observable("");
    self.onHeaderClick = function(course, event) {
        self.orderBy(event.currentTarget.id.split("-")[1]);
    }

    // Table field values
    self.valLanguage = function(course) {
        if (course.taughtInEnglish) {
            return "Engelsk";
        } else {
            return "Norsk";
        }
    }

    self.valSemester = function(course) {
        if (course.taughtInAutumn) {
            if (course.taughtInSpring) {
                return "Begge";
            } else {
                return "Høst";
            }
        } else {
            return "Vår"
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
        }
        if (mandatoryActivities.length === 0) {
            if (hasGradedProject) {
                mandatoryActivityText = "Kun tellende";
            } else {
                mandatoryActivityText = "Ingen";
            }
        } else {
            mandatoryActivityText = mandatoryActivities.join(", ");
        }
        if (truncate && mandatoryActivityText.length > 19) {
            return mandatoryActivityText.substr(0, 18) + "...";
        } else {
            return mandatoryActivityText;
        }
    }

    // Filter variables 
    self.creditOptions = ko.observableArray([7.5, 10, 15, 22.5, 30, 45, 52.5, 60]);
    self.studyLevelOptions = ko.observableArray([
            {code: "50", name: "Norsk for utenlandske studenter"},
            {code: "70", name: "Examen philosophicum"},
            {code: "90", name: "Lavere grad, redskapskurs"},
            {code: "100", name: "Grunnleggende emner, nivå I"},
            {code: "200", name: "Videregående emner, nivå II"},
            {code: "300", name: "Tredjeårsemner, nivå III"},
            {code: "500", name: "Høyere grads nivå"},
            {code: "900", name: "Doktorgrads nivå"}
            ]);
    self.semesterOptions = ko.observableArray(["Høst", "Vår"]);

    // Reset numberOfResults each time the filter is changed
    self.resetNumberOfResults = function() {
        // Stop all previous requests
        for (var i = 0; i < self.ongoingRequests.length; i++) {
            self.ongoingRequests[i].abort();
            console.log("Stopped request!");
        }
        self.numberOfResults(100);
    }

    // Filter state
    self.orderBy = ko.observable("code");
    self.numberOfResults = ko.observable(100);
    self.searchString = ko.observable("");
    self.searchString.subscribe(self.resetNumberOfResults);
    self.credit = ko.observable();
    self.credit.subscribe(self.resetNumberOfResults);
    self.studyLevel = ko.observable();
    self.studyLevel.subscribe(self.resetNumberOfResults);
    self.studyLevelCode = ko.computed(function() {
        // Hack to get queryString working properly
        if (self.studyLevel()) {
            return self.studyLevel().code;
        } else {
            return ""
        }
    });
    self.semester = ko.observable();
    self.semester.subscribe(self.resetNumberOfResults);
    self.taughtInAutumn = ko.computed(function() {
        if (self.semester() == "Høst") {
            return true;
        } else {
            return false;
        }
    });
    self.taughtInSpring = ko.computed(function() {
        if (self.semester() == "Spring") {
            return true;
        } else {
            return false;
        }
    });

    self.queryString = ko.computed(function() {
        return $.param({
            /* example: {
                value: self.example(), // mandatory
                type: "string", // mandatory; can also be "boolean" or "number"
                matching: "inexact" // mandatory; can also be "exact"
                hierarchy: "educationalRole/person",
                hierarchyMatching: "any", // can also be "all"
            } */
            orderBy: {
                value: self.orderBy(),
                type: "string",
                matching: "exact"
            },
            results: {
                value: self.numberOfResults(),
                type: "number",
                matching: "exact"
            },
            search: {
                value: self.searchString(),
                type: "string",
                matching: "inexact"
            },
            credit: {
                value: self.credit(),
                type: "number",
                matching: "exact"
            },
            studyLevelCode: {
                value: self.studyLevelCode(),
                type: "string",
                matching: "exact"
            },
            taughtInAutumn: {
                value: self.taughtInAutumn(),
                type: "boolean",
                matching: "exact"
            },
            taughtInSpring: {
                value: self.taughtInSpring(),
                type: "boolean",
                matching: "exact"
            }
        });
    }, this);
}

$(function() {
    vm = new ViewModel();
    ko.applyBindings(vm);
    vm.getCourses();
    $(window).scroll(function(){
        if ($(window).scrollTop() > ($(document).height() - $(window).height())*0.90) {
           vm.numberOfResults(vm.numberOfResults() + 100);
        }
    });
});
