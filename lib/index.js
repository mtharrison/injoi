var Accept = require('accept');
var Boom = require('boom');
var Hoek = require('hoek');
var Package = require('../package');


var internals = {};


// Wraps hapi's Request and replaces the route's failAction with it's own

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
            return self.origFailAction(request, reply, source, self.error);
        }

        return reply(self.error);
    };

    this.messages = this.routeOptions[source];

    if (!this.messages) {
        return next();
    }

    this.doReplacements();
    this.wrapError();

    next();
};


internals.interpolate = function (str, context) {

    return str.replace(
        /\{\{([^{}]*)\}\}/g,
        function (full, match) {

            var replace = context[match];
            return typeof replace === 'string' || typeof replace === 'number' ? replace : full;
        });
};


internals.Request.prototype.getBestLanguageMatch = function (request, rules) {

    if (request.headers['accept-language']) {
        var prefs = Accept.encodings(request.headers['accept-language']);

        for (var i = 0; i < prefs.length; ++i) {
            if (rules.hasOwnProperty(prefs[i])) {
                return prefs[i];
            }
        }
    }

    return this.pluginOptions.defaultLang;
};


internals.Request.prototype.doReplacements = function () {

    var request = this.request;
    var error = this.error;
    var messages = this.messages;
    var details = error.data.details;

    for (var i = 0; i < details.length; ++i) {
        var err = details[i];
        var path = err.path;
        if (messages.hasOwnProperty(path)) {
            var rules = messages[path];
            if (rules.hasOwnProperty(err.type)) {

                // If it's a string, it's just a simple replacement

                if (typeof rules[err.type] === 'string') {
                    err.message = internals.interpolate(rules[err.type], err.context);
                }

                // If it's an object with keys, the keys are language codes and
                // we need to lookup which one to choose based on accept header

                if (typeof rules[err.type] === 'object') {
                    var lang = this.getBestLanguageMatch(request, rules[err.type]);
                    err.message = internals.interpolate(rules[err.type][lang], err.context);
                }

                // If it's an array, they correspond to multiple validation rules
                // in the schema

                //@TODO: Implement this

            }
        }
    }

    // Update the Joi error message

    error.data.message = details[0].message;

};


internals.Request.prototype.wrapError = function () {

    var err = this.error.data;
    var source = this.source;
    var error = Boom.badRequest(err.details[0].message, err);
    error.output.payload.validation = { source: source, keys: [] };

    for (var i = 0, il = err.details.length; i < il; ++i) {
        error.output.payload.validation.keys.push(Hoek.escapeHtml(err.details[i].path));
    }

    this.error = error;
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
