'use strict'

var gulp       = require('gulp')
var exit       = require('gulp-exit')
var mocha      = require('gulp-mocha')
var istanbul   = require('gulp-istanbul')
var browserify = require('gulp-browserify');
var jshint     = require('gulp-jshint');
var del        = require('del');
var gulpNSP    = require('gulp-nsp');

var paths = {
  src     : ['src/**/*.js'],
  specs   : ['specs/**/*.js'],
  artifact: process.env.CIRCLE_ARTIFACTS || "artifacts"
}

gulp.task('clean', function () {
  return del([paths.artifact])
})

gulp.task('nsp', function (cb) {
  gulpNSP({ package: __dirname + '/package.json', stopOnError: false }, cb);
});

gulp.task('test', function () {
  return gulp.src(paths.specs, { read: false })
    .pipe(mocha({ reporter: 'spec' }))
    .pipe(exit())
})

gulp.task('pre-coverage', ['lint'], function (cb) {
  return gulp.src(paths.src)
    .pipe(istanbul())
    .pipe(istanbul.hookRequire())
})

gulp.task('coverage', ['nsp', 'pre-coverage'], function (cb) {
  return gulp.src(paths.specs)
    .pipe(mocha({ reporter: 'spec' }))
    .pipe(istanbul.writeReports(
      {
        dir       : paths.artifact + "/coverage",
        reportOpts: { dir: paths.artifact + "/coverage" },
        reporters : ['text', 'text-summary', 'json', 'html']
      }))
    .pipe(exit())
})

gulp.task('lint', function () {
  return gulp.src(paths.src)
    .pipe(jshint())
    .pipe(jshint.reporter('gulp-jshint-html-reporter',
                          {
                            filename            : paths.artifact + "/jshint" + "/jshint.html",
                            createMissingFolders: true
                          }
    ))
});

