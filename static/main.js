function ViewModel() {
    var self = this;

    self.tableTemplate = "";

    self.courses = ko.observableArray([]);
    self.getCourses = ko.computed(function() {
        $.getJSON("http://horda.land:5000/api/?" + self.queryString(), function(data) {
            self.courses(data.sort(function(a, b) {
                if (a.code > b.code) {
                    return 1;
                } else {
                    return -1;
                }
            }));
        });
    }, this, { deferEvaluation: true });

    self.tableHTML = ko.computed(function() {
        return swig.render(self.tableTemplate, { filename: '/', locals: { courses: self.courses() }});
    }, this, { deferEvaluation: true });

    // Filter variables 
    self.creditOptions = ko.observableArray([3.7, 7.5, 15, 30, 45, 60]);
    self.studyLevelOptions = ko.observableArray([
            {code: "100", name: "Grunnleggende emner, nivå I"},
            {code: "200", name: "Videregående emner, nivå II"},
            {code: "300", name: "Tredjeårsemner, nivå III"},
            {code: "500", name: "Høyere grads nivå"},
            {code: "900", name: "Doktorgrads nivå"}
            ]);
    self.semesterOptions = ko.observableArray(["Høst", "Vår"]);

    // Filter state
    self.searchString = ko.observable("");
    self.credit = ko.observable();
    self.studyLevel = ko.observable();
    self.studyLevelCode = ko.computed(function() {
        // Hack to get queryString working properly
        if (self.studyLevel()) {
            return self.studyLevel().code;
        } else {
            return ""
        }
    });
    self.semester = ko.observable();
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

    // Turn off swig's cache, which
    // breaks everything!
    swig.setDefaults({ cache: false });

    // Initially, retrieve the table template
    // and get some unfiltered data
    $.get("static/table.html", function(data) {
        vm.tableTemplate = data;
        vm.getCourses();
    });
});
