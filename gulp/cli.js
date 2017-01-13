var opts = require('nomnom')
	.option('build', {
		abbr: 'b',
		help: 'Build project. [local | move | commit | push]',
		choices: ['local', 'move', 'commit', 'push']
	})
	.option('dont-minify', {
		abbr: 'd',
		flag: true,
		help: 'Prevent build from minifying your js'
	});

module.exports = opts;
