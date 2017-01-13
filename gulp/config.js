var path = require('path');

var dirs = {
	build: './build',
	tmp: './.tmp',
	src: './src'
};

var paths = {
	src: {
		data: dirs.src + '/data',
		img: dirs.src + '/img',
		jade: dirs.src + '/jade',
		js: dirs.src + '/js',
		styl: dirs.src + '/styl',
		assets: dirs.src + '/assets',
		fonts: dirs.src + '/fonts'
	},
	tmp: {
		css: dirs.tmp + '/css',
		data: dirs.tmp + '/data',
		img: dirs.tmp + '/img',
		jade: dirs.tmp + '/jade',
		js: dirs.tmp + '/js',
		styl: dirs.tmp + '/styl'
	},
	build: {
		css: dirs.build + '/css',
		data: dirs.build + '/data',
		img: dirs.build + '/img',
		jade: dirs.build + '/jade',
		js: dirs.build + '/js',
		assets: dirs.build + '/assets',
		fonts: dirs.build + '/fonts'
	}
};

var server = {
	port: '8080',
	root: path.resolve('./'),
};

module.exports = {
	dirs: dirs,
	paths: paths,
	server: server
};
