function arrayUnique(a) {
    return a.reduce(function(p, c) {
        if (p.indexOf(c) < 0) p.push(c);
        return p;
    }, []);
}

function sortByOrder(arr, order) {
    return arr.sort(function(a,b) {
        var i = order.indexOf(a);
        var j = order.indexOf(b);
        return (i < j) ? -1 : (i > j) ? 1 : 0;
    });
}

module.exports = {
	'arrayUnique': arrayUnique,
	'sortByOrder': sortByOrder
}