const expect = require('chai').expect;

const Agent = require('../../../../../app/agent');
const Fixture = require('../../../../../app/fixture');

describe('updatingResources', function() {

  var patchData;

  beforeEach(function() {
    patchData = {
      data: {
        type: 'books',
        id: '1',
        title: 'tiddlywinks'
      }
    };
    return Fixture.reset();
  });

  it('must require an ACCEPT header specifying the JSON API media type', function() {
    return Agent.request('PATCH', '/books/1')
      .accept('')
      .send(patchData)
      .promise()
      .then(function(res) {
        expect(res.status).to.equal(406);
      });
  });

  it('must respond to a successful request with an object', function() {
    return Agent.request('PATCH', '/books/1')
      .send(patchData)
      .promise()
      .then(function(res) {
        expect(res.status).to.be.within(200, 299);
        expect(res.body).to.be.an('object');
      });
  });

  it('must respond to an unsuccessful request with a JSON object', function() {
    patchData.data.id = 'asdf';
    return Agent.request('PATCH', '/books/1')
      .send(patchData)
      .promise()
      .then(function(res) {
        expect(res.status).to.be.within(400, 499);
        expect(res.body).to.be.an('object');
        expect(res.body.errors).to.be.an('array');
      });
  });

  it('must require a single resource object as primary data', function() {
    patchData.data = [patchData.data];
    return Agent.request('PATCH', '/books/1')
      .send(patchData)
      .promise()
      .then(function(res) {
        expect(res.status).to.equal(400);
      });
  });

  it('must require primary data to have a type member', function() {
    delete patchData.data.type;
    return Agent.request('PATCH', '/books/1')
      .send(patchData)
      .promise()
      .then(function(res) {
        expect(res.status).to.equal(400);
      });
  });

  it('must require a content-type header of application/vnd.api+json', function() {
    return Agent.request('PATCH', '/books/1')
      .type('json')
      .send(patchData)
      .promise()
      .then(function(res) {
        expect(res.status).to.equal(415);
      });
  });

  // TODO: Source/DB test: verify rollback on error
  it('must not allow partial updates');

  describe('updatingResourceAttributes', function() {
    it('should allow only some attributes to be included in the resource object', function() {
      return Agent.request('PATCH', '/books/1')
        .send(patchData)
        .promise()
        .then(function(res) {
          expect(res.status).to.be.within(200, 299);
          expect(res.body).to.be.a('object');
        });
    });

    it('should allow all attributes to be included in the resource object', function() {
      patchData.data = {
        id: '1',
        date_published: '2014-02-25',
        type: 'books',
        title: 'tiddlywinks',
        links: {
          stores: {linkage: [
            {type: 'stores', id: '1'},
            {type: 'stores', id: '2'}
          ]}
        }
      };
      var firstRead;
      return Agent.request('GET', '/books/1?include=stores').promise()
        .then(function(res) {
          firstRead = res.body;

          return Agent.request('PATCH', '/books/1')
            .send(patchData)
            .promise();
        })
        .then(function(res) {
          expect(res.status).to.be.within(200, 299);
          expect(res.body).to.be.a('object');
          return Agent.request('GET', '/books/1?include=stores').promise();
        })
        .then(function(res) {
          var secondRead = res.body;
          var payloadData = secondRead.data;
          var payloadLinks = payloadData.links;
          var updateLinks = patchData.data.links;

          expect(secondRead.included.length).to.equal(2);
          expect(payloadData.title).to.equal(patchData.data.title);
          expect(payloadData.date_published).to.equal(patchData.data.date_published);
          expect(payloadLinks.stores.linkage[0].id).to.equal(updateLinks.stores.linkage[0].id);
          expect(payloadLinks.stores.linkage[1].id).to.equal(updateLinks.stores.linkage[1].id);

        });
    });

    it('must interpret missing fields as their current values', function() {
      var firstRead;
      return Agent.request('GET', '/books/1?include=stores').promise()
        .then(function(res) {
          firstRead = res.body;

          return Agent.request('PATCH', '/books/1')
            .send(patchData)
            .promise();
        })
        .then(function(res) {
          expect(res.status).to.be.within(200, 299);
          expect(res.body).to.be.a('object');
          return Agent.request('GET', '/books/1?include=stores').promise();
        })
        .then(function(res) {
          var secondRead = res.body;

          expect(secondRead.included).to.deep.equal(firstRead.included);
          expect(secondRead.data.title).to.not.equal(firstRead.data.title);
          expect(secondRead.data.date_published).to.equal(firstRead.data.date_published);
          expect(secondRead.data.links).to.deep.equal(firstRead.data.links);
        });
    });
  });

  describe('updatingResourceRelationships', function() {
    it('must update to-One relationship with link object with linkage member', function() {
      patchData.data.links = {
        author: {linkage: {type: 'authors', id: '2'}},
        series: {linkage: {type: 'series', id: '2'}}
      };
      return Agent.request('PATCH', '/books/1')
        .send(patchData)
        .promise()
        .then(function(res) {
          expect(res.status).to.be.within(200, 299);
          expect(res.body).to.be.a('object');
          return Agent.request('GET', '/books/1?include=author,series').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          var updateLinks = patchData.data.links;
          expect(payloadLinks.author.linkage.id).to.equal(updateLinks.author.linkage.id);
          expect(payloadLinks.series.linkage.id).to.equal(updateLinks.series.linkage.id);
        });
    });

    it('must attempt to remove to-One relationship with null', function() {
      patchData.data.links = { series: {linkage: null }};
      return Agent.request('PATCH', '/books/1')
        .send(patchData)
        .promise()
        .then(function(res) {
          expect(res.status).to.be.within(200, 299);
          expect(res.body).to.be.a('object');
          return Agent.request('GET', '/books/1?include=series').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          expect(payloadLinks.series.linkage).to.equal('null');
        });
    });
  });

  // A server MAY reject an attempt to do a full replacement of a to-many relationship. In such a case, the server MUST reject the entire update, and return a 403 Forbidden response.
  // Note: Since full replacement may be a very dangerous operation, a server may choose to disallow it. A server may reject full replacement if it has not provided the client with the full list of associated objects, and does not want to allow deletion of records the client has not seen.
  describe('updatingResourceToManyRelationships', function() {
    it('must update homogeneous to-Many relationship with an object with type and id members under links', function() {
      patchData.data.links = {
        stores: { linkage: [
          { type: 'stores', id: '1' },
          { type: 'stores', id: '2' }
        ]}
      };

      return Agent.request('PATCH', '/books/1')
        .send(patchData)
        .promise()
        .then(function(res) {
          expect(res.status).to.be.within(200, 299);
          expect(res.body).to.be.a('object');
          return Agent.request('GET', '/books/1?include=stores').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          var updateLinks = patchData.data.links;
          expect(res.body.included.length).to.equal(2);
          expect(payloadLinks.stores.linkage[0].id).to.equal(updateLinks.stores.linkage[0].id);
          expect(payloadLinks.stores.linkage[1].id).to.equal(updateLinks.stores.linkage[1].id);
        });
    });

    // FIXME: https://gist.github.com/bobholt/1a5e9103be5fa85a53da#file-rc2-rc3-diff-L1753-L1760
    it('must attempt to remove to-Many relationships with the id member of the data object set to []', function() {
      patchData.data.links = {
        stores: {linkage: []},
      };

      return Agent.request('PATCH', '/books/1')
        .send(patchData)
        .promise()
        .then(function(res) {
          expect(res.status).to.be.within(200, 299);
          expect(res.body).to.be.a('object');
          return Agent.request('GET', '/books/1?include=stores').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          expect(res.body).to.not.have.property('included');
          expect(payloadLinks.stores.linkage).to.deep.equal([]);
        });
    });

    // Endpoints does not support heterogenous to-Many relationships
    // it('must require heterogeneous to-Many relationship links to be an object with a data member containing an array of objects with type and id members');
  });

  describe('responses', function() {

    describe('204NoContent', function() {
      it('must return 204 No Content on a successful update when attributes remain up-to-date', function() {
        return Agent.request('PATCH', '/stores/1')
          .send({data: {type: 'stores', id: '1', name: 'Updated Store'}})
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(204);
          });
      });
    });

    describe('200Ok', function() {

      // TODO: No idea why this suddenly started returning 204 instead of 200
      it.skip('must return 200 OK if it accepts the update but changes the resource in some way', function(done) {
        return Agent.request('PATCH', '/books/1')
          .send(patchData)
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(200);
            // must include a representation of the updated resource on a 200 OK response
            // expect(res.body.data.title).to.equal(patchData.data.title);
          });
      });
    });

    // API decision to not create the route - endpoints will always support updating
    // describe('403Forbidden', function() {
    //   it('must return 403 Forbidden on an unsupported request to update a resource or relationship');
    // });

    describe('404NotFound', function() {
      it('must return 404 Not Found when processing a request to modify a resource that does not exist', function() {
        patchData.data.id = '9999';
        return Agent.request('PATCH', '/books/9999')
          .send(patchData)
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(404);
          });
      });

      it('must return 404 Not Found when processing a request that references a to-One related resource that does not exist', function() {
        patchData.data.links = {
          author: {linkage: {type: 'authors', id: '9999'}}
        };
        return Agent.request('PATCH', '/books/1')
          .send(patchData)
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(404);
          });
      });

      it('must return 404 Not Found when processing a request that references a to-Many related resource that does not exist', function() {
        patchData.data.links = {
          stores: {linkage: [{type: 'stores', id: '9999'}]}
        };
        return Agent.request('PATCH', '/books/1')
          .send(patchData)
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(404);
          });
      });
    });

    describe('409Conflict', function() {
      it('should return 409 Conflict when processing an update that violates server-enforced constraints', function() {
        patchData.data.links = {
          author: {linkage: null}
        };
        return Agent.request('PATCH', '/books/1')
          .send(patchData)
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(409);
          });
      });

      it.skip('must return 409 Conflict when processing a request where the id does not match the endpoint', function() {
        return Agent.request('PATCH', '/books/2')
          .send(patchData)
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(409);
          });
      });

      // see request-handler/lib/verify_data_object
      it.skip('must return 409 Conflict when processing a request where the type does not match the endpoint', function() {
        return Agent.request('PATCH', '/authors/1')
          .send(patchData)
          .promise()
          .then(function(res) {
            expect(res.status).to.equal(409);
          });
      });
    });

    // Not testable as written. Each error handling branch should be
    // unit-tested for proper HTTP semantics.
    // describe('otherResponses', function() {
    //   it('should use other HTTP codes to represent errors');
    //   it('must interpret errors in accordance with HTTP semantics');
    //   it('should return error details');
    // });
  });
});

describe('updatingRelationships', function() {

  describe('updatingToOneRelationships', function() {
    // /books/1/author
    it('must update relationships with a PATCH request to a to-one relationship URL containing a data object with type and id members and return 204 No Content on success', function() {
      return Agent.request('PATCH', '/books/1/links/author')
        .send({ data: { type: 'authors', id: '2' }})
        .promise()
        .then(function(res) {
          expect(res.status).to.equal(204);
          return Agent.request('GET', '/books/1?include=author').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          expect(payloadLinks.author.linkage.id).to.equal('2');
        });
    });

    it('must remove relationships with a PATCH request to a to-one relationship URL containing a data object with a null value and return 204 No Content on success', function() {
      return Agent.request('PATCH', '/books/1/links/series')
        .send({ data: null })
        .promise()
        .then(function(res) {
          expect(res.status).to.equal(204);
          return Agent.request('GET', '/books/1?include=series').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          expect(payloadLinks.series.linkage).to.equal('null');
        });
    });

    it('must require a top-level data member containing either an object with type and id members or null');
    it('must return a 204 No Content on a successful PATCH request');
  });

  // TODO: Both of these tests seem to be broken for some reason now...
  describe('updatingToManyRelationships', function() {
    // /books/1/stores
    it('must update relationships with a PATCH request to a to-many relationship URL containing a data object with type and id members  and return 204 No Content on success', function() {
      return Agent.request('PATCH', '/books/1/links/stores')
        .send({ data: [
          { type: 'stores', id: '1' },
          { type: 'stores', id: '2' }
        ]})
        .promise()
        .then(function(res) {
          expect(res.status).to.equal(204);
          return Agent.request('GET', '/books/1?include=stores').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          expect(res.body).to.have.property('included');
          expect(payloadLinks.stores.linkage[0].id).to.equal('1');
          expect(payloadLinks.stores.linkage[1].id).to.equal('2');
        });
    });

    it('must remove relationships with a PATCH request to a to-many relationship URL containing a data object with a null value and return 204 No Content on success', function() {
      var newIds = [];
      return Agent.request('PATCH', '/books/1/links/stores')
        .send({ data: []})
        .promise()
        .then(function(res) {
          expect(res.status).to.equal(204);
          return Agent.request('GET', '/books/1?include=stores').promise();
        })
        .then(function(res) {
          var payloadLinks = res.body.data.links;
          expect(res.body).to.not.have.property('included');
          expect(payloadLinks.stores.linkage).to.deep.equal(newIds);
        });
    });
    it('must respond to POST requests to a to-many relationship URL');
    it('must respond to DELETE requests to a to-many relationship URL');
    it('must require a top-level data member containing either an object with type and id members');
    it('must completely replace every member of the relationship on a PATCH request if allowed');
    it('must return an appropriate error if some resources cannot be found or accessed');
    it('must return a 403 Forbidden if complete replacement is not allowed by the server');
    it('must append specified members of a POST request');
    it('must not add existing type and id combinations again');
    it('must return a 204 No Content if the resource is successfully added or already present');
    it('must either DELETE members of the relationship or return 403 Forbidden on a DELETE request');
    it('must return a 204 No Content if the resource is successfully deleted or is already missing');
  });

  describe('responses', function() {

    describe('204NoContent', function() {
      it('must return 204 No Content if the update is successful and the attributes remain up to date');
    });

    // API decision to not create the route - endpoints will always support updating
    // describe('403Forbidden', function() {
    //   it('must return 403 Forbidden in response to an unsupported request to update a relationship');
    // });

    // Not testable as written. Each error handling branch should be
    // unit-tested for proper HTTP semantics.
    // describe('otherResponses', function() {
    //   it('should use other HTTP codes to represent errors');
    //   it('must interpret errors in accordance with HTTP semantics');
    //   it('should return error details');
    // });
  });
});
