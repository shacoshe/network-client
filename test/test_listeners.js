let assert = require('chai').assert;
global.XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let Helpers = require('./utils/helpers.js');




describe('Validate listeners are called', function() {
    let Network;

    let validatePostAll = function(method, url, data, options) {
        assert.equal(method, Network.HttpMethod.GET);
        assert.equal(url, "https://jsonplaceholder.typicode.com/posts");
        assert.deepEqual(data, {});
        assert.equal(options['store'], false);
        assert.equal(options['storeExpiration'], 0);
    }

    let validatePostGet = function(method, url, data, options) {
        assert.equal(method, Network.HttpMethod.GET);
        assert.equal(/^https:\/\/jsonplaceholder.typicode.com\/posts\/\d+$/.test(url), true);
        assert.deepEqual(data, {});
        assert.equal(options['store'], false);
        assert.equal(options['storeExpiration'], 0);
    }

    let validatePostGetStore = function(method, url, data, options) {
        assert.equal(method, Network.HttpMethod.GET);
        assert.equal(/^https:\/\/jsonplaceholder.typicode.com\/posts\/\d+$/.test(url), true);
        assert.deepEqual(data, {});
        assert.equal(options['store'], true);
        assert.equal(options['storeExpiration'], 0);
    }
    before(function(done) {
        let NetworkClient = require("../lib/NetworkClient.js");

        Network = new NetworkClient({baseURL: "https://jsonplaceholder.typicode.com/"});

        Network.registerModule("posts", require("./networkModules/networkPost.js"));
        Network.registerModule("comments", require("./networkModules/networkComment.js"));
        done();
    });

    it('should return -1 when the value is not present', async function() {
        //WAIT FOR OTHER TEST EVENTS TO CLEAR
        let waitEventsAreClearTime = 2000;
        this.timeout(waitEventsAreClearTime + 4000); // Don't fail test for timeout
        await Helpers.sleep(waitEventsAreClearTime);

        let networkStartCalled = 0, networkEndCalled = 0, networkErrorCalled = 0, networkStorageCalled = 0;

        assert.throws(function() {Network.addNetworkListener({});}, "");
        let networkListener = new Network.NetworkListener({
            networkStart: function(method, url, data, options) {
                validatePostAll(method, url, data, options);
                networkStartCalled++;
            },
            networkEnd: function(method, url, data, options) {
                validatePostAll(method, url, data, options);
                networkEndCalled++;
            },
            networkError: function(method, url, data, options) {
                validatePostAll(method, url, data, options);
                networkErrorCalled++;
            },
            networkStorage: function(method, url, data, options) {
                networkStorageCalled++;
            }
        });
        Network.addNetworkListener(networkListener);
        await Network.posts.all();

        assert.equal(networkStartCalled, 1);
        assert.equal(networkEndCalled, 1);
        assert.equal(networkErrorCalled, 0);
        assert.equal(networkStorageCalled, 0);
        Network.removeNetworkListener(networkListener);

        /**
         * Test callback networkStart only
         **/
        let networkListenerPartial = new Network.NetworkListener({
            networkStart: function(method, url, data, options) {
                validatePostGet(method, url, data, options);
                networkStartCalled++;
            }
        });
        Network.addNetworkListener(networkListenerPartial);
        await Network.posts.get(1)
        assert.equal(networkStartCalled, 2);
        assert.equal(networkEndCalled, 1);
        assert.equal(networkErrorCalled, 0);
        assert.equal(networkStorageCalled, 0);

        Network.removeNetworkListener(networkListenerPartial);
    });

    it('Listener for storage', async function() {
        /**
         * Test storage
         **/
        let networkStartCalled = 0, networkEndCalled = 0, networkErrorCalled = 0, networkStorageCalled = 0;

        //Creating "NetworkListener" only with "networkStorage" method.
        let networkListenerPartial2 = new Network.NetworkListener({
            networkStart: function(method, url, data, options) {
                validatePostGetStore(method, url, data, options);
                networkStartCalled++;
            },
            networkEnd: function(method, url, data, options) {
                validatePostGetStore(method, url, data, options);
                networkEndCalled++;
            },
            networkStorage: function(method, url, data, options) {
                validatePostGetStore(method, url, data, options);
                networkStorageCalled++;
            }
        });
        Network.addNetworkListener(networkListenerPartial2);
        await Network.posts.getPostStore(1); // First call will fetch from network
        await Network.posts.getPostStore(1);
        await Network.posts.getPostStore(1);
        await Network.posts.getPostStore(1);
        await Network.posts.getPostStore(2); // Different post id also cache
        await Network.posts.getPostStore(2);


        assert.equal(networkStartCalled, 2);
        assert.equal(networkEndCalled, 2);
        assert.equal(networkErrorCalled, 0);
        assert.equal(networkStorageCalled, 4);
    });
});