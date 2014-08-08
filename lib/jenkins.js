/**
 * Module dependencies.
 */

var Base = require('mocha').reporters.Base
  , cursor = Base.cursor
  , color = Base.color
  , fs = require('fs')
  , diff= require('diff');

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
    if (fd) {
      var buf = new Buffer(str);
      fs.writeSync(fd, buf, 0, buf.length, null);
    }
  }

  function genSuiteReport() {
    writeString('<testsuite');
    writeString(' name="'+htmlEscape(currentSuite.suite.fullTitle())+'"');
    writeString(' tests="'+currentSuite.tests.length+'"');
    writeString(' failures="'+currentSuite.failures+'"');
    writeString(' skipped="'+(currentSuite.tests.length-currentSuite.failures-currentSuite.passes)+'"');
    writeString(' timestamp="'+currentSuite.start.toUTCString()+'"');
    writeString(' time="'+(currentSuite.duration/1000)+'"');
    writeString('>\n');

    currentSuite.tests.forEach(function(test) {
      writeString('<testcase');
      writeString(' classname="'+htmlEscape(currentSuite.suite.fullTitle())+'"');
      writeString(' name="'+htmlEscape(test.title)+'"');
      writeString(' time="'+(test.duration/1000)+'"');
      if (test.state == "failed") {
        writeString('>\n');
        writeString('<failure message="');
        if (test.err.message) writeString(htmlEscape(test.err.message));
        writeString('">\n');
        writeString(htmlEscape(unifiedDiff(test.err)));
        writeString('\n</failure>\n');
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

  function htmlEscape(str) {
      return String(str)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
  }

  function unifiedDiff(err) {
    function escapeInvisibles(line) {
      return line.replace(/\t/g, '<tab>')
                 .replace(/\r/g, '<CR>')
                 .replace(/\n/g, '<LF>\n');
    }
    function cleanUp(line) {
      if (line.match(/\@\@/)) return null;
      if (line.match(/\\ No newline/)) return null;
      return escapeInvisibles(line);
    }
    function notBlank(line) {
      return line != null;
    }

    var actual = err.actual,
        expected = err.expected;

    var lines, msg = '';

    if (err.actual && err.expected) {
      // make sure actual and expected are strings
      if (!(typeof actual === 'string' || actual instanceof String)) {
        actual = JSON.stringify(err.actual);
      }

      if (!(typeof expected === 'string' || expected instanceof String)) {
        expected = JSON.stringify(err.actual);
      }

      msg = diff.createPatch('string', actual, expected);
      lines = msg.split('\n').splice(4);
      msg += lines.map(cleanUp).filter(notBlank).join('\n');
    }

    if (process.env.JUNIT_REPORT_STACK && err.stack) {
      if (msg) msg += '\n';
      lines = err.stack.split('\n').slice(1);
      msg += lines.map(cleanUp).filter(notBlank).join('\n');
    }

    return msg;
  }

  runner.on('start', function() {
    var path = process.env.JUNIT_REPORT_PATH;
    if (path) fd = fs.openSync(path, 'w');
    writeString('<testsuites name="Mocha Tests">\n');
  });

  runner.on('end', function() {
    endSuite();
    writeString('</testsuites>\n');
    if (fd) fs.closeSync(fd);
    self.epilogue.call(self);
  });

  runner.on('suite', function (suite) {
    if (currentSuite) {
      endSuite();
    }
    startSuite(suite);
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
