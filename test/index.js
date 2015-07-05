// Load modules

var Code = require('code');
var Hapi = require('hapi');
var Injoi = require('..');
var Joi = require('joi');
var Lab = require('lab');

// Test shortcuts

var lab = exports.lab = Lab.script();
var before = lab.before;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('Injoi', function () {

    it('registers without an error', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.register(Injoi, function (err) {

            expect(err).to.be.undefined();
            done();
        });
    });


    it('doesn\'t affect normal use of Joi when Injoi is loaded but not used', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            config: {
                validate: {
                    params: {
                        id: Joi.string().required().regex(/chicken/)
                    }
                }
            },
            method: 'GET',
            path: '/{id}',
            handler: function (request, reply) {

                reply('ok');
            }
        });

        var options = {
            method: 'GET',
            url: '/10'
        };

        server.inject(options, function (res) {

            expect(res.statusCode).to.equal(400);
            var payload = JSON.parse(res.payload);
            expect(payload.message).to.equal('child \"id\" fails because [\"id\" with value \"10\" fails to match the required pattern: /chicken/]');
            done();
        });

    });


    it('Doesn\'t affect normal failAction behavior when Injoi is loaded but not used', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.route({
            config: {
                validate: {
                    params: {
                        id: Joi.string().required().regex(/chicken/)
                    },
                    failAction: function (request, reply, source, error) {

                        reply('Some other message').code(400);
                    }
                }
            },
            method: 'GET',
            path: '/{id}',
            handler: function (request, reply) {

                reply('ok');
            }
        });

        var options = {
            method: 'GET',
            url: '/10'
        };

        server.inject(options, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.payload).to.equal('Some other message');
            done();
        });

    });


    it('ignores non-matching rules', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                cheese: {
                                    'string.regex.base': 'Noop, you did it wrong'
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('"id" with value "10" fails to match the required pattern: /chicken/');
                done();
            });
        });

    });


    it('ignores non-matching rules on same key', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.required': 'Noop, you did it wrong'
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('"id" with value "10" fails to match the required pattern: /chicken/');
                done();
            });
        });

    });


    it('can specify a single custom message to replace a built-in one', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': 'Noop, you did it wrong'
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('Noop, you did it wrong');
                done();
            });
        });

    });


    it('can interpolate variables in the error message', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': 'Noop, you did it wrong. {{key}} was {{value}}'
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('Noop, you did it wrong. id was 10');
                done();
            });
        });

    });


    it('won\'t blow when trying to interpolate variables that don\'t exist', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': 'Noop, you did it wrong. {{fish}} was {{eggs}}'
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('Noop, you did it wrong. {{fish}} was {{eggs}}');
                done();
            });
        });

    });


    it('continues as normal if errors are from source not specified by injoi settings', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        payload: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': 'Noop, you did it wrong'
                                }
                            }
                        }
                    }
                },
                method: 'POST',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'POST',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('child "id" fails because ["id" is required]');
                done();
            });
        });

    });

    it('passes the replaced error to failAction', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        },
                        failAction: function (request, reply, source, error) {

                            expect(error.message).to.equal('Noop, you did it wrong');
                            reply(error);
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': 'Noop, you did it wrong'
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                done();
            });
        });

    });


    it('picks the global default lang if no other hints', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': {
                                        en: 'Nope, sorry',
                                        zh: '不好'
                                    }
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('Nope, sorry');
                done();
            });
        });

    });


    it('can override the default lang when registering', function (done) {

        var server = new Hapi.Server();
        server.connection();

        var options = {
            register: Injoi,
            options: {
                defaultLang: 'zh'
            }
        };

        server.register(options, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': {
                                        en: 'Nope, sorry',
                                        zh: '不好'
                                    }
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10'
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('不好');
                done();
            });
        });

    });


    it('can pick correct language from accept-language header', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': {
                                        en: 'Nope, sorry',
                                        zh: '不好'
                                    }
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10',
                headers: {
                    'accept-language': 'fr, zh;q=0.9, en-gb;q=0.8, en;q=0.7'
                }
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('不好');
                done();
            });
        });

    });


    it('picks default if none of the langs in the accept-language match a rule', function (done) {

        var server = new Hapi.Server();
        server.connection();

        server.register(Injoi, function () {

            server.route({
                config: {
                    validate: {
                        params: {
                            id: Joi.string().required().regex(/chicken/)
                        }
                    },
                    plugins: {
                        injoi: {
                            params: {
                                id: {
                                    'string.regex.base': {
                                        en: 'Nope, sorry',
                                        zh: '不好'
                                    }
                                }
                            }
                        }
                    }
                },
                method: 'GET',
                path: '/{id}',
                handler: function (request, reply) {

                    reply('ok');
                }
            });

            var options = {
                method: 'GET',
                url: '/10',
                headers: {
                    'accept-language': 'fr, es;q=0.9'
                }
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(400);
                var payload = JSON.parse(res.payload);
                expect(payload.message).to.equal('Nope, sorry');
                done();
            });
        });

    });

});
