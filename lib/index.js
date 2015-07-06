// Load modules

var Accept = require('accept');
var Boom = require('boom');
var Hoek = require('hoek');
var Package = require('../package');


// Declare internals

var internals = {};


internals.Request = function (options, request, reply) {

    this.route = request.route;
    this.request = request;
    this.reply = reply;
    this.options = Hoek.applyToDefaults(options, this.route.settings.plugins[internals.attributes.name]);
};


internals.Request.prototype.attachFailAction = function () {

    this.origFailAction = this.route.settings.validate.failAction;
    this.route.settings.validate.failAction = this.failAction.bind(this);
};


internals.Request.prototype.respond = function (request, reply, source, error) {

    if (typeof this.origFailAction === 'function') {
        return this.origFailAction(request, reply, source, error);
    }

    return reply(error);
};


internals.Request.prototype.failAction = function (request, reply, source, error) {

    var messages = this.options[source];

    // fast route

    if (!messages) {
        return this.respond(request, reply, source, error);
    }

    error = this.doReplacements(error, messages);
    error = this.wrapError(error, source);

    return this.respond(request, reply, source, error);
};


internals.Request.prototype.getBestLanguageMatch = function (rules) {

    if (this.request.headers['accept-language']) {
        var prefs = Accept.encodings(this.request.headers['accept-language']);

        for (var i = 0; i < prefs.length; ++i) {
            if (rules[prefs[i]]) {
                return prefs[i];
            }
        }
    }

    return this.options.defaultLang;
};


internals.Request.prototype.doReplacements = function (error, messages) {

    var details = error.data.details;

    for (var i = 0; i < details.length; ++i) {
        var err = details[i];
        var path = err.path;
        if (messages[path]) {
            var rules = messages[path];
            if (rules[err.type]) {

                // If it's a string, it's just a simple replacement

                if (typeof rules[err.type] === 'string') {
                    err.message = internals.interpolate(rules[err.type], err.context);
                }

                // If it's an object with keys, the keys are language codes and
                // we need to lookup which one to choose based on accept header

                if (typeof rules[err.type] === 'object') {
                    var lang = this.getBestLanguageMatch(rules[err.type]);
                    if (rules[err.type][lang]) {
                        err.message = internals.interpolate(rules[err.type][lang], err.context);
                    }
                }

                // If it's an array, they correspond to multiple validation rules
                // in the schema

                //@TODO: Implement this

            }
        }
    }

    // Update the Joi error message

    error.data.message = details[0].message;

    return error;
};


internals.Request.prototype.wrapError = function (error, source) {

    var joiError = error.data;
    var newError = Boom.badRequest(joiError.details[0].message, joiError);

    newError.output.payload.validation = { source: source, keys: [] };

    for (var i = 0, il = joiError.details.length; i < il; ++i) {
        newError.output.payload.validation.keys.push(Hoek.escapeHtml(joiError.details[i].path));
    }

    return newError;
};


internals.interpolate = function (str, context) {

    return str.replace(
        /\{\{([^{}]*)\}\}/g,
        function (full, match) {

            var replace = context[match];
            return typeof replace === 'string' || typeof replace === 'number' ? replace : full;
        });
};


internals.onPostAuth = function (request, reply) {

    var req = new internals.Request(this.options, request, reply);
    req.attachFailAction();
    req.reply.continue();
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
