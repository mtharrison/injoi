var Package = require('./package');
var Boom = require('boom');
var Hoek = require('hoek');


var internals = {};


internals.Request = function (options, request, reply) {

	var route = this.route = request.route;
	this.pluginOptions = options;
	this.request = request;
	this.reply = reply;
	this.routeOptions = route.settings.plugins[internals.attributes.name];
	this.origFailAction = route.settings.validate.failAction;
	route.settings.validate.failAction = this.failAction.bind(this);

	reply.continue();
};


internals.Request.prototype.failAction = function (request, reply, source, error) {

    var self = this;
    var failArgs = arguments;
    this.source = source;
    this.error = error;

    var next = function () {

        if (typeof self.origFailAction === 'function') {
            return self.origFailAction.apply(self, failArgs);
        }

        return reply(this.error);
    };

    this.messages = this.routeOptions[source];

    if (!this.messages) {
        next();
    }

    this.doReplacements();
    this.wrapError();

    next();
};


internals.interpolate = exports.interpolate = function (str, context) {

    if (!context) {
        return str;
    }

    return str.replace(
        /\{\{([^{}]*)\}\}/g,
        function (full, match) {

            var replace = context[match];
            return typeof replace === 'string' || typeof replace === 'number' ? replace : full;
        });
};


internals.getBestLanguageMatch = function (request, rules) {
	return 'en';
};


internals.Request.prototype.doReplacements = function () {

	var request = this.request;
	var error = this.error;
	var messages = this.messages;
    var details = error.data.details;

    for (var i = 0; i < details.length; i++) {
        var err = details[i];
        var path = err.path;
        if (messages.hasOwnProperty(path)) {
            var rules = messages[path];
            if (rules.hasOwnProperty(err.type)) {

                if (typeof rules[err.type] === 'string') {
                    err.message = internals.interpolate(rules[err.type], err.context);
                }

                if (typeof rules[err.type] === 'object') {
                    var lang = internals.getBestLanguageMatch(request, rules);
                    err.message = internals.interpolate(rules[err.type][lang], err.context);
                }

            }
        }
    }

};


internals.Request.prototype.wrapError = function () {

	var err = this.error.data;
	var source = this.source;
    var error = Boom.badRequest(err.details[0].message, err);
    error.output.payload.validation = { source: source, keys: [] };
    if (err.details) {
        for (var i = 0, il = err.details.length; i < il; ++i) {
            error.output.payload.validation.keys.push(Hoek.escapeHtml(err.details[i].path));
        }
    }
};


internals.onPostAuth = function (request, reply) {

    return new internals.Request(this.options, request, reply);
};


exports.register = function (server, options, next) {

	var defaults = {
		defaultLang: 'en'
	};

	server.ext('onPostAuth', internals.onPostAuth, {
		bind: {
			options: Hoek.applyToDefaults(defaults, options)
		}
	});

    next();
};


exports.register.attributes = internals.attributes = {
    name: Package.name,
    version: Package.version
};
