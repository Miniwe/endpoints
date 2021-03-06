describe('extensions', function () {

  it('must require relevant extensions in the ext parameter of the content-type header');

  // The base JSON API specification MAY be extended to support
  // additional capabilities.

  it('must return supported extensions in the supported-ext parameter of the Content-Type header of every response');
  it('must render supported extensions as a comma-separated list');
  it('must surround extension names with quotation marks when the media type parameter contains more than one extension name.');

  // Clients MAY request a particular media type extension by
  // including its name in the ext media type parameter with the
  // Accept header.

  it('must not reject requests with supported media extensions in the Accept header');
  it('must reject requests with unsupported media extensions in the Accept header with a 406 status');
  it('must reject requests with supported media extensions in the Accept header, but unsupported COntent-Type with a 415 status');
  it('must not provide extended functionality incompatible with the base spec to clients that do not request it');

  describe('officialExtensions', function() {

    require('./bulk');
    require('./patch');

  });

  describe('customExtensions', function() {
    it('should be specified using the supported-ext media type parameter');
    it('should prefix its supported-ext media type with a unique identifier for the organization');
  });

  describe('profiles', function() {
    it('should be specified in the top-level meta object, keyped by profile');
  });
});
