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
const marked = require('gulp-marked');
const inject = require('gulp-inject-self');
const replace = require('gulp-replace');

let content = reload('./src/content/content.json');

// Clean HTML
gulp.task('html', function() {
	return gulp.src('src/*.ejs')
		.pipe(ejs({
			site_title: 'LLK',
			content: content['content'],
			navbar: content['navbar']
		}, {}, {
			ext: '.html'
		}))
		.pipe(htmlclean())
		.pipe(gulp.dest('dist/'))
});

// Markdown Files
gulp.task('md', function() {
	return gulp.src('src/content/**/*.md')
		.pipe(marked({
			breaks: true
		}))
		.pipe(ejs({
			site_title: 'LLK',
			page_title: 'PAGE_TITLE'
		}, {}, {
			ext: '.html'
		}))
		.pipe(inject('dist/template.html', /<INJECT>/, {
			replaceWith: function(fileContent) {
				return '\n' + fileContent;
			}
		}))
		.pipe(replace('PAGE_TITLE', function() {
			var name = this.file.relative.replace(/(.*)\.(.*?)$/, "$1");
			var page_title = (content['content']['pages'][name] ? content['content']['pages'][name].title : "PAGE TITLE");
			return page_title;
		}))
		.pipe(htmlclean())
		.pipe(gulp.dest('dist/'));
})

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
	return runSequence('html', 'md')
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
	return del([
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

gulp.task('ghpages', function(cb) {
	return gulp.src('./dist/**/*')
		.pipe(ghpages(cb));
})

// deploy
gulp.task('deploy', function(cb) {
	runSequence('prod', 'ghpages', cb)
})

// Open local Server
gulp.task('connect', function() {
	return connect.server({
		root: 'dist',
		port: 8090,
		livereload: true
	})
});

gulp.task('prod', function(cb) {
	runSequence('clean', 'build', 'clean-html', cb);
});

// Build everything
gulp.task('build', function(cb) {
	runSequence('js', 'less', 'reload', 'html', 'md', 'images', cb)
});

// Watch for Filechanges
gulp.task('watch', function() {
	gulp.watch('src/js/**/*.js', ['js']);
	gulp.watch('src/less/**/*.less', ['less']);
	gulp.watch('src/**/*.ejs', ['html']);
	gulp.watch('src/content/**/*.md', ['md']);
	gulp.watch('src/content/content.json', ['reload']);
	gulp.watch('src/images/**/*', ['images']);
});

process.on('uncaughtException', function(err) {
	console.log(err);
	connect.serverClose();
	process.kill();
});

gulp.task('default', function(cb) {
	runSequence('clean', ['build', 'connect'], ['watch'], cb);
});
