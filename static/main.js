function ViewModel() {
    var self = this;

    self.tableTemplate = "";

    self.courses = ko.observableArray([]);
    self.getCourses = ko.computed(function() {
        $.getJSON("http://horda.land:5000/api/?" + self.queryString(), function(data) {
            self.courses(data);
        });
    }, this, { deferEvaluation: true });

    self.tableHTML = ko.computed(function() {
        return swig.render(self.tableTemplate, { filename: '/', locals: { courses: self.courses() }});
    }, this, { deferEvaluation: true });

    // Filters
    self.searchString = ko.observable("");

    self.queryString = ko.computed(function() {
        return $.param({
            name: this.searchString()
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
