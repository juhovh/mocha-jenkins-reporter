
/**
 * Module dependencies.
 */

var Base = require('mocha').reporters.Base
  , cursor = Base.cursor
  , color = Base.color
  , fs = require('fs')
  , buffer = require('buffer');

/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */

var Date = global.Date
  , setTimeout = global.setTimeout
  , setInterval = global.setInterval
  , clearTimeout = global.clearTimeout
  , clearInterval = global.clearInterval;

/**
 * Expose `Jenkins`.
 */

exports = module.exports = Jenkins;

/**
 * Initialize a new `Jenkins` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function Jenkins(runner) {
  Base.call(this, runner);

  var self = this;
  var fd, currentSuite;

  function writeString(str) {
    var buf = new Buffer(str);
    fs.writeSync(fd, buf, 0, buf.length, null);
  }

  function genSuiteReport() {
    writeString('<testsuite')
    writeString(' name="'+currentSuite.suite.fullTitle()+'"');
    writeString(' tests="'+currentSuite.tests.length+'"');
    writeString(' failures="'+currentSuite.failures+'"');
    writeString(' errors="'+currentSuite.failures+'"');
    writeString(' skipped="'+(currentSuite.tests.length-currentSuite.failures-currentSuite.passes)+'"');
    writeString(' timestamp="'+currentSuite.start.toUTCString()+'"');
    writeString(' time="'+(currentSuite.duration/1000)+'"');
    writeString('>\n');

    currentSuite.tests.forEach(function(test) {
      writeString('<testcase');
      writeString(' classname="'+currentSuite.suite.fullTitle()+'"');
      writeString(' name="'+test.title+'"')
      writeString(' time="'+(test.duration/1000)+'"');
      if (test.state == "failed") {
        writeString(' message="Failure message placeholder"');
        writeString('>\n');
        writeString('<failure');
        writeString(' classname="'+currentSuite.suite.fullTitle()+'"');
        writeString(' name="'+test.title+'"')
        writeString(' time="'+(test.duration/1000)+'"');
        writeString('>\n');
        writeString('Stacktrace placeholder');
        writeString('</failure>\n');
        writeString('</testcase>\n');
      } else {
        writeString('/>\n');
      }
    });

    writeString('</testsuite>\n');
  }

  function startSuite(suite) {
    currentSuite = {
      suite: suite,
      tests: [],
      start: new Date,
      failures: 0,
      passes: 0
    };
    console.log();
    console.log("  "+suite.fullTitle());
  }

  function endSuite() {
    if (currentSuite != null) {
      currentSuite.duration = new Date - currentSuite.start;
      console.log();
      console.log('  Suite duration: '+(currentSuite.duration/1000)+' s, Tests: '+currentSuite.tests.length);
      try {
      genSuiteReport();
      } catch (err) { console.log(err) }
      currentSuite = null;
    }
  }

  function addTestToSuite(test) {
    currentSuite.tests.push(test);
  }

  function indent() {
    return "    ";
  }


  runner.on('start', function() {
    fd = fs.openSync("report.xml", 'w');
    writeString('<testsuites>\n');
  });

  runner.on('end', function() {
    endSuite();
    writeString('</testsuites>\n');
    fs.closeSync(fd);
    self.epilogue.call(self);
  });

  var lastSuiteTitle;
  runner.on('test', function(test) {
    if (test.parent.fullTitle() != lastSuiteTitle) {
      endSuite();
      lastSuiteTitle = test.parent.fullTitle();
      startSuite(test.parent);
    }
  });

  runner.on('test end', function(test) {
    addTestToSuite(test);
  });

  runner.on('pending', function(test) {
    var fmt = indent()
      + color('checkmark', '  -')
      + color('pending', ' %s');
    console.log(fmt, test.title);
  });

  runner.on('pass', function(test) {
    currentSuite.passes++;
    var fmt = indent()
      + color('checkmark', '  '+Base.symbols.dot)
      + color('pass', ' %s: ')
      + color(test.speed, '%dms');
   console.log(fmt, test.title, test.duration);
  });

  runner.on('fail', function(test, err) {
    var n = ++currentSuite.failures;
    var fmt = indent()
      + color('fail', '  %d) %s');
    console.log(fmt, n, test.title);
  });
}

Jenkins.prototype.__proto__ = Base.prototype;
