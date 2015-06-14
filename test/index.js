// Load modules

var Lab = require('lab');
var Code = require('code');
var Injoi = require('..');

// Test shortcuts

var lab = exports.lab = Lab.script();
var before = lab.before;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('Joi', function () {

    it('can interpolate strings', function (done) {

        var context = { lightEffect: 'silhouette', expression: 'scaramoosh' };
        var str = Injoi.interpolate('I see a {{lightEffect}} of a man, {{expression}}', context);
        expect(str).to.equal('I see a silhouette of a man, scaramoosh');
        done();
    });

    it('can interpolate strings with numbers', function (done) {

        var context = { lightEffect: 12, expression: 42 };
        var str = Injoi.interpolate('I see a {{lightEffect}} of a man, {{expression}}', context);
        expect(str).to.equal('I see a 12 of a man, 42');
        done();
    });

    it('doesn\'t blow up if context isn\'t strings or numbers', function (done) {

        var context = { lightEffect: true, expression: function () {} };
        var str = Injoi.interpolate('I see a {{lightEffect}} of a man, {{expression}}', context);
        expect(str).to.equal('I see a {{lightEffect}} of a man, {{expression}}');
        done();
    });

    it('doesn\'t blow up if context is missing', function (done) {

        var str = Injoi.interpolate('I see a {{lightEffect}} of a man, {{expression}}');
        expect(str).to.equal('I see a {{lightEffect}} of a man, {{expression}}');
        done();
    });

});
