var Hapi = require('hapi');
var Joi = require('joi');

var server = new Hapi.Server();
server.connection({ port: 4000 });

// The validate config is unchanged when using injoi

var validateConfig = {
    params: {
        blame: Joi.string().regex(/moonlight|boogie|goodtimes/).required()
    },
    failAction: function (request, reply, source, error) {

        reply(error.data.details);
    }
};

// The additional injoi config specifies translations and custom messages for
// each message type

var injoiConfig = {
    params: {
        blame: {
            'string.regex.base': {
                en: 'Must be one of "moonlight", "boogie", "goodtimes"',
                zh: '必定為其中之一 "moonlight" 或 "boogie", "goodtimes"'
            },
            'any.required': 'Forget something, like a {{key}}?'
        }
    }
};

server.route({
    config: {
        validate: validateConfig,
        plugins: {
            injoi: injoiConfig
        }
    },
    method: 'GET',
    path: '/blame/{blame?}',
    handler: function (request, reply) {

        reply('Ok, it worked!');
    }
});

server.register([
    {
        register: require('../'),
        options: {
            defaultLang: 'zh'
        }
    }
], function (err) {

    if (err) {
        throw err;
    }

    server.start(function () {

        console.log('Started!');
    });
});
