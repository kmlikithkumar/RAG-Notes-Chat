jest.mock('mongoose', () => {
  function Schema(obj) { this.obj = obj; }
  Schema.prototype.pre = jest.fn();
  Schema.prototype.methods = {};
  return {
    connect: jest.fn().mockResolvedValue(true),
    Schema,
    model: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null)
    })
  };
});

jest.mock('../src/qdrant', () => ({
  initQdrant: jest.fn().mockResolvedValue(true),
  upsertVectors: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/store', () => ({
  findDocumentByHash: jest.fn().mockResolvedValue(null),
  addDocument: jest.fn().mockResolvedValue(true),
  addChunks: jest.fn().mockResolvedValue(true),
  getDocuments: jest.fn().mockResolvedValue([{ id: "doc1", name: "test.txt" }])
}));

jest.mock('../src/retriever', () => ({
  embedTexts: jest.fn().mockResolvedValue([[0.1, 0.2]])
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('fake-token'),
  verify: jest.fn().mockReturnValue({ userId: 'user-123' })
}));

const request = require('supertest');
const app = require('../src/server');

describe('API Integration', () => {
  it('GET /api/documents should return documents for auth user', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', 'Bearer fake-token');
      
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("test.txt");
  });
});
