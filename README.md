Mocha Jenkins Reporter
======================

This reporter is useful if you want to run Node.js backend tests using mocha and need a nicely formatted Jenkins reports of the test runs. The existing `xunit` reporter is very similar, but doesn't make it possible to output both XML report and a console output at the same time, which would often be useful with Jenkins. It also doesn't handle separate tests suites but adds all tests to a single suite instead.


General Information
-------------------

First you need to add the library to your package.json, right now it is not published in `npm` so you can use the following setting to get the latest version:

`"mocha-jenkins-reporter": "https://github.com/futurice/mocha-jenkins-reporter/archive/master.tar.gz"`

For the actual test run you can use the following Makefile:

```
jenkins:
	@JUNIT_REPORT_PATH=report.xml ./node_modules/.bin/mocha --reporter mocha-jenkins-reporter || true

.PHONY: jenkins
```

The @ in the beginning is just `make` syntax for not printing out the line. Because mocha by default reports the number of failed tests as the return code (and it is a good thing) we need to add `|| true` to the end of the command in order to make Jenkins not interpret this run as a crash. 

The environment variable `JUNIT_REPORT_PATH` is used for passing the output filename for the reporter. Any existing reports in the same path will be overwritten, so be careful with it. If the environment variable is not set, no JUnit style XML report is written and the test results are only printed to the console.

Example console output of the reporter:

```
  In test suite number one
      ․ the asynchronous test should work: 47ms

  Suite duration: 0.048 s, Tests: 1
```

Jenkins Setup
-------------

If you use the Makefile specified in the last section, setting up Jenkins should be pretty straighforward. For the shell execution you can use something like this:

```
cd $WORKSPACE
npm install
make jenkins
```

Make sure to set the `Color ANSI Console Output` on and use for example `xterm` for the `ANSI color map` setting, in order to show the output colors nicely in Jenkins.

After this you should be able to add `Publish JUnit test result report` in your `Post-build Actions` and write for example `report.xml` to the `Test report XMLs` field if your Makefile was exactly as above. You can use your own variations of these commands as you wish, but this should get anyone started.

After all this setting up, just click `Save` and start building, you should get all errors nicely both to the console log as the tests are being run and finally to the Jenkins reports.