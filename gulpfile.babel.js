/* eslint no-console:0 */
import cp from 'child_process';
import del from 'del';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import minimist from 'minimist';
import mkdirp from 'mkdirp';
import path from 'path';
import runSequence from 'run-sequence';
import webpack from 'webpack';

const $ = gulpLoadPlugins();
const argv = minimist(process.argv.slice(2));
const src = Object.create(null);

let watch = false;
let browserSync;

gulp.task('default', ['sync']);

// Clean output directories
gulp.task('clean', cb => {
  del(['.tmp', 'build/*', '!build/.git'], {dot: true}, () => {
    mkdirp('build/public', cb);
  });
});

// Static files
gulp.task('assets', () => {
  src.assets = 'src/public/**';

  return gulp.src(src.assets)
    .pipe($.changed('build/public'))
    .pipe(gulp.dest('build/public'))
    .pipe($.size({title: 'assets'}));
});

// Resource files
gulp.task('resources', () => {
  src.resources = ['package.json', 'src/content*/**', 'src/templates*/**'];

  return gulp.src(src.resources)
    .pipe($.changed('build'))
    .pipe(gulp.dest('build'))
    .pipe($.size({title: 'resources'}));
});

// Bundle
gulp.task('bundle', cb => {
  const config = require('./webpack.config.js');
  const bundler = webpack(config);
  const verbose = !!argv.verbose;

  let bundlerRunCount = 0;

  function bundle(err, stats) {
    if (err) {
      throw new $.util.PluginError('webpack', err);
    }

    console.log(stats.toString({
      colors: $.util.colors.supportsColor,
      hash: verbose,
      version: verbose,
      timings: verbose,
      chunks: verbose,
      chunkModules: verbose,
      cached: verbose,
      cachedAssets: verbose,
    }));

    if (++bundlerRunCount === (watch ? config.length : 1)) {
      return cb();
    }
  }

  if (watch) {
    bundler.watch(200, bundle);
  } else {
    bundler.run(bundle);
  }
});

// Build the application
gulp.task('build', ['clean'], cb => {
  runSequence(['assets', 'resources'], ['bundle'], cb);
});

// Build and watch for modifications
gulp.task('build:watch', cb => {
  watch = true;
  runSequence('build', () => {
    gulp.watch(src.assets, ['assets']);
    gulp.watch(src.resources, ['resources']);
    cb();
  });
});

// Launch a Node.js/Express server
gulp.task('serve', ['build:watch'], cb => {
  src.server = [
    'build/server.js',
    'build/content/**/*',
    'build/templates/**/*',
  ];
  let started = false;
  let server = (function startup() {
    const child = cp.fork('build/server.js', {
      env: Object.assign({NODE_ENV: 'development'}, process.env),
    });
    child.once('message', message => {
      if (message.match(/^online$/)) {
        if (browserSync) {
          browserSync.reload();
        }

        if (!started) {
          started = true;
          gulp.watch(src.server, () => {
            $.util.log('Restarting development server.');
            server.kill('SIGTERM');
            server = startup();
          });

          cb();
        }
      }
    });

    return child;
  })();

  process.on('exit', () => server.kill('SIGTERM'));
});

// Launch BrowserSync server
gulp.task('sync', ['serve'], cb => {
  browserSync = require('browser-sync');

  browserSync({
    logPrefix: 'RSK',
    notify: false,

    // Run as an https by setting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    https: false,

    // Informs browser-sync to proxy our Express app which would run
    // at the following location
    proxy: 'localhost:' + (process.env.PORT || 8080),
  }, cb);

  process.on('exit', () => browserSync.exit());

  gulp.watch(['build/**/*.*']
    .concat(src.server.map(file => '!' + file)), file => {
      browserSync.reload(path.relative(__dirname, file.path));
    });
});

// Deploy via Git
gulp.task('deploy', cb => {
  const push = require('git-push');
  const remote = argv.production
    ? 'https://github.com/{user}/{repo}.git'
    : 'https://github.com/{user}/{repo}-test.git';

  push('./build', remote, cb);
});

// Run PageSpeed Insights
gulp.task('pagespeed', cb => {
  const pagespeed = require('psi');

  pagespeed('example.com', {
    strategy: 'mobile',

    // By default we use the PageSpeed Insights free (no API key) tier.
    // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
    // key: 'YOUR_API_KEY'
  }, cb);
});