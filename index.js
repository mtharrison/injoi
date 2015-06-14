var Package = require('./package');
var Boom = require('boom');
var Hoek = require('hoek');


var internals = {};


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


internals.doReplacements = function (error, messages) {

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
                    var lang = 'zh';
                    err.message = internals.interpolate(rules[err.type][lang], err.context);
                }

            }
        }
    }

    return error;
};


internals.wrapError = function (err, source) {

    var error = Boom.badRequest(err.details[0].message, err);
    error.output.payload.validation = { source: source, keys: [] };
    if (err.details) {
        for (var i = 0, il = err.details.length; i < il; ++i) {
            error.output.payload.validation.keys.push(Hoek.escapeHtml(err.details[i].path));
        }
    }

    return error;
};


internals.onPostAuth = function (request, reply) {

    var route = request.route;
    var options = request.route.settings.plugins[internals.attributes.name];

    var origFailAction = route.settings.validate.failAction;

    route.settings.validate.failAction = function (request, reply, source, error) {

        var self = this;
        var failArgs = arguments;

        var next = function () {

            if (typeof origFailAction === 'function') {
                return origFailAction.apply(self, failArgs);
            }

            return reply(error);
        };

        var messages = options[source];

        if (!messages) {
            next();
        }

        error = internals.doReplacements(error, messages);
        error = internals.wrapError(error.data, source);

        next();
    };

    reply.continue();
};


exports.register = function (server, options, next) {

    server.ext('onPostAuth', internals.onPostAuth);
    next();
};


exports.register.attributes = internals.attributes = {
    name: Package.name,
    version: Package.version
};
