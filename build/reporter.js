'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _allureJsCommons = require('allure-js-commons');

var _allureJsCommons2 = _interopRequireDefault(_allureJsCommons);

var _allureJsCommonsRuntime = require('allure-js-commons/runtime');

var _allureJsCommonsRuntime2 = _interopRequireDefault(_allureJsCommonsRuntime);

var _instances = require('./instances');

var _instances2 = _interopRequireDefault(_instances);

/**
 * Initialize a new `Allure` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */

var AllureReporter = (function (_events$EventEmitter) {
    _inherits(AllureReporter, _events$EventEmitter);

    function AllureReporter(baseReporter, config) {
        var _this = this,
            _arguments = arguments;

        var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        _classCallCheck(this, AllureReporter);

        _get(Object.getPrototypeOf(AllureReporter.prototype), 'constructor', this).call(this);

        this.baseReporter = baseReporter;
        this.config = config;
        this.options = options.allure || {};
        this.outputDir = this.options.outputDir || 'allure-results';
        this.level = 0;
        this.currentHooks = [];
        this.parents = [];

        this.allure = new _allureJsCommons2['default']();
        this.runtime = new _allureJsCommonsRuntime2['default'](this.allure);

        this.allure.setOptions({
            targetDir: this.outputDir
        });

        this.instances = new _instances2['default']({
            allure: this.allure,
            runtime: this.runtime,
            verbose: this.options.verbose
        });

        var epilogue = this.baseReporter.epilogue;

        // this suite catches errors in hooks of the root suite
        this.allure.startSuite(this.getProjectName());

        this.on('end', function () {
            _Object$keys(_this.instances.instances).forEach(function (identifier) {
                _this.instances.instances[identifier].endInstance();
            });
            _this.allure.endSuite(_this.getProjectName());
            epilogue.call(baseReporter);
        });

        this.on('suite:start', function (suite) {
            _this.instances.startSuite(suite);
        });

        this.on('test:start', function (test) {
            _this.instances.startTest(test);
        });

        this.on('test:end', function (test) {
            _this.instances.endTest(test);
        });

        this.on('test:pass', function (test) {
            _this.instances.passTest(test);
        });

        this.on('test:fail', function (test) {
            _this.instances.failTest(test);
        });

        // track chains of hooks to later determine whether a test or a hook failed
        this.on('hook:start', function (hook) {
            _this.instances.startHook(hook);
        });

        this.on('hook:end', function (hook) {
            _this.instances.endHook(hook);
        });

        this.on('runner:screenshot', function (screenshot) {
            console.log(_arguments);
            _this.instances.screenshot(screenshot);
        });
    }

    _createClass(AllureReporter, [{
        key: 'getProjectName',
        value: function getProjectName() {
            return this.options.projectName || 'Unknown Project';
        }
    }]);

    return AllureReporter;
})(_events2['default'].EventEmitter);

exports['default'] = AllureReporter;
module.exports = exports['default'];
