const gulp = require('gulp');
const pump = require('pump');
const htmlclean = require('gulp-htmlclean');
const ejs = require('gulp-ejs');
const eslint = require('gulp-eslint');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const minify = require('gulp-minify');
const connect = require('gulp-connect');
const livereload = require('gulp-livereload');
const less = require('gulp-less');
const postcss = require('gulp-postcss');
const webserver = require('gulp-webserver');
const autoprefixer = require('autoprefixer');
const mqpacker = require('css-mqpacker');
const cssnano = require('cssnano');
const ghpages = require('gh-pages');
const del = require('del');
const reload = require('require-reload')(require);
const runSequence = require('run-sequence');

let content = reload('./src/content/content.json');

// Clean HTML
gulp.task('html', function(cb) {
	pump([
		gulp.src('src/*.ejs'),
		ejs({
			site_title: 'Let\'s Learn Korean',
			content: content['content'],
			navbar: content['navbar']
		}, {}, {
			ext: '.html'
		}),
		htmlclean(),
		gulp.dest('dist/'),
		livereload()
	], cb);
});

gulp.task('reload', function(cb) {
	content = reload('./src/content/content.json');
});

// Run task js, only if verify is successful
gulp.task('js', ['verify'], function(cb) {
	pump([
		gulp.src(['src/js/**/*.js', '!src/lib/**/*']),
		concat('script.js'),
		gulp.dest('dist/js'),
		minify({
			ext: {
				min: '.min.js'
			},
			noSource: true
		}),
		gulp.dest('dist/js'),
		livereload()
	], cb);
});

// Lints the js files
gulp.task('verify', function(cb) {
	pump([
		gulp.src(['src/js/**/*.js', '!src/lib/**/*']),
		eslint(),
		eslint.format(),
		eslint.failAfterError()
	], cb);
});

gulp.task('clean', function(cb) {
	return del([
		'dist/**/*'
	]);
});

// Copies images to build
gulp.task('images', function(cb) {
	pump([
		gulp.src(['src/images/**/*']),
		gulp.dest('dist/images'),
		livereload()
	], cb);
});

// Do a bunch of stuff to CSS files
gulp.task('less', function(cb) {
	pump([
		gulp.src('src/less/**/*.less'),
		less(),
		postcss([
			autoprefixer({
				browsers: ['last 2 versions', '> 2%']
			}),
			mqpacker
		]),
		rename('style.css'),
		gulp.dest('dist/css'),
		postcss([
			cssnano
		]),
		rename('style.min.css'),
		gulp.dest('dist/css'),
		livereload()
	], cb);
});

gulp.task('deploy', ['build'], function(cb) {
	ghpages.publish('dist', cb);
});

gulp.task('connect', function() {
	connect.server({
		root: 'dist',
		port: 8090,
		livereload: true
	})
});

gulp.task('build', ['reload', 'js', 'less', 'html', 'images']);

gulp.task('watch', ['build'], function() {
	livereload()
	gulp.watch('src/js/**/*.js', ['js'])
	gulp.watch('src/less/**/*.less', ['less'])
	gulp.watch('src/**/*.ejs', ['html'])
	gulp.watch('src/lib/**/*', ['lib'])
	gulp.watch('src/content/content.json', ['reload'])
	gulp.watch('src/images/**/*', ['images'])
});

process.on('uncaughtException', function(err) {
	console.log(err);
	connect.serverClose();
	process.kill();
});

gulp.task('default', ['reload', 'html', 'js', 'less', 'images', 'connect', 'watch'])
