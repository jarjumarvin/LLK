const gulp = require('gulp');
const pump = require('pump');
const htmlclean = require('gulp-htmlclean');
const ejs = require('gulp-ejs');
const watch = require('gulp-watch');
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
const ghpages = require('gulp-gh-pages');
const del = require('del');
const reload = require('require-reload')(require);
const runSequence = require('run-sequence');

let content = reload('./src/content/content.json');

// Clean HTML
gulp.task('html', function() {
	return gulp.src('src/*.ejs')
		.pipe(ejs({
			site_title: 'Let\'s Learn Korean',
			content: content['content'],
			navbar: content['navbar']
		}, {}, {
			ext: '.html'
		}))
		.pipe(htmlclean())
		.pipe(gulp.dest('dist/'))
});

// Remove useless html files
gulp.task('clean-html', function() {
	return del([
		'dist/**/template.html',
		'dist/**/blank.html'
	])
});

// reload the content file and update cards / header
gulp.task('reload', function() {
	content = reload('./src/content/content.json');
	runSequence(['html'])
});

// Run task js, only if verify is successful
gulp.task('js', ['verify'], function() {
	return gulp.src(['src/js/**/*.js', '!src/lib/**/*'])
		.pipe(concat('script.js'))
		.pipe(gulp.dest('dist/js'))
		.pipe(minify({
			ext: {
				min: '.min.js'
			},
			noSource: true
		}))
		.pipe(gulp.dest('dist/js'))
});

// Lints the js files
gulp.task('verify', function() {
	return gulp.src(['src/js/**/*.js', '!src/lib/**/*'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError())
});

//clean the dist folder for git
gulp.task('clean', function() {
	del([
		'dist/**/*'
	]);
});

// Copies images to build
gulp.task('images', function() {
	return gulp.src(['src/images/**/*'])
		.pipe(gulp.dest('dist/images'))
});

// Do a bunch of stuff to CSS files
gulp.task('less', function() {
	return gulp.src('src/less/**/*.less')
		.pipe(less())
		.pipe(postcss([
			autoprefixer({
				browsers: ['last 2 versions', '> 2%']
			}),
			mqpacker
		]))
		.pipe(rename('style.css'))
		.pipe(gulp.dest('dist/css'))
		.pipe(postcss([
			cssnano
		]))
		.pipe(rename('style.min.css'))
		.pipe(gulp.dest('dist/css'))
});

// Publish to ghpages branch
gulp.task('deploy', function() {
	return gulp.src('./dist/**/*')
		.pipe(ghpages())
});

// Open local Server
gulp.task('connect', function() {
	connect.server({
		root: 'dist',
		port: 8080,
		livereload: true
	})
});

gulp.task('prod', function() {
	runSequence('clean', 'build', 'clean-html');
});

// Build everything
gulp.task('build', function() {
	runSequence(['js', 'less', 'reload', 'images'], 'clean-html');
});

// Watch for Filechanges
gulp.task('watch', function() {
	gulp.watch('src/js/**/*.js', ['js']);
	gulp.watch('src/less/**/*.less', ['less']);
	gulp.watch('src/**/*.ejs', ['html']);
	//gulp.watch('src/content/**/*.md', ['md']);
	gulp.watch('src/content/content.json', ['reload']);
	gulp.watch('src/images/**/*', ['images']);
});

process.on('uncaughtException', function(err) {
	console.log(err);
	connect.serverClose();
	process.kill();
});

gulp.task('default', function() {
	runSequence(['build', 'connect'], ['watch']);
});
