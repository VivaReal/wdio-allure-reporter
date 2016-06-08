'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _utilsValidate = require('./utils/validate');

var _utilsValidate2 = _interopRequireDefault(_utilsValidate);

/**
 * Stack of one instance unit
 */

var Instance = (function () {
    function Instance(data, options) {
        _classCallCheck(this, Instance);

        (0, _utilsValidate2['default'])(data);
        this.instanceIdentifier = data.specs[0];
        this.options = options;
        this.allure = this.options.allure;
        this.runtime = this.options.runtime;
        this.context = data.file;

        this.currentCaseResult = null;
        this.queue = [];
        this.stack = [];

        this.outputDir = this.allure.options.targetDir;
    }

    _createClass(Instance, [{
        key: '_getLevel',
        value: function _getLevel() {
            return this.stack.length;
        }
    }, {
        key: '_getStackTop',
        value: function _getStackTop(offset) {
            offset = offset || 1;
            var len = this.stack.length;
            if (len !== undefined && len >= offset) {
                return this.stack[len - offset];
            }
        }
    }, {
        key: '_isHookActive',
        value: function _isHookActive() {
            return this._isActive('hook');
        }
    }, {
        key: '_isTestActive',
        value: function _isTestActive() {
            return this._isActive('test') || this._isActive('virtual');
        }
    }, {
        key: '_isActive',
        value: function _isActive(kind) {
            return this._getStackTop().kind === kind;
        }
    }, {
        key: '_pushStack',
        value: function _pushStack(item, kind) {
            item.kind = kind;
            this.stack.push(item);
        }
    }, {
        key: '_popStack',
        value: function _popStack(kinds) {
            var topStackItem = this._getStackTop();
            kinds = kinds instanceof Array ? kinds : [kinds];

            if (!this.stack.length) {
                return;
            }

            var match = kinds.filter(function (kind) {
                return topStackItem.kind === kind;
            }).length > 0;

            if (match) {
                return this.stack.pop();
            }
        }
    }, {
        key: 'startSuite',
        value: function startSuite(suite) {
            var _this = this;

            this._endSuite();
            this._pushStack(suite, 'suite');

            // the root suite groups together in the dashboard
            var title = this.stack[0].title;
            this._print('suite:start', title);

            this._queue(function () {
                _this.allure.startSuite(title);
            });
        }
    }, {
        key: 'endSuite',
        value: function endSuite(suite) {
            // end last suite
            return this._endSuite();
        }
    }, {
        key: '_endSuite',
        value: function _endSuite() {
            var _this2 = this;

            // when there is an pending case, end it
            this._endCase(null, true);

            var suite = this._popStack('suite');

            if (!suite) {
                return;
            }

            this._print('suite:end', suite.title);

            this._queue(function () {
                _this2.allure.endSuite();
            });

            if (!this.stack.length) {
                // re-apply the root suite
                this._pushStack(suite, 'suite');
                this._flush();
            } else if (this.stack.length === 1 && this._getStackTop().kind === 'suite') {
                this._flush();
            }
        }
    }, {
        key: 'endInstance',
        value: function endInstance() {
            return this.endSuite();
        }
    }, {
        key: 'startTest',
        value: function startTest(test) {
            // end any open case
            this._endCase(null, true);

            var title = this._getTitle(test.title);
            this._print('test:start', title);
            this._startCase(title);
        }
    }, {
        key: 'passTest',
        value: function passTest(test) {
            var title = this._getTitle(test.title);
            var time = this._getTime();

            this._print('test:pass', title);
            this._getStackTop().result = {
                status: 'passed',
                time: time
            };
        }
    }, {
        key: 'failTest',
        value: function failTest(test) {
            var title = this._getTitle();
            var time = this._getTime();

            if (this._isHookActive()) {
                // after hooks need to end the previous test first
                this._startVirtualErrorCase(test);
                this._print('hook:fail', title);

                var len = this.stack.length;

                // hook
                if (!this.stack[len - 1].result) {
                    this.stack[len - 1].result = {
                        time: this._getStackTop().timestamp,
                        status: 'broken'
                    };
                }
                this.stack[len - 1].result.err = test.err;

                // test
                if (!this.stack[len - 2].result) {
                    this.stack[len - 2].result = {
                        time: this._getStackTop().timestamp,
                        status: 'broken'
                    };
                }
                this.stack[len - 2].result.err = test.err;
            } else {
                title = this._getTitle(test.title);
                this._getStackTop().result = {
                    status: 'failed',
                    err: test.err,
                    time: time
                };
                this._print('test:fail', title);
            }
        }
    }, {
        key: 'endTest',
        value: function endTest(test) {
            if (test.pending) {
                this._getStackTop().result = {
                    status: 'pending',
                    err: {
                        message: 'canceled'
                    },
                    time: this._getTime()
                };

                this._endCase('test');
            }
        }
    }, {
        key: 'startHook',
        value: function startHook(hook) {
            this._endHook();
            hook.timestamp = this._getTime();
            this._pushStack(hook, 'hook');
        }
    }, {
        key: 'endHook',
        value: function endHook(hook) {
            this._popStack('hook');
        }
    }, {
        key: '_endHook',
        value: function _endHook() {
            var topStackItem = this._popStack('hook');

            if (!topStackItem) {
                return;
            }

            // if(topStackItem.kind === 'virtual') {
            this._endCase('virtual');
            // }
        }
    }, {
        key: 'screenshot',
        value: function screenshot(_screenshot) {
            var _this3 = this;

            console.log(arguments);
            var filename = this._getScreenshotFilename(_screenshot);
            var data = new Buffer(_screenshot.data, 'base64');
            var time = this._getTime();

            if (this._isHookActive()) {
                this._startVirtualErrorCase(_screenshot);
            } else if (!this._isTestActive()) {
                this._startCase(this._getTitle(), time);
            }

            this._print('Screenshot taken from', this._getStackTop().kind, 'in', this._getTitle());

            this._queue(function () {
                _this3.allure.addAttachment(filename, data);
            });
        }
    }, {
        key: '_startVirtualErrorCase',
        value: function _startVirtualErrorCase(item) {
            var hook = this._getStackTop();
            // let title = this._getTitle(item.title) + hook.title

            if (this.stack.length >= 2) {
                var parentKind = this.stack[this.stack.length - 2].kind;
                if (parentKind === 'test') {
                    this._endCase('test', true);
                } else if (parentKind !== 'suite') {
                    // a virtual case already started
                    this._endCase('virtual', true);
                }
            }

            this._popStack('hook');
            this._startCase(this._getTitle(item.title), hook.timestamp, 'virtual');

            if (!hook.result) {
                hook.result = {
                    status: 'broken',
                    time: this._getTime()
                };
            }
            if (!this._getStackTop().result) {
                this._getStackTop().result = {
                    status: 'broken',
                    time: this._getTime()
                };
            }

            if (item.err) {
                hook.result.err = item.err;

                // also set test to failed
                this._getStackTop().result.err = item.err;
            }

            this._pushStack(hook, 'hook');
        }
    }, {
        key: '_endCase',
        value: function _endCase(type, force) {
            var _this4 = this;

            type = type || ['test', 'virtual'];

            this._endHook();
            var test = this._popStack(type);

            if (!test) {
                return;
            }

            if (!test.result) {
                if (force) {
                    test.result = {
                        status: 'broken',
                        err: 'Test did not finish.',
                        time: this._getTime()
                    };
                } else {
                    return;
                }
            }

            var status = test.result.status || 'broken';
            var err = test.result.err;
            var time = test.result.time || this._getTime();

            this._queue(function () {
                if (status === 'passed') {
                    _this4.allure.endCase(status, time);
                } else {
                    _this4.allure.endCase(status, err, time);
                }
            });
        }
    }, {
        key: '_startCase',
        value: function _startCase(title, time, kind) {
            var _this5 = this;

            kind = kind || 'test';
            time = time || this._getTime();

            if (this._getStackTop().kind !== 'suite') {
                // skip starting tests outside of a suite
                return;
            }

            this._pushStack({
                title: title,
                time: time
            }, kind);

            this._queue(function () {
                _this5.allure.startCase(title, time);
            });
        }
    }, {
        key: '_getTitle',
        value: function _getTitle(title) {
            // parent suite tree and current title
            var tree = this.stack.map(function (item) {
                return item.title;
            });

            if (title) {
                tree = tree.concat(title instanceof Array ? title : [title]);
            }

            // except the root suite
            var rootSuiteTitle = tree.shift();

            if (!tree.length) {
                return rootSuiteTitle;
            }

            return tree.join(' >> ');
        }
    }, {
        key: '_getTime',
        value: function _getTime() {
            var d = new Date();
            return d.getTime();
        }
    }, {
        key: '_print',
        value: function _print() {
            if (this.options.verbose) {
                console.log.apply(this, arguments);
            }
        }
    }, {
        key: '_queue',
        value: function _queue(fn) {
            this.queue.push(fn);
        }
    }, {
        key: '_flush',
        value: function _flush() {
            var title = this._getTitle();
            this.queue.forEach(function (fn) {
                return fn();
            });
            this.queue = [];
            console.log('Wrote Allure report for ' + title + ' to [' + this.outputDir + '].');
        }
    }, {
        key: '_getScreenshotFilename',
        value: function _getScreenshotFilename(screenshot) {
            if (screenshot.filename) {
                return _path2['default'].basename(screenshot.filename);
            } else {
                return screenshot.specHash + '-' + screenshot.cid + '.png';
            }
        }
    }]);

    return Instance;
})();

exports['default'] = Instance;
module.exports = exports['default'];
