const expect = require('chai').expect;

const verifyDataObject = require('../../lib/verify_data_object');

describe('verifyDataObject', function() {

  it('should return an error if the data does not exist', function() {
    expect(verifyDataObject({body:{}})).to.be.instanceof(Error);
  });

  it('should return an error if the data is not an object', function() {
    expect(verifyDataObject({body:{data:''}})).to.be.instanceof(Error);
  });

  it('should return an error if the data type is not a string', function() {
    expect(verifyDataObject({body:{data:{type:1}}})).to.be.instanceof(Error);
  });

  it('should return an error if the data type does not match the endpoint type', function() {
    expect(verifyDataObject({body:{data:{type:'authors'}}}, {typeName:'books'})).to.be.instanceof(Error);
  });

  it('should return an error if the data id does not match the endpoint id', function() {
    expect(verifyDataObject({body:{data:{type:'books', id:2}}}, {typeName:'books', id:1})).to.be.instanceof(Error);
  });

  it('should have no return value if the data id and type matches the endpoint id and type', function() {
    expect(verifyDataObject({body:{data:{type:'authors', id:1}}}, {typeName:'authors', id:1})).to.be.undefined;
  });
});
