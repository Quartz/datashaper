// Node modules
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var browserSync = require("browser-sync");
var reload = browserSync.reload;
var nib = require("nib");
var del = require("del");

// Gulp-related
var gulp = require("gulp");
var changed = require("gulp-changed");
var jade = require("gulp-jade");
var preprocess = require("gulp-preprocess");
var shell = require("gulp-shell");
var stylus = require("gulp-stylus");

// Non-gulp NPM modules
var fs = require("fs");
var archieml = require("archieml");
var request = require('request');
var http = require('http');

// Local modules
var args = require("./gulp/cli").parse();
var config = require("./gulp/config");
var utils = require("./gulp/utils");

// Configuration
var gdoc_id = "";
var gdoc_host = "127.0.0.1:6006";
var gdoc_url = "http://"+gdoc_host+"/"+ gdoc_id;
var content = {};

var qzdataPath = process.env.QZDATA_PATH || "~/qzdata";
var thingName = "datashaper";
var thingPath = qzdataPath + "/" + thingName;

var isProd = args.build ? true : false;
var preprocessOpts = {
	context: {
		ENV: isProd ? "prod" : "dev"
	}
};

var allTasks = [
	"get-content",
	"jade",
	"stylus",
	"browserify",
	"copy-libs",
	"copy-assets",
	"copy-fonts",
	"copy-data"
];

var shellCmd = utils.generateShellCmd(args.build, thingPath, thingName);

/**
 * Reads compiled ArchieML content from the local JSON file.
 */
function readContentFromFile(doneCallback) {
	fs.readFile("content.json", function(err, data){
		if (!err) {
			content = JSON.parse(data);
			doneCallback();
		}
		else {
			console.log("Cannot load content from file");
			doneCallback(err);
		}
	});
}

/**
 * Fetch ArchieML data from Google Docs.
 */
function getContentTask(doneCallback) {
	if(gdoc_id !== "") {
		request.get({
				"url": gdoc_url
			},
			function(error, resp, body) {
				if(!error && resp.statusCode < 400) {
					content = JSON.parse(body);
					fs.writeFileSync("content.json", JSON.stringify(content, null, 4), "utf-8");
					doneCallback();
				}
				else {
					// if the server isn't up load from file
					if(resp && resp.statusCode >= 400) {
						console.log(body);
					}

					console.log("Cannot load content from server, loading from file");
					readContentFromFile(doneCallback);
				}
		});
	}
	else {
		console.log("No google doc specified, loading from file");
		readContentFromFile(doneCallback);
	}
}

getContentTask.description = "Fetch ArchieML data from Google Docs";
gulp.task("get-content", getContentTask);

/**
 * Compile Jade HTML templates. (Also triggers a refetch of the ArchieML doc.)
 */
function compileJadeTask() {
	return gulp.src(config.paths.src.jade + "/index.jade")
		.pipe(jade({ pretty: true, locals: content }))
		.pipe(gulp.dest(config.dirs.build))
		.pipe(reload({ stream: true }));
}

compileJadeTask.description = "Compile Jade HTML templates (also triggers 'get-content')";
gulp.task("jade", ["get-content"], compileJadeTask);

/**
 * Compile Stylus CSS meta-language.
 */
function compileStylusTask() {
	return gulp.src(config.paths.src.styl + "/main.styl")
		.pipe(stylus({
			use: [nib()],
			"include css": true,
			errors: true
		}))
		.pipe(gulp.dest(config.paths.build.css))
		.pipe(reload({ stream: true }));
}

compileStylusTask.description = "Compile Stylus CSS meta-language";
gulp.task("stylus", compileStylusTask);

/**
 * Bundle Javascript with browserify.
 */
function compileJavascriptTask(doneCallback) {
	var bundler = browserify({
		entries: [config.paths.src.js + "/thing.js"],
		debug: !isProd
	});

	if (isProd && !args["dont-minify"]) {
		bundler.transform({ global: true }, "uglifyify");
	}

	return bundler
		.bundle()
		.on('error', function(err) {
			console.error('ERROR IN JS');
			console.error(err.message);
			doneCallback();
		})
		.pipe(source("thing.js"))
		.pipe(gulp.dest(config.paths.build.js))
		.pipe(reload({ stream: true }));
}

compileJavascriptTask.description = "Bundle Javascript with browserify";
gulp.task("browserify", ["preprocess"], compileJavascriptTask);

/**
 * Clear files from the build directory.
 */
function cleanTask() {
	return del([
		config.dirs.build + "/**"
	]);
}

cleanTask.description = "Clear files from the build directory";
gulp.task("clean", cleanTask);

/**
 * Copy Javascript libraries to build path.
 */
function copyLibrariesTask() {
	return gulp.src(config.paths.src.js + "/libs/*")
		.pipe(gulp.dest(config.paths.build.js + "/libs"))
		.pipe(reload({ stream: true }));
}

copyLibrariesTask.description = "Copy Javascript libraries to build path";
gulp.task("copy-libs", copyLibrariesTask);

/**
 * Copy static assets to build path.
 */
function copyAssetsTask() {
	return gulp.src(config.paths.src.assets + "/**")
		.pipe(gulp.dest(config.paths.build.assets))
		.pipe(reload({ stream: true }));
}

copyAssetsTask.description = "Copy static assets to build path";
gulp.task("copy-assets", copyAssetsTask);

/**
 * Copy font files to build path.
 */
function copyFontsTask() {
	return gulp.src(config.paths.src.fonts + "/**")
		.pipe(gulp.dest(config.paths.build.fonts))
		.pipe(reload({ stream: true }));
}

copyFontsTask.description = "Copy font files to build path";
gulp.task("copy-fonts", copyFontsTask);

/**
 * Copy data files to build path.
 */
function copyDataTask() {
	return gulp.src(config.paths.src.data + "/**")
		.pipe(gulp.dest(config.paths.build.data))
		.pipe(reload({ stream: true }));
}

copyDataTask.description = "Copy data files to build path"
gulp.task("copy-data", copyDataTask);

/**
 * Writes environment configuration variables to config.js and puts it in
 * the build directory.
 */
function preprocessTask() {
	return gulp.src([config.paths.src.js + "/config.js"])
		.pipe(preprocess(preprocessOpts))
		.pipe(gulp.dest(config.paths.build.js));
}

preprocessTask.description = "Preprocess dev/prod conditional code";
gulp.task("preprocess", preprocessTask);

/**
 * Watches project files for changes and runs the appropriate copy/compile
 * tasks.
 */
function watchTask(done) {
	gulp.watch(config.paths.src.libs + "/**", ["copy-libs"]);
	gulp.watch(config.paths.src.fonts + "/**", ["copy-fonts"]);
	gulp.watch(config.paths.src.data + "/**", ["copy-data"]);
	gulp.watch(config.paths.src.assets + "/**", ["copy-assets"]);
	gulp.watch(config.paths.src.js + "/**", ["browserify"]);
	gulp.watch(config.paths.src.styl + "/**", ["stylus"]);
	gulp.watch(config.paths.src.jade + "/**", ["jade"]);
	done();
}

watchTask.description = "Watch local files for changes and re-build as necessary."
gulp.task("watch", allTasks, watchTask);

/**
 * Starts the browsersync server.
 */
function browserSyncTask() {
	browserSync({
		server: {
			baseDir: "build"
		},
		open: false
	});
}

browserSyncTask.description = "Serve the built project using BrowserSync";
gulp.task("browser-sync", ["watch"], browserSyncTask);

/**
 * Other tasks
 */
gulp.task("shell", allTasks, shell.task(shellCmd));
gulp.task("build", ["shell"]);

if (args.build) {
	gulp.task("default", ["clean"], function () {
		gulp.start("build");
	});
} else {
	gulp.task("default", ["clean"], function () {
		gulp.start("browser-sync");
	});
}
