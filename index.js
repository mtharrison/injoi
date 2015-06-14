var Boom = require('boom');
var Hoek = require('hoek');


var internals = {};


exports.register = function (server, options, next) {

	server.ext('onPostAuth', function (request, reply) {

		var route = request.route;
		var options = request.route.settings.plugins[internals.attributes.name];

		var originalFailAction = route.settings.validate.failAction;

		route.settings.validate.failAction = function (request, reply, source, error) {

			var messages = options[source];

			// If no custom messages have been supplied fallback to the custom fail action

			if (!messages) {
				if (typeof originalFailAction === 'function') {
					return originalFailAction.apply(this, arguments);
				}

				return reply(error);
			}

			var details = error.data.details;

			for (var i = 0; i < details.length; i++) {
				var err = details[i];
				var path = err.path;
				if (messages.hasOwnProperty(path)) {
					var rules = messages[path];
					if (rules.hasOwnProperty(err.type)) {
						var lang = 'zh';
						err.message = rules[err.type][lang];
					}
				}
			}

			var err = error.data;

			var error = Boom.badRequest(err.details[0].message, err);
			error.output.payload.validation = { source: source, keys: [] };
			if (err.details) {
			    for (var i = 0, il = err.details.length; i < il; ++i) {
			        error.output.payload.validation.keys.push(Hoek.escapeHtml(err.details[i].path));
			    }
			}

			if (typeof originalFailAction === 'function') {
				return originalFailAction.apply(this, arguments);
			}

			return reply(error);
		};

		reply.continue();
	});

	next();
};

var Package = require('./package');

exports.register.attributes = internals.attributes = {
	name: Package.name,
	version: Package.version
};