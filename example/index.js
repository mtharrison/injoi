var Hapi = require('hapi');
var Joi = require('joi');

var server = new Hapi.Server();
server.connection({ port: 4000 });

server.route({
    config: {
        validate: {
            params: {
                perp: Joi.string().regex(/moonlight|boogie/).required()
            },
            failAction: function (request, reply, source, error) {

                reply(error.data.details);
            }
        },
        plugins: {
            injoi: {
                params: {
                    perp: {
                        'string.regex.base': {
                            en: 'Must be one of "moonlight" or "boogie"',
                            zh: '必定為其中之一 "moonlight" 或 "boogie"'
                        },
                        'any.required': 'Forget something, like a {{key}}?'
                    }
                }
            }
        }
    },
    method: 'GET',
    path: '/blame/{perp?}',
    handler: function (request, reply) {

        reply('Ok!');
    }
});

server.register([
    {
        register: require('../'),
        options: {
            defaultLang: 'en'
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
