function ViewModel() {
    var self = this;

    self.courses = ko.observableArray([]);

    self.getCourses = function(callback) {
        $.getJSON("http://horda.land:5000/api/", function(data) {
            self.courses(data);
            callback();
        });
    }
}

$(function() {
    var vm = new ViewModel();
    ko.applyBindings(vm);

    var tableTemplate = "";

    // Initially, retrieve the table template
    // and get some unfiltered data
    $.get("static/table.html", function(data) {
        tableTemplate = data;
        vm.getCourses(function() {
            var output = swig.render(tableTemplate, { filename: '/', locals: { courses: vm.courses() }});
            $('#content').html(output);
            console.log(output);
        });
    });
});
