// NPM modules
var d3 = require('d3');

/**
 * Create a SVG tansform for a given translation.
 */
function makeTranslate(x, y) {
	var transform = d3.transform();

	transform.translate[0] = x;
	transform.translate[1] = y;

	return transform.toString();
}

/**
 * Use any string to generate a CSS class or id name.
 */
function classify(str) {
	return str.toLowerCase()
		.replace(/\s+/g, '-')		 // Replace spaces with -
		.replace(/[^\w\-]+/g, '') // Remove all non-word chars
		.replace(/\-\-+/g, '-')	 // Replace multiple - with single -
		.replace(/^-+/, '')			 // Trim - from start of text
		.replace(/-+$/, '');			// Trim - from end of text
}

/**
 * Throttle a function call.
 */
function throttle(fn, threshold, scope) {
	threshold || (threshold = 250);
	var last,
		deferTimer;
	return function() {
		var context = scope || this;

		var now = +new Date(),
			args = arguments;
		if (last && now < last + threshold) {
			// hold on to it
			clearTimeout(deferTimer);
			deferTimer = setTimeout(function() {
				last = now;
				fn.apply(context, args);
			}, threshold);
		} else {
			last = now;
			fn.apply(context, args);
		}
	};
};

/**
 * Move a D3 selection to the top of the rendering stack.
 */
d3.selection.prototype.moveToFront = function() {
	return this.each(function() {
		this.parentNode.appendChild(this);
	});
};

/**
 * Move a D3 selection to the bottom of the rendering stack.
 */
d3.selection.prototype.moveToBack = function() {
	return this.each(function() {
		var firstChild = this.parentNode.firstChild;
		if (firstChild) {
			this.parentNode.insertBefore(this, firstChild);
		}
	});
};

module.exports = {
	makeTranslate: makeTranslate,
	classify: classify,
	throttle: throttle
}
